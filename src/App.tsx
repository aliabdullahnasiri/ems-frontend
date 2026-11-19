import { lazy, useEffect } from 'react';
import { RouteSkeleton } from './components/shared/PageSkeleton';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { RequireAuth } from './components/auth/RequireAuth';
import { PageLoading } from './components/shared/PageLoading';
import { useAuthText } from './components/auth/text';
import { useLocale } from './i18n/locale';
import './App.css';
const OrganizationPage = lazy(() => import('./components/shared/Workspace').then(module => ({ default: module.Workspace })));
const Dashboard = lazy(() => import('./layouts/Dashboard').then(module => ({ default: module.Dashboard })));
const AuthPage = lazy(() => import('./components/auth/AuthPage').then(module => ({ default: module.AuthPage })));
const MyProfile = lazy(() => import('./components/auth/MyProfile').then(module => ({ default: module.MyProfile })));
const AccountSecurity = lazy(() => import('./components/auth/AccountSecurity').then(module => ({ default: module.AccountSecurity })));
const authPages = {
 '/login': 'login',
 '/register': 'register',
 '/forgot-password': 'forgot',
 '/reset-password': 'reset',
 '/verify-email': 'verify',
 '/resend-verification': 'resend',
} as const;

function App() {
 const { pathname } = useLocation();
 const { t } = useLocale();
 const text = useAuthText();
 const pageNames: Record<string, string> = {
  '/dashboard': t('dashboard'),
  '/organizations': text('manageOrganizations'),
  '/profile': text('profile'),
  '/account/security': text('security'),
 };
 for (const [path, label] of Object.entries(authPages)) pageNames[path] = text(label);
 const pageName = pageNames[pathname.toLowerCase().replace(/\/+$/, '')];
 useEffect(() => {
  document.title = pageName ? `EMS · ${pageName}` : 'EMS';
 }, [pageName]);

 return <PageLoading><Routes>
 <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
 {Object.keys(authPages).map(path=><Route key={path} path={path} element={<RouteSkeleton key={path} kind="auth" pathname={path}><AuthPage key={path}/></RouteSkeleton>}/>)}
 <Route path="/organizations" element={<RouteSkeleton kind="organizations"><RequireAuth><OrganizationPage/></RequireAuth></RouteSkeleton>}/>
 <Route path="/profile" element={<RouteSkeleton kind="profile"><RequireAuth><MyProfile/></RequireAuth></RouteSkeleton>}/>
 <Route path="/account/profile" element={<Navigate to="/profile" replace/>}/>
 <Route path="/account/security" element={<RouteSkeleton kind="security"><RequireAuth><AccountSecurity/></RequireAuth></RouteSkeleton>}/>
 <Route path="/*" element={<RouteSkeleton kind="dashboard"><RequireAuth><Dashboard/></RequireAuth></RouteSkeleton>}/>
 </Routes></PageLoading>; }
export default App;
