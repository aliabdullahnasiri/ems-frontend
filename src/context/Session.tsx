import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { ApiError, hasSession, request, subscribeSession, sessionVersion } from '../api/client';
import { auth } from '../api/auth';
import { rememberedOrganization, selectOrganization } from '../api/organizationSelection';
import type { UserData } from '../api/generated';
export interface SessionContext { organization_id: number; membership_id: number; user_id: number; permissions: string[] }
type State = { user?: UserData; context?: SessionContext; loading: boolean; error?: unknown; contextError?: unknown; version?: number };
const Context = createContext<State & {authenticated: boolean; reload: () => void}>({loading:false, authenticated:false, reload:()=>{}});
export function SessionProvider({ children }: { children: ReactNode }) {
 const version = useSyncExternalStore(subscribeSession, sessionVersion);
 const active = hasSession();
 const [revision, setRevision] = useState(0);
 const [state, setState] = useState<State>({loading:false});
 useEffect(() => {
  if (!active) return;
  const controller = new AbortController();
  void (async () => {
   try {
    const user = await auth.me(controller.signal);
    let context: SessionContext | undefined;
    let contextError: unknown;
    const { signal } = controller;
    const loadContext = () => request<SessionContext>('/auth/context', { signal });
    try {
     context = await loadContext();
    } catch (error) {
     contextError = error;
     if (!signal.aborted && error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      const previous = rememberedOrganization(user.uuid);
      if (previous) {
       try {
        await selectOrganization(previous, signal);
        context = await loadContext();
        contextError = undefined;
       } catch (restoreError) {
        contextError = restoreError;
       }
      }
     }
    }
    if (!controller.signal.aborted) setState({user,context,contextError,loading:false,version});
   } catch (error) { if (!controller.signal.aborted) setState({error,loading:false,version}); }
  })();
  return () => controller.abort();
 }, [active,version,revision]);
 const current = active ? (state.version === version ? state : {loading:true}) : {loading:false};
 return <Context.Provider value={{...current, authenticated:active, reload:()=>setRevision(v=>v+1)}}>{children}</Context.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export const useSession = () => useContext(Context);
