import { lazy, useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Link, MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { LocaleProvider, useLocale } from '../src/i18n/locale';
import { RouteSkeleton } from '../src/components/shared/PageSkeleton';
import { PageLoading } from '../src/components/shared/PageLoading';

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });
function Controls() {
 const navigate = useNavigate();
 const { pathname } = useLocation();
 const { setLocale } = useLocale();
 return <><span>{pathname}</span><button onClick={() => navigate('/account/security')}>Security</button><button onClick={() => setLocale('fa')}>Dari</button></>;
}
function Content({ start }: { start: () => void }) {
 useEffect(() => { start(); }, [start]);
 return <input aria-label="Page input" defaultValue="Preserve this"/>;
}
function mount(start = vi.fn()) {
 return render(<LocaleProvider><MemoryRouter initialEntries={['/profile']}><Controls/><PageLoading><Content start={start}/></PageLoading></MemoryRouter></LocaleProvider>);
}
test('ready pages render immediately and start their work without a timer', () => {
 const start = vi.fn(); mount(start);
 expect(start).toHaveBeenCalledTimes(1);
 expect(screen.queryByRole('status')).toBeNull();
 expect(screen.getByRole('textbox', { name: 'Page input' })).toBeTruthy();
});
test('changing language preserves input state without replaying the spinner', () => {
 mount();
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Edited value'}});fireEvent.click(screen.getByRole('button',{name:'Dari'}));
 expect(screen.queryByRole('status')).toBeNull();expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Edited value');
});
test('navigation after startup shows the destination immediately', () => {
 vi.useFakeTimers();
 mount();
 fireEvent.click(screen.getByRole('button', { name: 'Security' }));
 expect(screen.getByText('/account/security')).toBeTruthy();
 expect(screen.queryByRole('status')).toBeNull();
 expect(screen.getByRole('textbox')).toBeTruthy();
});

test('cached pages show a brief skeleton on pathname changes', () => {
 vi.useFakeTimers();
 render(<LocaleProvider><MemoryRouter initialEntries={['/profile']}>
  <Link to="/account/security">Security</Link>
  <RouteSkeleton kind="security"><input aria-label="Page content" /></RouteSkeleton>
 </MemoryRouter></LocaleProvider>);
 expect(screen.getByRole('status')).toBeTruthy();
 expect(screen.queryByRole('textbox')).toBeNull();
 act(() => { vi.advanceTimersByTime(250); });
 expect(screen.getByRole('textbox')).toBeTruthy();
 fireEvent.click(screen.getByRole('link', { name: 'Security' }));
 expect(screen.getByRole('status')).toBeTruthy();
 act(() => { vi.advanceTimersByTime(250); });
 expect(screen.queryByRole('status')).toBeNull();
 fireEvent.click(screen.getByRole('link', { name: 'Security' }));
 expect(screen.getByRole('textbox')).toBeTruthy();
});

test('the skeleton stays until a pending page actually resolves', async () => {
 vi.useFakeTimers();
 let resolve!: (value: { default: () => React.ReactNode }) => void;
 const Pending = lazy(() => new Promise<{ default: () => React.ReactNode }>(done => { resolve = done; }));
 render(<LocaleProvider><MemoryRouter><RouteSkeleton kind="organizations"><Pending /></RouteSkeleton></MemoryRouter></LocaleProvider>);
 expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
 act(() => { vi.advanceTimersByTime(250); });
 expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
 await act(async () => { resolve({ default: () => <p>Organizations ready</p> }); });
 expect(screen.queryByRole('status')).toBeNull();
 expect(screen.getByText('Organizations ready')).toBeTruthy();
});
