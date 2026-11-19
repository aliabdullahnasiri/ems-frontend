import { Link } from 'react-router-dom';
import { useId, useState, type ReactNode } from 'react';
import { AddRounded, ArrowBackRounded, BusinessOutlined, CheckCircleOutlineRounded, ContentCopyOutlined, DeleteOutlineRounded, DownloadOutlined, EditOutlined, GroupsOutlined, LoginRounded, SettingsOutlined, ShieldOutlined, StorefrontOutlined, DoNotDisturbOnOutlined, SwapHorizRounded, UploadFileOutlined, PersonRemoveOutlined, PersonOffOutlined, PersonAddAltOutlined, ManageAccountsOutlined } from '@mui/icons-material';
import { Alert, Avatar, Box, Button, ButtonBase, Checkbox, Chip, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControlLabel, IconButton, ListItemButton, ListItemIcon, ListItemText, MenuItem, Paper, Portal, Skeleton, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useResource } from './useResource';
import { WorkspaceTable } from './WorkspaceTable';
import { reloadPage } from '../../utils/navigation';
import { alpha } from '@mui/material/styles';
import { ApiError, invalidateWorkspace, request, sessionVersion } from '../../api/client';
import type { MembershipData, OrganizationData, PermissionData, RoleData, SettingsData } from '../../api/generated';
import { useSession } from '../../context/Session';
import { useMaterialController } from '../../context/useMaterialController';
import { setOpenConfigurator } from '../../context/materialActions';
import Configurator from '../../widgets/layout/Configurator';
import { AccountMenu } from '../auth/AccountMenu';
import { useAuthText } from '../auth/text';
import { useLocale } from '../../i18n/locale';
import { OrganizationCardsSkeleton } from './PageSkeleton';
import { ActionDialog, Edit, WorkspaceField, WorkspaceFileField } from './WorkspaceForms';
type Shop = { id: number; uuid: string; name: string; is_active: boolean };
type Option = { uuid: string; name: string };
function write(path: string, method: string, data?: unknown) {
  return request(path, {
    method,
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
const field = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
type Section = 'organization' | 'shopsNav' | 'membersLabel' | 'rolesLabel';
const sections = [
  { id: 'organization', icon: BusinessOutlined },
  { id: 'shopsNav', icon: StorefrontOutlined },
  { id: 'membersLabel', icon: GroupsOutlined },
  { id: 'rolesLabel', icon: ShieldOutlined },
] as const;
const descriptions = { organization: 'organizationSectionHelp', shopsNav: 'shopsSectionHelp', membersLabel: 'membersSectionHelp', rolesLabel: 'rolesSectionHelp' } as const;
function SectionHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { lg: 'flex-start' } }}>
    <Box sx={{ minWidth: 0 }}><Typography component="h2" variant="h5">{title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>{description}</Typography></Box>
    {actions && <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center', maxWidth: '100%', justifyContent: 'flex-end', alignSelf: { xs: 'flex-end', lg: 'flex-start' }, flexShrink: 0 }}>{actions}</Stack>}
  </Stack>;
}
function StatusBadge({ active }: { active: boolean }) {
  const t = useAuthText();
  return <Chip size="small" color={active ? 'success' : 'error'} label={t(active ? 'activeLabel' : 'inactiveLabel')} />;
}
function OrganizationCards({ rows, currentId, userId, disabled, select }: { rows: OrganizationData[]; currentId?: number; userId?: number; disabled: boolean; select: (org: OrganizationData) => void }) {
  const t = useAuthText();
  return <Box role="group" aria-label={t('organization')} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
    {rows.map(org => <ButtonBase key={org.uuid} aria-label={org.name} aria-current={org.id === currentId ? 'true' : undefined}
      disabled={disabled || !org.is_active} onClick={() => { if (org.id !== currentId) select(org); }}
      sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', textAlign: 'start', p: 2, minWidth: 0, border: 1, borderRadius: '12px', borderColor: org.id === currentId ? 'primary.main' : 'divider', bgcolor: theme => org.id === currentId ? alpha(theme.palette.primary.main, .04) : 'background.paper', '&:hover': { borderColor: 'primary.main' }, '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 3 } }}>
      <BusinessOutlined sx={{ mt: .5, color: org.id === currentId ? 'primary.main' : 'text.secondary' }} />
      <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
        <Box component="span" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}><Typography component="span" variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>{org.name}</Typography>
          {org.id === currentId && <Chip component="span" size="small" variant="outlined" color="primary" icon={<CheckCircleOutlineRounded />} label={t('currentOrganization')} />}</Box>
        <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere', mt: .5 }}>{org.slug}</Typography>
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1.5 }}>
          <Typography component="span" variant="caption" color="text.secondary">{t(org.owner_id === userId ? 'ownerLabel' : 'memberLabel')}</Typography><StatusBadge active={org.is_active} />
        </Box>
      </Box>
    </ButtonBase>)}
  </Box>;
}

export function Workspace() {
  const { context, contextError, loading: contextLoading } = useSession();
  const t = useAuthText();
  const { t: ui } = useLocale();
  const [, dispatch] = useMaterialController();
  const [rev, refresh] = useState(0);
  const orgs = useResource<OrganizationData[]>('/organizations', rev, true);
  const current = orgs?.data?.find(org => org.id === context?.organization_id);
  const [section, setSection] = useState<Section>('organization');
  const available = sections.filter(({ id }) => {
    if (id === 'organization') return true;
    const prefix = { shopsNav: 'settings:', membersLabel: 'organizations.members.', rolesLabel: 'roles:' }[id];
    return current && context?.permissions.some(permission => permission.startsWith(prefix));
  });
  const activeSection = available.some(item => item.id === section) ? section : 'organization';
  const [pending, setPending] = useState<OrganizationData>();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const switchId = useId();
  async function select(id: string) {
    if (switching) return;
    setSwitching(true); setSwitchError('');
    const epoch = sessionVersion();
    try {
      await write('/auth/organizations/' + encodeURIComponent(id) + '/select', 'POST');
      setPending(undefined);
      if (sessionVersion() === epoch) {
        invalidateWorkspace();
        reloadPage();
      }
    } catch (failure) {
      setSwitchError(failure instanceof Error ? failure.message : t('retry'));
      throw failure;
    } finally { setSwitching(false); }
  }
  const organizationActions = <>
    <ActionDialog title={t('createOrganization')} icon={<AddRounded />} primary>
      <Edit title={t('createOrganization')} done={() => refresh(n => n + 1)} save={async data => {
        const org = await request<OrganizationData>('/organizations', { method: 'POST', body: JSON.stringify({ name: field(data, 'name'), slug: field(data, 'slug') }) });
        try { await select(org.uuid); } catch { setPending(org); }
      }}><WorkspaceField name="name" required maxLength={150} label={t('nameLabel')} /><WorkspaceField name="slug" required maxLength={150} label={t('slugLabel')} helperText={t('slugHelp')} /></Edit>
    </ActionDialog>
    <ActionDialog title={t('joinOrganization')} icon={<LoginRounded />}>
      <Edit title={t('requestAccess')} save={data => write('/organizations/' + encodeURIComponent(field(data, 'uuid')) + '/join-requests', 'POST')}>
        <WorkspaceField name="uuid" required label={t('organizationId')} helperText={t('joinOrganizationHelp')} />
      </Edit>
    </ActionDialog>
  </>;
  return <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
      <Button component={Link} to="/dashboard" color="inherit" startIcon={<ArrowBackRounded sx={{ '[dir=rtl] &': { transform: 'rotate(180deg)' } }} />}>{t('back')}</Button>
      <Stack direction="row" spacing={1}><Tooltip title={ui('settings')}><IconButton aria-label={ui('settings')} onClick={() => setOpenConfigurator(dispatch, true)} sx={{ p: .5, minWidth: 44, minHeight: 44 }}><Avatar sx={{ width: 36, height: 36, bgcolor: theme => alpha(theme.palette.primary.main, .12), color: 'primary.main' }}><SettingsOutlined fontSize="small" /></Avatar></IconButton></Tooltip><AccountMenu /></Stack>
    </Stack>
    <Typography component="h1" variant="h4" sx={{ mt: 2, mb: 1 }}>{t('manageOrganizations')}</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>{t('organizationsHelp')}</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
      <Paper component="nav" aria-label={t('manageOrganizations')} sx={{ p: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: '1fr' }, gap: .5 }}>
          {available.map(({ id, icon: Icon }) => <ListItemButton key={id} selected={activeSection === id} aria-current={activeSection === id ? 'page' : undefined} onClick={() => setSection(id)} sx={{ borderRadius: '10px', minWidth: 0 }}><ListItemIcon sx={{ minWidth: 36 }}><Icon fontSize="small" /></ListItemIcon><ListItemText primary={t(id)} /></ListItemButton>)}
        </Box>
      </Paper>
      <Paper component="main" sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}><Stack spacing={3}>
        {orgs?.error && <Alert severity="error" action={<Button color="inherit" onClick={() => refresh(n => n + 1)}>{t('retry')}</Button>}>{orgs.error}</Alert>}
        {contextError instanceof ApiError && contextError.status !== 403 && <Alert severity="error">{contextError.message}</Alert>}
        {activeSection === 'organization' && <>
          <SectionHeader title={t('organization')} description={t(descriptions.organization)} actions={organizationActions} />
          {!orgs && <OrganizationCardsSkeleton />}
          {orgs?.data && (orgs.data.length ? <OrganizationCards rows={orgs.data} currentId={context?.organization_id} userId={context?.user_id} disabled={switching || contextLoading} select={org => { setSwitchError(''); setPending(org); }} /> : <Typography color="text.secondary">{t('emptyOrganizations')}</Typography>)}
        </>}
        {current && context && <OrganizationAdmin key={current.uuid} org={current} section={activeSection} grants={context.permissions} owner={current.owner_id === context.user_id} reload={() => refresh(n => n + 1)} />}
      </Stack></Paper>
    </Box>
    <Dialog open={!!pending} onClose={() => { if (!switching) setPending(undefined); }} fullWidth maxWidth="xs" aria-labelledby={switchId} aria-describedby={switchId + '-description'}>
      <DialogTitle id={switchId}>{t('switchOrganizationTitle')}</DialogTitle>
      <DialogContent><DialogContentText id={switchId + '-description'}>{t('switchOrganizationHelp').replace('{name}', pending?.name || '')}</DialogContentText>{switchError && <Alert severity="error" sx={{ mt: 2 }}>{switchError}</Alert>}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button autoFocus disabled={switching} onClick={() => setPending(undefined)}>{t('cancel')}</Button><Button variant="contained" startIcon={<SwapHorizRounded />} loading={switching} onClick={() => { if (pending) void select(pending.uuid).catch(() => {}); }}>{t('switchOrganizationTitle')}</Button></DialogActions>
    </Dialog>
    <Configurator />
  </Container>;
}

function DisplayDate({ value }: { value?: string }) {
  const { locale } = useLocale();
  return <>{value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : '—'}</>;
}
function OrganizationDetails({ org, owner, actions }: { org: OrganizationData; owner: boolean; actions: ReactNode }) {
  const t = useAuthText();
  const details: [string, ReactNode][] = [[t('nameLabel'), org.name], [t('slugLabel'), org.slug], [t('yourAccess'), t(owner ? 'ownerLabel' : 'memberLabel')], [t('statusLabel'), <StatusBadge active={org.is_active} />], [t('createdLabel'), <DisplayDate value={org.created_at} />], [t('organizationId'), org.uuid]];
  return <Stack spacing={2.5}><SectionHeader title={t('organizationDetails')} description={t('organizationDetailsHelp')} actions={actions} />
    <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
      {details.map(([label, value]) => <Box key={label}><Typography component="dt" variant="body2" color="text.secondary">{label}</Typography><Typography component="dd" variant="body2" sx={{ m: 0, mt: .75, fontWeight: 500, overflowWrap: 'anywhere', userSelect: 'text' }}>{value}</Typography></Box>)}
    </Box>
  </Stack>;
}

function OrganizationAdmin({ section, org, grants, owner, reload }: { section: Section; org: OrganizationData; grants: string[]; owner: boolean; reload: () => void }) {
  const t = useAuthText();
  const can = (grant: string) => grants.includes(grant);
  const base = '/organizations/' + org.uuid;
  const [rev, setRev] = useState(0);
  const refresh = () => setRev(n => n + 1);
  const roles = useResource<RoleData[]>(can('roles:read') ? base + '/roles' : '', rev, true);
  const members = useResource<MembershipData[]>(can('organizations.members.read') ? base + '/members' : '', rev, true);
  const defs = useResource<PermissionData[]>(can('permissions:read') ? base + '/permissions' : '', rev);
  const shops = useResource<Shop[]>(can('settings:read') ? '/shops' : '', rev, true);
  const [copyNotice, setCopyNotice] = useState<{ message: string }>();
  async function copyUuid(uuid: string) {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopyNotice({ message: t('uuidCopied') });
    } catch {
      setCopyNotice({ message: t('uuidCopyFailed') });
    }
  }
  function renderUuid(uuid: string, tabIndex: number) {
    return <Tooltip title={t('copyUuid')}>
      <Button type="button" size="small" color="inherit" tabIndex={tabIndex} dir="ltr"
        aria-label={t('copyUuid') + ' ' + uuid}
        onClick={() => void copyUuid(uuid)}
        sx={{ minHeight: 40, gap: 0.75 }}>
        {uuid.split('-').at(-1)}
        <ContentCopyOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
      </Button>
    </Tooltip>;
  }
  const shopColumns: GridColDef<Shop>[] = [
    { field: 'uuid', headerName: t('shopUuid'), minWidth: 175, flex: 1,
      renderCell: ({ row, tabIndex }) => renderUuid(row.uuid, tabIndex) },
    { field: 'name', headerName: t('nameLabel'), minWidth: 180, flex: 2,
      renderCell: ({ value }) => <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{value}</Typography> },
    { field: 'status', headerName: t('statusLabel'), minWidth: 110, flex: 1,
      valueGetter: (_, row) => t(row.is_active ? 'activeLabel' : 'inactiveLabel'),
      renderCell: ({ row }) => <StatusBadge active={row.is_active} /> },
    { field: 'actions', headerName: t('actionsLabel'), sortable: false, filterable: false, disableExport: true,
      minWidth: 190, flex: 1.3, align: 'right', headerAlign: 'right',
      renderCell: ({ row, tabIndex }) => row.is_active && <ShopTools shop={row} grants={grants} refresh={refresh} tabIndex={tabIndex} /> },
  ];
  const createShop = can('settings:update') && <ActionDialog title={t('createShop')} icon={<AddRounded />} primary>
    <Edit title={t('createShop')} done={refresh} save={data => write('/shops', 'POST', { name: field(data, 'name') })}>
      <WorkspaceField required name="name" maxLength={150} label={t('nameLabel')} />
    </Edit>
  </ActionDialog>;
  const memberColumns: GridColDef<MembershipData>[] = [
    { field: 'user_uuid', headerName: t('userUuid'), minWidth: 175, flex: 1,
      renderCell: ({ row, tabIndex }) => renderUuid(row.user_uuid, tabIndex) },
    { field: 'access', headerName: t('accessLabel'), minWidth: 110, flex: 1, valueGetter: (_, row) => t(row.user_id === org.owner_id ? 'ownerLabel' : 'memberLabel') },
    { field: 'status', headerName: t('statusLabel'), minWidth: 110, flex: 1, valueGetter: (_, row) => t(row.is_active ? 'activeLabel' : 'inactiveLabel'), renderCell: ({ row }) => <StatusBadge active={row.is_active} /> },
    { field: 'created_at', headerName: t('joinedLabel'), type: 'date', minWidth: 140, flex: 1, valueGetter: value => value && !Number.isNaN(Date.parse(value)) ? new Date(value) : null, renderCell: ({ row }) => <DisplayDate value={row.created_at} /> },
    { field: 'actions', headerName: t('actionsLabel'), sortable: false, filterable: false, disableExport: true, minWidth: 190, flex: 1.3, align: 'right', headerAlign: 'right', renderCell: ({ row }) => <MemberActions member={row} org={org} owner={owner} grants={grants} roles={roles?.data} refresh={refresh} /> },
  ];
  const roleColumns: GridColDef<RoleData>[] = [
    { field: 'uuid', headerName: t('roleUuid'), minWidth: 175, flex: 1,
      renderCell: ({ row, tabIndex }) => renderUuid(row.uuid, tabIndex) },
    { field: 'name', headerName: t('nameLabel'), minWidth: 130, flex: 1, renderCell: ({ value }) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography> },
    { field: 'description', headerName: t('descriptionLabel'), minWidth: 200, flex: 2, renderCell: ({ value }) => value || '—' },
    { field: 'type', headerName: t('roleType'), minWidth: 100, flex: .7, valueGetter: (_, row) => t(row.is_system ? 'systemType' : 'customType'), renderCell: ({ value }) => <Chip size="small" variant="outlined" label={value} /> },
    { field: 'actions', headerName: t('actionsLabel'), sortable: false, filterable: false, disableExport: true, minWidth: 190, flex: 1, align: 'right', headerAlign: 'right', renderCell: ({ row }) => <RoleActions role={row} base={base} grants={grants} defs={defs?.data} refresh={refresh} /> },
  ];
  const organizationEdit = can('organizations.update') && <ActionDialog title={t('editOrganization')} icon={<EditOutlined />}><Edit title={t('saveChanges')} done={reload} save={data => write(base, 'PATCH', { name: field(data, 'name'), slug: field(data, 'slug') })}><WorkspaceField name="name" required maxLength={150} label={t('nameLabel')} defaultValue={org.name} /><WorkspaceField name="slug" required maxLength={150} label={t('slugLabel')} helperText={t('slugHelp')} defaultValue={org.slug} /></Edit></ActionDialog>;
  return <>
    <Snackbar key={copyNotice?.message} open={!!copyNotice} autoHideDuration={3000}
      message={copyNotice?.message} onClose={(_, reason) => { if (reason !== 'clickaway') setCopyNotice(undefined); }} />
    {[roles, members, defs, shops].map((resource, index) => resource?.error && <Alert key={index} severity="error" action={<Button color="inherit" onClick={refresh}>{t('retry')}</Button>}>{resource.error}</Alert>)}
    {section === 'organization' && <><Divider /><OrganizationDetails org={org} owner={owner} actions={organizationEdit} />
      {can('organizations.delete') && owner && <ActionDialog title={t('deleteOrganization')} icon={<DeleteOutlineRounded />} destructive fullWidth><Edit title={t('deleteOrganization')} save={async () => { await write(base, 'DELETE'); invalidateWorkspace(); reload(); }}><Typography>{t('deleteOrganizationHelp').replace('{name}', org.name)}</Typography></Edit></ActionDialog>}
    </>}
    {section === 'shopsNav' && <WorkspaceTable key="shops" label={t('shopsNav')} columns={shopColumns} rows={shops?.data}
      fallback={can('settings:read') && !shops && <Skeleton variant="rounded" height={180} />}
      renderHeader={search => <SectionHeader title={t('shopsNav')} description={t(descriptions.shopsNav)} actions={<>{search}{createShop}</>} />} />}
    {section === 'membersLabel' && <WorkspaceTable key="members" label={t('membersLabel')} columns={memberColumns} rows={members?.data}
      fallback={can('organizations.members.read') && !members && <Skeleton variant="rounded" height={180} />}
      renderHeader={search => <SectionHeader title={t('membersLabel')} description={t(descriptions.membersLabel)} actions={<>
        {search}
        {can('organizations.members.manage') && <ActionDialog title={t('addMember')} icon={<AddRounded />} primary><Edit title={t('addMember')} done={refresh} save={data => write(base + '/members', 'POST', { user_uuid: field(data, 'user_uuid') })}><WorkspaceField required name="user_uuid" label={t('userUuid')} helperText={t('userUuidHelp')} /></Edit></ActionDialog>}
      </>} />} />}
    {section === 'rolesLabel' && <WorkspaceTable key="roles" label={t('rolesLabel')} columns={roleColumns} rows={roles?.data}
      fallback={can('roles:read') && !roles && <Skeleton variant="rounded" height={180} />}
      renderHeader={search => <SectionHeader title={t('rolesLabel')} description={t(descriptions.rolesLabel)} actions={<>
        {search}
        {can('roles:create') && <RoleEditor base={base} refresh={refresh} />}
      </>} />} />}
  </>;
}
function RoleActions({ role, base, grants, defs, refresh }: { role: RoleData; base: string; grants: string[]; defs?: PermissionData[]; refresh: () => void }) {
  const t = useAuthText();
  const has = (permission: string) => grants.includes(permission);
  return role.is_system ? <Typography variant="caption" color="text.secondary">{t('systemRole')}</Typography> : <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: .5 }}>
        {has('roles:update') && <RoleEditor base={base} role={role} refresh={refresh} />}
        {defs && has('roles:permissions:update') && <Assignments path={base + '/roles/' + role.uuid + '/permissions'} options={defs} mode="permissions" />}
        {has('roles:delete') && <ActionDialog title={t('deleteRole')} icon={<DeleteOutlineRounded />} destructive compact><Edit title={t('deleteRole')} done={() => { refresh(); invalidateWorkspace(); }} save={() => write(base + '/roles/' + role.uuid, 'DELETE')}><Typography>{t('deleteRoleHelp').replace('{name}', role.name)}</Typography></Edit></ActionDialog>}
      </Stack>;
}
function RoleEditor({ base, role, refresh }: { base: string; role?: RoleData; refresh: () => void }) {
  const t = useAuthText();
  return <ActionDialog title={t(role ? 'editRole' : 'createRole')} icon={role ? <EditOutlined /> : <AddRounded />} primary={!role} compact={!!role}>
    <Edit title={t(role ? 'saveChanges' : 'createRole')} done={refresh} save={data => write(base + '/roles' + (role ? '/' + role.uuid : ''), role ? 'PATCH' : 'POST', { name: field(data, 'name'), description: field(data, 'description') || null })}>
      <WorkspaceField required name="name" maxLength={50} label={t('nameLabel')} defaultValue={role?.name || ''} />
      <WorkspaceField name="description" maxLength={255} label={t('descriptionLabel')} defaultValue={role?.description || ''} multiline minRows={3} />
    </Edit>
  </ActionDialog>;
}
function MemberActions({ member, org, owner, grants, roles, refresh }: { member: MembershipData; org: OrganizationData; owner: boolean; grants: string[]; roles?: RoleData[]; refresh: () => void }) {
  const t = useAuthText();
  const base = '/organizations/' + org.uuid;
  const can = (permission: string) => grants.includes(permission);
  const done = () => { refresh(); invalidateWorkspace(); };
  if (member.user_id === org.owner_id) return <Typography variant="caption" color="text.secondary">{t('ownerLabel')}</Typography>;
  return <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: .5 }}>
    {can('organizations.members.manage') && <>
      <ActionDialog title={t(member.is_active ? 'deactivateMember' : 'activateMember')} compact icon={member.is_active ? <PersonOffOutlined /> : <PersonAddAltOutlined />}><Edit title={t(member.is_active ? 'deactivateMember' : 'activateMember')} done={done} save={() => write(base + '/members/' + member.uuid, 'PATCH', { is_active: !member.is_active })}><Typography>{t('memberStatusHelp').replace('{id}', member.user_uuid)}</Typography></Edit></ActionDialog>
      <ActionDialog title={t('removeMember')} compact icon={<PersonRemoveOutlined />} destructive><Edit title={t('removeMember')} done={done} save={() => write(base + '/members/' + member.uuid, 'DELETE')}><Typography>{t('removeMemberHelp').replace('{id}', member.user_uuid)}</Typography></Edit></ActionDialog>
    </>}
    {owner && member.is_active && can('organizations.update') && <ActionDialog title={t('transferOwner')} compact icon={<ManageAccountsOutlined />}><Edit title={t('transferOwner')} done={done} save={() => write(base, 'PATCH', { owner_id: member.user_id })}><Typography>{t('transferOwnerHelp').replace('{id}', member.user_uuid)}</Typography></Edit></ActionDialog>}
    {member.is_active && roles && can('roles:assign') && <Assignments path={base + '/members/' + member.uuid + '/roles'} options={roles} mode="roles" />}
  </Stack>;
}
function Assignments({ path, options, mode }: { path: string; options: Option[]; mode: 'roles' | 'permissions' }) {
  const t = useAuthText();
  return <ActionDialog title={t(mode === 'roles' ? 'assignRoles' : 'assignPermissions')} compact icon={<ShieldOutlined />}><AssignmentForm path={path} options={options} mode={mode} /></ActionDialog>;
}
function AssignmentForm({ path, options, mode }: { path: string; options: Option[]; mode: 'roles' | 'permissions' }) {
  const t = useAuthText();
  const [rev, refresh] = useState(0);
  const assigned = useResource<Option[]>(path, rev);
  if (assigned?.error) return <DialogContent><Alert severity="error" action={<Button color="inherit" onClick={() => refresh(n => n + 1)}>{t('retry')}</Button>}>{assigned.error}</Alert></DialogContent>;
  if (!assigned?.data) return <DialogContent><Skeleton variant="rounded" height={120} /></DialogContent>;
  return <Edit title={t('saveChanges')} done={invalidateWorkspace} save={data => write(path, 'PUT', { [mode === 'roles' ? 'role_uuids' : 'permissions']: data.getAll('selected') })}>
    {!options.length && <Typography>{t('noRows')}</Typography>}
    {options.map(option => <FormControlLabel key={option.uuid} label={option.name} control={<Checkbox name="selected" value={mode === 'roles' ? option.uuid : option.name} defaultChecked={assigned.data?.some(item => item.uuid === option.uuid)} />} />)}
  </Edit>;
}
function ShopSettings({ shop, editable, refresh }: { shop: Shop; editable: boolean; refresh: () => void }) {
  const t = useAuthText();
  const { t: ui } = useLocale();
  const path = '/settings?shop_id=' + shop.id;
  const settings = useResource<SettingsData>(path);
  if (settings?.error) return <DialogContent><Alert severity="error">{settings.error}</Alert></DialogContent>;
  if (!settings?.data) return <DialogContent><Skeleton variant="rounded" height={80} /></DialogContent>;
  const data = settings.data;
  if (!editable) return <DialogContent><Typography>
    {[data.name, data.address, data.phone, data.receipt_footer].filter(Boolean).join(' · ')}
  </Typography></DialogContent>;

  const lengths = { name: 150, address: 500, phone: 50, receipt_footer: 1000, logo_reference: 500 } as const;
  return <Edit title={t('saveChanges')} done={refresh} save={form => write(path, 'PATCH', Object.fromEntries(form))}>
    {(Object.keys(lengths) as (keyof typeof lengths)[]).map(key => (
      <WorkspaceField key={key} name={key} maxLength={lengths[key]} label={t(key === 'name' ? 'nameLabel' : key)}
        required={key === 'name'} defaultValue={data[key] ?? ''} />
    ))}
    <WorkspaceField select name="preferred_language" label={ui('language')} defaultValue={data.preferred_language}>
      <MenuItem value="en">English</MenuItem>
      <MenuItem value="fa">دری</MenuItem>
      <MenuItem value="ps">پښتو</MenuItem>
    </WorkspaceField>
  </Edit>;
}

function ShopTools({ shop, grants, refresh, tabIndex }: { shop: Shop; grants: string[]; refresh: () => void; tabIndex: number }) {
  const t = useAuthText();
  const [attachment, setAttachment] = useState('');
  const [showAttachment, setShowAttachment] = useState(false);
  const editable = grants.includes('settings:update');
  return <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: .5 }}>
    {editable && <ActionDialog title={t('deactivateShop')} icon={<DoNotDisturbOnOutlined />} destructive compact tabIndex={tabIndex}>
      <Edit title={t('confirmAction')} done={refresh}
        save={() => write('/shops/' + shop.uuid, 'PATCH', { is_active: false })}>
        <Typography>{shop.name}</Typography>
      </Edit>
    </ActionDialog>}
    <ActionDialog title={t('shopSettings')} icon={<SettingsOutlined />} compact tabIndex={tabIndex}>
      <ShopSettings shop={shop} editable={editable} refresh={refresh} />
    </ActionDialog>
    {grants.includes('attachment:manage') && <ActionDialog title={t('uploadFile')} icon={<UploadFileOutlined />} compact tabIndex={tabIndex}>
      <Edit title={t('uploadFile')} save={async form => {
        form.set('shop_uuid', shop.uuid);
        const result = await request<{ uuid: string } | { data: { uuid: string } }>('/files', { method: 'POST', body: form });
        setAttachment('data' in result ? result.data.uuid : result.uuid);
        setShowAttachment(true);
      }}>
        <WorkspaceFileField />
      </Edit>
    </ActionDialog>}
    {grants.includes('attachment:read') && <ActionDialog title={t('downloadFile')} icon={<DownloadOutlined />} compact tabIndex={tabIndex}>
      <Edit title={t('downloadFile')} save={async form => {
        const uuid = field(form, 'uuid');
        const blob = await request<Blob>('/files/' + encodeURIComponent(uuid), {}, true);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = uuid;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>
        <WorkspaceField required name="uuid" label={t('attachmentId')} defaultValue={attachment} />
      </Edit>
    </ActionDialog>}
    {showAttachment && <Portal>
      <Snackbar open message={t('attachmentId') + ' ' + attachment}
        autoHideDuration={8000} onClose={() => setShowAttachment(false)} />
    </Portal>}
  </Stack>;
}
