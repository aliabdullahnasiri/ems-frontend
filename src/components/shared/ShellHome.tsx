import { Avatar, Box, Button, Divider, List, ListItemButton, ListItemIcon, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded, ChevronRightRounded, PersonOutlined, ShieldOutlined } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { useAuthText } from '../auth/text';
import { fullName, initials } from '../auth/identity';
import { useLocale } from '../../i18n/locale';
import { useSession } from '../../context/Session';
import { RequestState } from './Contracts';

export function ShellHome() {
 const { t, direction } = useLocale();
 const text = useAuthText();
 const { user, loading, error } = useSession();
 const name = fullName(user);
 return <Stack spacing={3.5} sx={{ width: '100%', minWidth: 0 }}>
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
   <Box><Typography component="h1" variant="h4">{t('dashboard')}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: .75, maxWidth: 560 }}>{text('workspaceHelp')}</Typography></Box>
   <Button component={Link} to="/organizations" variant="contained" endIcon={<ArrowForwardRounded sx={{ transform: direction === 'rtl' ? 'rotate(180deg)' : undefined }}/>} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0, minHeight: 44, '& .MuiButton-endIcon': { transition: 'transform 150ms ease' }, '&:hover .MuiButton-endIcon': { transform: direction === 'rtl' ? 'translateX(-3px)' : 'translateX(3px)' }, '@media (prefers-reduced-motion: reduce)': { '& .MuiButton-endIcon': { transition: 'none' }, '&:hover .MuiButton-endIcon': { transform: 'none' } } }}>{text('manageOrganizations')}</Button>
  </Stack>
  <RequestState loading={loading} error={error}/>
  <Box>
   <Paper data-motion-panel><Stack direction="row" spacing={2} sx={{ p: 3, alignItems: 'center' }}><Avatar sx={{ width: 52, height: 52, borderRadius: '16px', fontSize: 18, fontWeight: 600, bgcolor: theme => alpha(theme.palette.primary.main, .1), color: 'primary.main' }}>{initials(name)}</Avatar><Box sx={{ minWidth: 0 }}><Typography component="h2" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{name || text('accountDetails')}</Typography><Typography variant="body2" color="text.secondary" dir="auto" sx={{ overflowWrap: 'anywhere', mt: .25 }}>{user?.email}</Typography></Box></Stack><Divider/>
    <List disablePadding sx={{ p: 1 }}>{([{ path: '/profile', title: 'profile', help: 'profileHelp', icon: <PersonOutlined/> }, { path: '/account/security', title: 'security', help: 'manageSecurity', icon: <ShieldOutlined/> }] as const).map(item => <ListItemButton key={item.path} component={Link} to={item.path} sx={{ borderRadius: '10px', py: 1.75, gap: .5 }}><ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon><ListItemText primary={text(item.title)} secondary={text(item.help)} slotProps={{ primary: { sx: { fontWeight: 600, fontSize: '.9375rem' } }, secondary: { sx: { mt: .5, lineHeight: 1.6 } } }}/><ChevronRightRounded sx={{ color: 'text.disabled', fontSize: 20, transform: direction === 'rtl' ? 'rotate(180deg)' : undefined }}/></ListItemButton>)}</List>
   </Paper>

  </Box>
 </Stack>;
}
