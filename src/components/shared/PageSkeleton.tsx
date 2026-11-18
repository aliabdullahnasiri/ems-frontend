import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Container, Paper, Skeleton, Stack } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useLocale } from '../../i18n/locale';

export type PageKind = 'auth' | 'profile' | 'security' | 'workspace' | 'organizations' | 'dashboard';
const line = (width: string | number, height = 18) => <Skeleton variant="rounded" width={width} height={height}/>;
function Fields({ count = 3 }: { count?: number }) {
 return <Stack spacing={2.5}>{Array.from({ length: count }, (_, index) => <Skeleton key={index} variant="rounded" height={54} sx={{ borderRadius: '10px' }}/>)}</Stack>;
}
function Panel({ children }: { children: ReactNode }) {
 return <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}><Stack spacing={3}>{children}</Stack></Paper>;
}
function WorkspacePlaceholder() {
 return <Stack spacing={3.5}>
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}><Stack spacing={1.5}>{line(170, 30)}{line('min(320px, 65vw)', 16)}</Stack>{line(200, 44)}</Stack>
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '1fr' }, '& > :nth-of-type(1)': { gridColumn: { xs: '1 / -1', md: '1 / -1' } }, '& > :nth-of-type(2)': { gridColumn: { xs: '1 / -1', md: 'span 4' } }, gap: 3 }}><Panel><Stack direction="row" spacing={2}><Skeleton variant="rounded" width={52} height={52}/><Stack spacing={1}>{line(180, 22)}{line(150, 14)}</Stack></Stack>{[0, 1].map(index => <Stack key={index} direction="row" spacing={2} sx={{ py: 1 }}><Skeleton variant="circular" width={24} height={24}/><Stack spacing={1} sx={{ flex: 1 }}>{line('45%', 18)}{line('80%', 14)}</Stack></Stack>)}</Panel></Box>
 </Stack>;
}

export function OrganizationCardsSkeleton() {
 const { t } = useLocale();
 return <Box role="status" aria-label={t('loading')} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
  {[0, 1].map(index => <Stack key={index} direction="row" spacing={1.5} aria-hidden="true" sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: '12px', minHeight: 126 }}>
   <Skeleton variant="rounded" width={24} height={24} sx={{ flexShrink: 0 }}/>
   <Stack spacing={1} sx={{ flex: 1 }}>{line('75%', 20)}{line('50%', 18)}{line('40%', 22)}</Stack>

  </Stack>)}
 </Box>;
}
function OrganizationsPlaceholder() {
 return <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>{line(130, 40)}<Stack direction="row" spacing={1}><Skeleton variant="circular" width={40} height={40}/><Skeleton variant="circular" width={40} height={40}/></Stack></Stack><Box sx={{ mt: 2, mb: 1 }}>{line('min(360px, 80%)', 42)}</Box><Box sx={{ mb: 3 }}>{line('min(520px, 95%)', 24)}</Box>
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0,1fr)' }, gap: 3, alignItems: 'start' }}>
   <Paper sx={{ p: 3 }}><Stack spacing={2}><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr' }, gap: .5 }}>{[0, 1, 2, 3].map(index => <Skeleton key={index} variant="rounded" height={44}/>)}</Box></Stack></Paper>
   <Paper sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={3}><Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}><Stack spacing={1}>{line(170, 32)}{line(220, 18)}</Stack><Stack direction="row" spacing={1} sx={{ alignSelf: 'flex-end' }}>{line(150, 44)}{line(130, 44)}</Stack></Stack><OrganizationCardsSkeleton/>{line('100%', 1)}{line(220, 28)}<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>{[0, 1, 2, 3, 4, 5].map(index => <Stack key={index} spacing={1}>{line('45%', 18)}{line('70%', 22)}</Stack>)}</Box>{line('100%', 44)}</Stack></Paper>
  </Box>
 </Container>;
}

export function PageSkeleton({ kind = 'workspace', pathname = '' }: { kind?: PageKind; pathname?: string }) {
 const { t } = useLocale();
 const content = kind === 'auth' ? <Box sx={{ minHeight: '100dvh', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
  <Stack direction="row" sx={{ p: { xs: 3, sm: 5 }, justifyContent: 'space-between', alignItems: 'center' }}>{line(90, 36)}{line(170, 32)}</Stack>
  <Container maxWidth={false} sx={{ maxWidth: 440, px: { xs: 3, sm: 2 }, py: { xs: 4, sm: 7 }, flex: 1, display: 'grid', alignContent: 'center' }}><Stack spacing={3.5}>{line('72%', 36)}<Stack spacing={1}>{line('100%', 16)}{line('62%', 16)}</Stack><Fields count={pathname === '/register' ? 3 : pathname === '/login' ? 2 : pathname === '/verify-email' ? 0 : 1}/>{pathname === '/register' && line('85%', 24)}{pathname === '/login' && <Box sx={{ alignSelf: 'flex-end' }}>{line(130, 16)}</Box>}{line('100%', 48)}<Box sx={{ alignSelf: 'center' }}>{line(170, 18)}</Box></Stack></Container>
 </Box> : kind === 'organizations' ? <OrganizationsPlaceholder/> : kind === 'workspace' ? <WorkspacePlaceholder/> : kind === 'dashboard' ? <Box sx={{ minHeight: '100dvh', p: 2 }}>
  <Paper sx={{ display: { xs: 'none', lg: 'block' }, position: 'absolute', top: 16, bottom: 16, left: 16, width: 250, p: 3 }}><Stack spacing={4}>{line(130, 32)}{line('100%', 46)}{line('100%', 46)}</Stack></Paper>
  <Box sx={{ marginInlineStart: { lg: '278px' } }}>{line('100%', 72)}<Box sx={{ mt: 3 }}><WorkspacePlaceholder/></Box></Box>
 </Box> : <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}><Stack spacing={3}>
  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>{line(110, 40)}{line(160, 40)}</Stack>
  <Panel><Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}><Skeleton variant="rounded" width={80} height={80} sx={{ flexShrink: 0, borderRadius: '24px' }}/><Stack spacing={1.25} sx={{ flex: 1 }}>{line('min(230px, 40vw)', 30)}{line('min(160px, 35vw)', 18)}{line('min(200px, 38vw)', 14)}</Stack></Stack></Panel>
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: kind === 'profile' ? 'minmax(0, 1fr) 300px' : '1.35fr 1fr' }, gap: 3, alignItems: 'start' }}>
   <Panel>{line('55%', 24)}{line('90%', 16)}{kind === 'profile' ? <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>{[0, 1, 2, 3].map(index => <Skeleton key={index} variant="rounded" height={54}/>)}</Box><Fields count={2}/></> : <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>{line('100%', 150)}{line('100%', 150)}</Box>{line('100%', 44)}</>}{line(kind === 'profile' ? 160 : '75%', kind === 'profile' ? 48 : 20)}</Panel>
   <Panel>{line('70%', 24)}{line('100%', 16)}{kind === 'security' && <Fields count={2}/>} {line('100%', 44)}</Panel>
  </Box>
  {kind === 'security' && <Panel>{line(190, 24)}{[0, 1].map(index => <Stack key={index} direction="row" spacing={2}><Skeleton variant="rounded" width={48} height={48}/><Stack spacing={1} sx={{ flex: 1 }}>{line('45%', 18)}{line('65%', 14)}</Stack></Stack>)}</Panel>}
 </Stack></Container>;
 return <Box role="status" aria-label={t('loading')} aria-live="polite" sx={{ '& .MuiSkeleton-root': { transform: 'none' }, '@media (prefers-reduced-motion: reduce)': { '& .MuiSkeleton-root, & .MuiSkeleton-root::after': { animation: 'none' } } }}><Box aria-hidden="true">{content}</Box></Box>;
}

type RouteSkeletonProps = {
 kind: PageKind;
 pathname?: string;
 children: ReactNode;
};

const minimumSkeletonDuration = 250;

export function RouteSkeleton(props: RouteSkeletonProps) {
 const { pathname } = useLocation();
 return <RouteSkeletonContent key={pathname} {...props}/>;
}

function RouteSkeletonContent({ kind, pathname, children }: RouteSkeletonProps) {
 const [minimumElapsed, setMinimumElapsed] = useState(false);
 useEffect(() => {
  const timer = setTimeout(() => setMinimumElapsed(true), minimumSkeletonDuration);
  return () => clearTimeout(timer);
 }, []);
 const skeleton = <PageSkeleton kind={kind} pathname={pathname}/>;
 return <Suspense fallback={skeleton}>
  {!minimumElapsed && skeleton}
  <div hidden={!minimumElapsed}>{children}</div>
 </Suspense>;
}
