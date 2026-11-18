import { MaterialControllerProvider } from "../src/context/MaterialProvider";
import { MemoryRouter } from "react-router-dom";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { Workspace } from "../src/components/shared/Workspace";
import { SessionProvider } from "../src/context/Session";
import { reloadPage } from "../src/utils/navigation";
vi.mock("../src/utils/navigation", () => ({ reloadPage: vi.fn() }));
import { setTokens } from "../src/api/client";

afterEach(() => {
  cleanup();
  setTokens();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("a signed-in user without an organization can create and select one", async () => {
  let selected = false;
  let created = false;
  const org = {
    id: 3,
    uuid: "org-id",
    name: "Kabul Exchange",
    slug: "kabul",
    is_active: true,
    owner_id: 1,
  };
  const fetcher = vi.fn(async (url: string, options: RequestInit) => {
    const path = url.split("?")[0];
    if (path.endsWith("/auth/me")) return Response.json({ id: 1 });
    if (path.endsWith("/auth/context"))
      return selected
        ? Response.json({
            organization_id: 3,
            membership_id: 1,
            user_id: 1,
            permissions: [],
          })
        : Response.json({ message: "Select an organization" }, { status: 403 });
    if (path.endsWith("/organizations/org-id/select")) {
      selected = true;
      return Response.json({ success: true, data: org });
    }
    if (path.endsWith("/organizations") && options.method === "POST") {
      expect(JSON.parse(String(options.body))).toEqual({
        name: org.name,
        slug: org.slug,
      });
      created = true;
      return Response.json({ success: true, data: org });
    }
    return Response.json({ success: true, data: created ? [org] : [] });
  });
  vi.stubGlobal("fetch", fetcher);
  setTokens({ access: "access", refresh: "refresh" });
  render(
    <SessionProvider>
      <MaterialControllerProvider><MemoryRouter>
        <Workspace />
      </MemoryRouter></MaterialControllerProvider>
    </SessionProvider>,
  );
  await screen.findByText("Create an organization to get started.");
  fireEvent.click(screen.getByRole("button", { name: "Create organization" }));
  fireEvent.change(screen.getByRole("textbox", { name: /^Name/ }), {
    target: { value: org.name },
  });
  fireEvent.change(
    screen.getByRole("textbox", { name: /^Organization slug/ }),
    {
      target: { value: org.slug },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "Create organization" }));
  await waitFor(() => expect(selected).toBe(true));
  await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
  expect(
    await screen.findByRole("button", { name: org.name }),
  ).toBeTruthy();
  expect(screen.queryByText("Create role")).toBeNull();
});

test("creating and deactivating a shop refreshes the Shops table", async () => {
  const org = { id: 1, uuid: "org-1", name: "Kabul Office", is_active: true, owner_id: 8 };
  const closedShop = { id: 1, uuid: "69213c25-7b4d-4fb4-b989-d17c8326e162", name: "Closed Shop", is_active: false };
  const newShopUuid = "a7723293-9c14-4527-8b3c-ab4c98b82dfc";
  const rows = [closedShop];
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    const path = url.split("?")[0];
    if (path.endsWith("/auth/me")) return Response.json({ id: 8 });
    if (path.endsWith("/auth/context")) return Response.json({
      organization_id: org.id, membership_id: 1, user_id: 8,
      permissions: ["settings:read", "settings:update", "attachment:manage"],
    });
    if (path.endsWith("/organizations")) return Response.json({ data: [org] });
    if (path.endsWith("/shops") && options.method === "POST") {
      const shop = { id: 2, uuid: newShopUuid, name: JSON.parse(String(options.body)).name, is_active: true };
      rows.push(shop);
      return Response.json({ data: shop }, { status: 201 });
    }
    if (path.endsWith("/files") && options.method === "POST") {
      return Response.json({ data: { uuid: "uploaded-attachment" } }, { status: 201 });
    }
    if (path.endsWith("/shops/" + newShopUuid) && options.method === "PATCH") {
      rows[1] = { ...rows[1], is_active: false };
      return Response.json({ data: rows[1] });
    }
    if (path.endsWith("/shops")) return Response.json({ data: rows });
    return Response.json({ data: {} });
  });
  vi.stubGlobal("fetch", fetchMock);
  setTokens({ access: "access", refresh: "refresh" });
  render(<SessionProvider><MaterialControllerProvider><MemoryRouter><Workspace /></MemoryRouter></MaterialControllerProvider></SessionProvider>);

  fireEvent.click(await screen.findByRole("button", { name: "Shops" }));
  const table = await screen.findByRole("grid", { name: "Shops" });
  expect(within(table).getByText("Closed Shop")).toBeTruthy();
  const user = userEvent.setup();
  const copy = within(table).getByRole("button", { name: "Copy UUID " + closedShop.uuid });
  expect(copy.textContent).toBe("d17c8326e162");
  await user.click(copy);
  expect(await navigator.clipboard.readText()).toBe(closedShop.uuid);
  expect(within(table).getByText("Inactive")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Create shop" }));
  const dialog = screen.getByRole("dialog", { name: "Create shop" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: /Name/ }), { target: { value: "New Kabul Shop" } });
  const submit = within(dialog).getByRole("button", { name: "Create shop" });
  fireEvent.click(submit);
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  expect(within(submit).getByRole("progressbar")).toBeTruthy();
  expect(fetchMock.mock.calls.some(([, options]) => options.method === "POST")).toBe(false);

  const refreshedTable = await screen.findByRole("grid", { name: "Shops" });
  expect(await within(refreshedTable).findByText("New Kabul Shop")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/shops$/),
    expect.objectContaining({ method: "POST", body: '{"name":"New Kabul Shop"}' }),
  );
  const newShopRow = within(refreshedTable).getByText("New Kabul Shop").closest('[role="row"]') as HTMLElement;
  expect(within(newShopRow).getByRole("button", { name: "Shop settings" })).toBeTruthy();
  fireEvent.click(within(newShopRow).getByRole("button", { name: "Upload private file" }));
  const uploadDialog = screen.getByRole("dialog", { name: "Upload private file" });
  const input = within(uploadDialog).getByLabelText("Upload private file");
  const uploadButton = within(uploadDialog).getByRole("button", { name: "Upload private file" });
  await user.upload(input, new File([], "empty.pdf", { type: "application/pdf" }));
  fireEvent.click(uploadButton);
  expect(within(uploadDialog).getByText("Choose a non-empty file up to 5 MiB.")).toBeTruthy();
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/files"))).toBe(false);

  const file = new File(["%PDF-1.7 receipt"], "receipt.pdf", { type: "application/pdf" });
  await user.upload(input, file);
  expect(within(uploadDialog).getByText("receipt.pdf")).toBeTruthy();
  fireEvent.click(within(uploadDialog).getByRole("button", { name: "Upload private file" }));
  await screen.findByText("Attachment UUID uploaded-attachment");
  const upload = fetchMock.mock.calls.find(([url]) => url.endsWith("/files"))?.[1].body as FormData;
  expect(upload.get("file")).toBe(file);
  expect(upload.get("shop_uuid")).toBe(newShopUuid);
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Upload private file" })).toBeNull());

  fireEvent.click(within(newShopRow).getByRole("button", { name: "Deactivate shop" }));
  const deactivateDialog = screen.getByRole("dialog", { name: "Deactivate shop" });
  expect(within(deactivateDialog).getByText("New Kabul Shop")).toBeTruthy();
  fireEvent.click(within(deactivateDialog).getByRole("button", { name: "Confirm" }));

  await waitFor(() => {
    const row = within(screen.getByRole("grid", { name: "Shops" })).getByText("New Kabul Shop").closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText("Inactive")).toBeTruthy();
  });
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/shops/" + newShopUuid),
    expect.objectContaining({ method: "PATCH", body: '{"is_active":false}' }),
  );
});

test("switching organizations discards a late shop list and old permissions", async () => {
  const organizations = [1, 2].map((id) => ({
    id,
    uuid: "org-" + id,
    name: "Office " + id,
    is_active: true,
    owner_id: 8,
  }));
  let selected = 1;
  let resolveOld!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = url.split("?")[0];
      if (path.endsWith("/auth/me")) return Response.json({ id: 8 });
      if (path.endsWith("/auth/context"))
        return Response.json({
          organization_id: selected,
          membership_id: selected,
          user_id: 8,
          permissions:
            selected === 1
              ? ["settings:read", "settings:update"]
              : ["settings:read"],
        });
      if (path.endsWith("/organizations"))
        return Response.json({ success: true, data: organizations });
      if (path.endsWith("/org-2/select")) {
        selected = 2;
        return Response.json({ success: true, data: organizations[1] });
      }
      if (path.endsWith("/shops") && selected === 1)
        return new Promise<Response>((r) => {
          resolveOld = r;
        });
      if (path.endsWith("/shops"))
        return Response.json({
          data: [
            {
              id: 22,
              uuid: "shop-2",
              name: "Office Two Shop",
              is_active: true,
            },
          ],
        });
      return Response.json({
        success: true,
        data: { name: "Office Two Shop" },
      });
    }),
  );
  setTokens({ access: "access", refresh: "refresh" });
  render(
    <SessionProvider>
      <MaterialControllerProvider><MemoryRouter>
        <Workspace />
      </MemoryRouter></MaterialControllerProvider>
    </SessionProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Shops" }));
  await screen.findByRole("button", { name: "Create shop" });
  expect(screen.queryByRole("group", { name: "Organization" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Organization" }));
  fireEvent.click(await screen.findByRole("button", { name: "Office 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Switch organization" }));
  await waitFor(() => expect(selected).toBe(2));
  await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
  fireEvent.click(await screen.findByRole("button", { name: "Shops" }));
  const shops = await screen.findByRole("grid", { name: "Shops" });
  expect(within(shops).getByText("Office Two Shop")).toBeTruthy();
  resolveOld(
    Response.json({
      data: [
        { id: 11, name: "Old private shop", uuid: "shop-1", is_active: true },
      ],
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Create shop" })).toBeNull(),
  );
  expect(screen.queryByText("Old private shop")).toBeNull();
});


test("delete confirmation supports cancellation, keeps errors visible, and refreshes cards after success", async () => {
  const org = { id: 3, uuid: "org-id", name: "Kabul Exchange", slug: "kabul", is_active: true, owner_id: 1 };
  let deleted = false;
  let fail = true;
  let deleteCalls = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    const path = url.split("?")[0];
    if (path.endsWith("/auth/me")) return Response.json({ id: 1 });
    if (path.endsWith("/auth/context")) return deleted
      ? Response.json({ message: "Select an organization" }, { status: 403 })
      : Response.json({ organization_id: 3, user_id: 1, membership_id: 1, permissions: ["organizations.delete"] });
    if (options.method === "DELETE") {
      deleteCalls++;
      if (fail) return Response.json({ message: "Organization could not be deleted" }, { status: 409 });
      deleted = true;
      return Response.json({ success: true });
    }
    return Response.json({ data: deleted ? [] : [org] });
  }));
  setTokens({ access: "access", refresh: "refresh" });
  render(<SessionProvider><MaterialControllerProvider><MemoryRouter><Workspace /></MemoryRouter></MaterialControllerProvider></SessionProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Delete organization" }));
  expect(within(screen.getByRole("dialog")).getByText(/Kabul Exchange/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(deleteCalls).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Delete organization" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete organization" }));
  expect(await screen.findByText("Organization could not be deleted")).toBeTruthy();
  expect(screen.getByRole("dialog")).toBeTruthy();
  fail = false;
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete organization" }));
  await screen.findByText("Create an organization to get started.");
  expect(screen.queryByRole("button", { name: "Open organization" })).toBeNull();
  expect(screen.queryByRole("radio")).toBeNull();
});

const ownerUserUuid = '00000000-0000-4000-8000-000000000008';
const memberUserUuid = '00000000-0000-4000-8000-000000000012';

function mountManagement(mutate?: (path: string, options: RequestInit) => Response | Promise<Response>) {
  const organizations = [
    { id: 1, uuid: 'org-1', name: 'Kabul Exchange', slug: 'kabul', owner_id: 8, is_active: true },
    { id: 2, uuid: 'org-2', name: 'Herat Office', slug: 'herat', owner_id: 9, is_active: true },
    { id: 3, uuid: 'org-3', name: 'Closed Office', slug: 'closed', owner_id: 8, is_active: false },
  ];
  const mutations = vi.fn(mutate || (() => Response.json({ success: true, data: {} })));
  vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
    const path = url.split('?')[0];
    if (options.method && options.method !== 'GET') return mutations(path, options);
    if (path.endsWith('/auth/me')) return Response.json({ id: 8 });
    if (path.endsWith('/auth/context')) return Response.json({ user_id: 8, organization_id: 1, membership_id: 8,
      permissions: ['roles:read', 'roles:create', 'roles:update', 'roles:delete', 'organizations.members.read', 'organizations.members.manage'] });
    if (path.endsWith('/organizations')) return Response.json({ success: true, data: organizations });
    if (path.endsWith('/roles')) return Response.json({ data: Array.from({ length: 12 }, (_, index) => ({ id: index, uuid: 'role-' + index, name: index === 0 ? 'Owner' : 'Role ' + index, description: 'Description ' + index, is_system: index === 0 })) });
    if (path.endsWith('/members')) return Response.json({ data: [{ id: 1, uuid: 'member-1', user_id: 8, user_uuid: ownerUserUuid, is_active: true }, { id: 2, uuid: 'member-2', user_id: 12, user_uuid: memberUserUuid, is_active: false }] });
    return Response.json({ success: true, data: [] });
  }));
  setTokens({ access: 'access', refresh: 'refresh' });
  render(<SessionProvider><MaterialControllerProvider><MemoryRouter><Workspace /></MemoryRouter></MaterialControllerProvider></SessionProvider>);
  return mutations;
}

test('card switching requires confirmation, cancellation makes no request, and failure keeps the current organization', async () => {
  const mutations = mountManagement(() => Response.json({ message: 'Switch unavailable' }, { status: 409 }));
  const current = await screen.findByRole('button', { name: 'Kabul Exchange' });
  expect(current.getAttribute('aria-current')).toBe('true');
  expect((screen.getByRole('button', { name: 'Closed Office' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('button', { name: 'Open organization' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Herat Office' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(mutations).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(mutations).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Herat Office' }));
  fireEvent.click(screen.getByRole('button', { name: 'Switch organization' }));
  expect(await screen.findByText('Switch unavailable')).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(current.getAttribute('aria-current')).toBe('true');
  expect(reloadPage).not.toHaveBeenCalled();
});

test('role and member tables replace selectors, support search and paging, and protect owner and system rows', async () => {
  mountManagement();
  fireEvent.click(await screen.findByRole('button', { name: 'Roles' }));
  const table = await screen.findByRole('grid', { name: 'Roles' });
  expect(screen.queryByRole('group', { name: 'Organization' })).toBeNull();
  const owner = within(table).getByText('Owner').closest('[role="row"]')!;
  expect(within(owner).getAllByRole('button')).toEqual([within(owner).getByRole('button', { name: 'Copy UUID role-0' })]);
  expect(within(table).getAllByRole('row')).toHaveLength(11);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(within(table).getByText('Role 11')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Description 3' } });
  expect(await within(table).findByText('Role 3')).toBeTruthy();
  expect(within(table).queryByText('Role 11')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Members' }));
  const members = await screen.findByRole('grid', { name: 'Members' });
  expect(screen.queryByRole('group', { name: 'Organization' })).toBeNull();
  expect(within(members).getByText('Inactive')).toBeTruthy();
  const user = userEvent.setup();
  const ownerUuidButton = within(members).getByRole('button', { name: 'Copy UUID ' + ownerUserUuid });
  expect(ownerUuidButton.textContent).toBe('000000000008');
  const ownerRow = ownerUuidButton.closest('[role="row"]')!;
  expect(within(ownerRow).getAllByRole('button')).toEqual([ownerUuidButton]);
  await user.click(ownerUuidButton);
  expect(await screen.findByText('UUID copied')).toBeTruthy();
  expect(await navigator.clipboard.readText()).toBe(ownerUserUuid);
  expect(within(members).getByRole('button', { name: 'Activate member' })).toBeTruthy();
  const userColumn = within(members).getByRole('columnheader', { name: /User UUID/ });
  fireEvent.click(userColumn);
  await waitFor(() => expect(userColumn.getAttribute('aria-sort')).toBe('ascending'));
  fireEvent.click(userColumn);
  await waitFor(() => expect(userColumn.getAttribute('aria-sort')).toBe('descending'));
  const firstMember = within(members).getAllByRole('row')[1];
  expect(firstMember.querySelector('[data-field="user_uuid"]')?.textContent).toBe('000000000012');
});

test('custom field validation blocks bad organization slugs, UUIDs, role names, and user UUIDs', async () => {
  const mutations = mountManagement();
  await screen.findByRole('button', { name: 'Kabul Exchange' });
  fireEvent.click(screen.getByRole('button', { name: 'Create organization' }));
  const submit = () => fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
  submit();
  expect(screen.getAllByText('This field is required.')).toHaveLength(2);
  const name = screen.getByRole('textbox', { name: /^Name/ });
  expect(document.activeElement).toBe(name);
  fireEvent.change(name, { target: { value: 'New Office' } });
  fireEvent.change(screen.getByRole('textbox', { name: /^Organization slug/ }), { target: { value: 'Bad Slug!' } });
  submit();
  expect(screen.getByText('Use lowercase letters, numbers, and single hyphens between words.')).toBeTruthy();
  expect(mutations).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Join organization' }));
  fireEvent.change(screen.getByRole('textbox', { name: /^Organization UUID/ }), { target: { value: 'not-a-uuid' } });
  submit();
  expect(screen.getByText('Enter a valid UUID, including all four hyphens.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Roles' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Create role' }));
  fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'x'.repeat(51) } });
  submit();
  expect(screen.getByText('Use no more than 50 characters.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Members' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Add member' }));
  fireEvent.change(screen.getByRole('textbox', { name: /^User UUID/ }), { target: { value: '1.5' } });
  submit();
  expect(screen.getByText('Enter a valid UUID, including all four hyphens.')).toBeTruthy();
  expect(mutations).not.toHaveBeenCalled();

  fireEvent.change(screen.getByRole('textbox', { name: /^User UUID/ }), { target: { value: memberUserUuid } });
  submit();
  await waitFor(() => expect(mutations).toHaveBeenCalledWith(
    expect.stringMatching(/\/members$/),
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ user_uuid: memberUserUuid }) }),
  ));
});

test('server validation appears below the matching field and keeps entered values', async () => {
  const mutations = mountManagement(() => Response.json({ message: 'Validation failed', errors: [{ loc: ['body', 'name'], msg: 'This role already exists.' }] }, { status: 422 }));
  fireEvent.click(await screen.findByRole('button', { name: 'Roles' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Create role' }));
  fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Cashier' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), { target: { value: 'Records payments' } });
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
  expect(await screen.findByText('This role already exists.')).toBeTruthy();
  expect(screen.getByRole('textbox', { name: /^Name/ }).getAttribute('aria-invalid')).toBe('true');
  expect((screen.getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement).value).toBe('Records payments');
  expect(JSON.parse(String(mutations.mock.calls[0][1].body))).toEqual({ name: 'Cashier', description: 'Records payments' });
});
