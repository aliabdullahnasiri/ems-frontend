import { useState } from 'react';
import { Avatar, Box, Button, Chip, Divider, List, ListItemButton, ListItemIcon, ListItemText, Paper, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import { ArrowForwardRounded, BusinessOutlined, CheckCircleOutlineRounded, ChevronRightRounded, DoNotDisturbOnOutlined, GroupsOutlined, PersonOutlined, ShieldOutlined, StorefrontOutlined } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { useAuthText } from '../auth/text';
import { fullName, initials } from '../auth/identity';
import { useLocale } from '../../i18n/locale';
import { useSession } from '../../context/Session';
import { sessionVersion } from '../../api/client';
import type { MembershipData, OrganizationData } from '../../api/generated';
import { useResource } from './useResource';
import { RequestState } from './Contracts';

export function ShellHome() {
 const { t, direction, locale } = useLocale();
 const text = useAuthText();
 const { user, context, loading, error } = useSession();
 const organizationId = context?.organization_id;
 const version = sessionVersion();
 const organizations = useResource<OrganizationData[]>(organizationId ? '/organizations' : '', version, true);
 const organization = organizations?.data?.find(org => org.id === organizationId);
 const membersPath = organization && context?.permissions.includes('organizations.members.read')
  ? '/organizations/' + organization.uuid + '/members' : '';
 const shopsPath = organization && context?.permissions.includes('settings:read') ? '/shops' : '';
 const members = useResource<MembershipData[]>(membersPath, version, true);
 const shops = useResource<unknown[]>(shopsPath, version, true);
 const number = new Intl.NumberFormat(locale);
 const counts = [
  { color: 'success' as const, icon: <GroupsOutlined/>, label: text('activeMembers'), path: membersPath, result: members, value: members?.data?.filter(member => member.is_active).length },
  { color: 'primary' as const, icon: <StorefrontOutlined/>, label: text('shopsNav'), path: shopsPath, result: shops, value: shops?.data?.length },
 ].filter(metric => metric.path);
 const [copyNotice, setCopyNotice] = useState<string>();
 async function copyUuid(uuid: string) {
  try {
   await navigator.clipboard.writeText(uuid);
   setCopyNotice(text('uuidCopied'));
  } catch {
   setCopyNotice(text('uuidCopyFailed'));
  }
 }

 const name = fullName(user);
 const createdAt = organization?.created_at;
 const createdDate = createdAt && !Number.isNaN(Date.parse(createdAt))
  ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(createdAt))
  : '—';
 return <Stack spacing={3.5} sx={{ width: '100%', minWidth: 0 }}>
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
   <Box><Typography component="h1" variant="h4">{t('dashboard')}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: .75, maxWidth: 560 }}>{text('workspaceHelp')}</Typography></Box>
   <Button component={Link} to="/organizations" variant="contained" endIcon={<ArrowForwardRounded sx={{ transform: direction === 'rtl' ? 'rotate(180deg)' : undefined }}/>} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0, minHeight: 44, '& .MuiButton-endIcon': { transition: 'transform 150ms ease' }, '&:hover .MuiButton-endIcon': { transform: direction === 'rtl' ? 'translateX(-3px)' : 'translateX(3px)' }, '@media (prefers-reduced-motion: reduce)': { '& .MuiButton-endIcon': { transition: 'none' }, '&:hover .MuiButton-endIcon': { transform: 'none' } } }}>{text('manageOrganizations')}</Button>
  </Stack>
  <RequestState loading={loading} error={error}/>
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3 }}>
   <Paper data-motion-panel><Stack direction="row" spacing={2} sx={{ p: 3, alignItems: 'center' }}><Avatar sx={{ width: 52, height: 52, borderRadius: '16px', fontSize: 18, fontWeight: 600, bgcolor: theme => alpha(theme.palette.primary.main, .1), color: 'primary.main' }}>{initials(name)}</Avatar><Box sx={{ minWidth: 0 }}><Typography component="h2" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{name || text('accountDetails')}</Typography><Typography variant="body2" color="text.secondary" dir="auto" sx={{ overflowWrap: 'anywhere', mt: .25 }}>{user?.email}</Typography></Box></Stack><Divider/>
    <List disablePadding sx={{ p: 1 }}>{([{ path: '/profile', title: 'profile', help: 'profileHelp', icon: <PersonOutlined/> }, { path: '/account/security', title: 'security', help: 'manageSecurity', icon: <ShieldOutlined/> }] as const).map(item => <ListItemButton key={item.path} component={Link} to={item.path} sx={{ borderRadius: '10px', py: 1.75, gap: .5 }}><ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon><ListItemText primary={text(item.title)} secondary={text(item.help)} slotProps={{ primary: { sx: { fontWeight: 600, fontSize: '.9375rem' } }, secondary: { sx: { mt: .5, lineHeight: 1.6 } } }}/><ChevronRightRounded sx={{ color: 'text.disabled', fontSize: 20, transform: direction === 'rtl' ? 'rotate(180deg)' : undefined }}/></ListItemButton>)}</List>
   </Paper>
   <Paper data-motion-panel component="section" aria-labelledby="dashboard-organization" sx={{ p: 3, minWidth: 0 }}>
    <Stack spacing={1.5}>
     <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <BusinessOutlined color="primary" />
      <Typography id="dashboard-organization" component="h2" variant="h6">{text('organization')}</Typography>
     </Stack>
     <RequestState loading={loading || (!!organizationId && !organizations)} error={organizations?.error}/>
     {organization ? <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
      <Box sx={{ p: 1, borderRadius: '12px', bgcolor: theme => alpha(theme.palette.primary.main, .07) }}>
       <Typography component="p" variant="subtitle1" dir="auto" sx={{ fontWeight: 700 }}>{organization.name}</Typography>
       <Stack direction="row" sx={{
        mt: .75, gap: .75, flexWrap: 'wrap',
        '& .MuiChip-icon': { color: 'inherit', fontSize: 16 },
       }}>
        <Chip size="small" color={organization.is_active ? "success" : "error"}
         icon={organization.is_active ? <CheckCircleOutlineRounded/> : <DoNotDisturbOnOutlined/>}
         label={text(organization.is_active ? 'activeLabel' : 'inactiveLabel')}/>
        <Chip size="small" color="secondary" icon={<PersonOutlined/>}
         label={text(organization.owner_id === context?.user_id ? 'ownerLabel' : 'memberLabel')}/>
        {counts.map(({ color, icon, label, result, value }) => <Tooltip key={label} title={label} describeChild>
         <Chip size="small" color={color} icon={icon} tabIndex={0}
          aria-label={label + ' ' + (value === undefined ? t(result?.error ? 'server' : 'loading') : number.format(value))}
          label={value !== undefined ? number.format(value) : result?.error ? '—' : '…'}/>
        </Tooltip>)}
       </Stack>
      </Box>
      <Box component="dl" sx={{ m: 0, mt: 1, '& .MuiChip-root': { color: 'text.primary', borderColor: 'divider', maxWidth: '100%' }, '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere' } }}>
       {([
        [text('slugLabel'), organization.slug],
        [text('createdLabel'), createdDate],
       ] as const).map(([label, value]) => <Box key={label} sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 1.5, rowGap: .25,
        py: 1, '& + &': { borderTop: 1, borderColor: 'divider' },
       }}>
        <Typography component="dt" variant="body2" color="text.secondary">{label}</Typography>
        <Box component="dd" sx={{ m: 0, minWidth: 0 }}>
         <Chip size="small" variant="outlined" label={<bdi>{value}</bdi>} sx={{ height: 'auto', minHeight: 24, userSelect: 'text' }}/>
        </Box>
       </Box>)}
       <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 1.5, rowGap: .25, py: 1, borderTop: 1, borderColor: 'divider' }}>
        <Typography component="dt" variant="body2" color="text.secondary">{text('organizationId')}</Typography>
        <Box component="dd" sx={{ m: 0 }}>
         <Chip component="button" type="button" size="small" variant="outlined" clickable dir="ltr"
          aria-label={text('copyUuid') + ' ' + organization.uuid}
          onClick={() => void copyUuid(organization.uuid)}
          label={organization.uuid.split('-').at(-1)}/>
        </Box>
       </Box>
      </Box>
     </Box> : !loading && (!organizationId || organizations?.data) &&
      <Button component={Link} to="/organizations" variant="outlined" sx={{ alignSelf: 'flex-start' }}>{text('manageOrganizations')}</Button>}
    </Stack>
   </Paper>
  </Box>
  <Snackbar open={!!copyNotice} message={copyNotice} autoHideDuration={4000} onClose={() => setCopyNotice(undefined)}/>
 </Stack>;
}
