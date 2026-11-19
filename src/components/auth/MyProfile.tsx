import { waitForSubmissionFeedback } from '../../utils/submissionDelay';
import dayjs from 'dayjs';
import { DateInput } from '../shared/DateInput';
import { dateFormat, parseDate } from '../shared/dateValue';
import { useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Container, IconButton, Tooltip, Divider, Paper, Snackbar, Stack, Typography } from '@mui/material';
import { ArrowBackOutlined, ContentCopyOutlined, SettingsOutlined, ShieldOutlined } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { auth } from '../../api/auth';
import type { UpdateUserRequest } from '../../api/generated';
import { useSession } from '../../context/Session';
import { useMaterialController } from '../../context/useMaterialController';
import { setOpenConfigurator } from '../../context/materialActions';
import { useLocale } from '../../i18n/locale';
import Configurator from '../../widgets/layout/Configurator';
import FormInput from '../shared/FormInput';
import { AccountMenu } from './AccountMenu';
import { fullName, initials } from './identity';
import { useAuthText } from './text';

export function MyProfile() {
 const { user, reload } = useSession();
 const t = useAuthText();
 const [birthday, setBirthday] = useState(() => parseDate(user?.birthday));
 const [invalidBirthday, setInvalidBirthday] = useState(false);
 const { t: ui } = useLocale();
 const [, dispatch] = useMaterialController();
 const lock = useRef(false);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string>();
 const [errors, setErrors] = useState<Record<string, string>>({});
 const [saved, setSaved] = useState(false);
 const [copyNotice, setCopyNotice] = useState<{ message: string }>();
 const uuid = user?.uuid;
 const name = fullName(user);

 async function copyUuid(value: string) {
  try {
   await navigator.clipboard.writeText(value);
   setCopyNotice({ message: t('uuidCopied') });
  } catch {
   setCopyNotice({ message: t('uuidCopyFailed') });
  }
 }

 const panel = { p: { xs: 2.5, md: 3.5 }, border: 1, borderColor: 'divider', boxShadow: 'none' };
 const names = ['first_name', 'middle_name', 'last_name'] as const;
 return <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}><Stack spacing={3}>
  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}><Button component={Link} to="/dashboard" startIcon={<ArrowBackOutlined sx={{ '[dir=rtl] &': { transform: 'rotate(180deg)' } }}/>}>{t('back')}</Button><Stack direction="row" spacing={1}><Tooltip title={ui('settings')}><IconButton aria-label={ui('settings')} onClick={() => setOpenConfigurator(dispatch, true)} sx={{ p: .5, minWidth: 44, minHeight: 44 }}><Avatar sx={{ width: 36, height: 36, bgcolor: theme => alpha(theme.palette.primary.main, .12), color: 'primary.main' }}><SettingsOutlined fontSize="small"/></Avatar></IconButton></Tooltip><AccountMenu/></Stack></Stack>
  <Paper data-motion-panel sx={{ ...panel, borderTop: 3, borderTopColor: 'primary.main' }}>
    <Stack direction="row" spacing={2.5} sx={{ minWidth: 0, alignItems: 'center' }}><Avatar sx={{ flexShrink: 0, width: { xs: 64, sm: 80 }, height: { xs: 64, sm: 80 }, borderRadius: '24px', fontSize: 26, fontWeight: 600, bgcolor: theme => alpha(theme.palette.primary.main, .1), color: 'primary.main' }}>{initials(name)}</Avatar><Box sx={{ minWidth: 0 }}><Typography component="h1" variant="h4" sx={{ fontSize: { xs: 26, md: 32 } }}>{t('profile')}</Typography><Typography sx={{ mt: .75, fontWeight: 600, overflowWrap: 'anywhere' }}>{name}</Typography><Typography variant="body2" color="text.secondary" dir="auto" sx={{ overflowWrap: 'anywhere' }}>{user?.email}</Typography></Box></Stack>
  </Paper>
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' }, gap: 3, alignItems: 'start' }}>
   <Paper data-motion-panel sx={panel}><Stack component="form" spacing={3} noValidate aria-busy={busy} onChange={() => { setSaved(false); setError(undefined); }} onSubmit={async event => {
    event.preventDefault(); if (lock.current) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
    values.birthday = birthday?.isValid() ? birthday.format(dateFormat) : '';
    const issues: Record<string, string> = {};
    for (const key of names) if ((values[key] || '').trim().length > 50) issues[key] = t('maximumLength').replace('{count}', '50');
    if (invalidBirthday) issues.birthday = t('invalidDate');
    setErrors(issues); setError(undefined); setSaved(false);
    if (Object.keys(issues).length) { (form.elements.namedItem(Object.keys(issues)[0]) as HTMLElement | null)?.focus(); return; }
    const body: UpdateUserRequest = {};
    for (const key of [...names, 'birthday'] as const) {
     const value = values[key]?.trim() || null;
     if (value !== (user?.[key] || null)) Object.assign(body, { [key]: value });
    }
    if (!Object.keys(body).length) { setSaved(true); return; }
    lock.current = true; setBusy(true);
    try { await waitForSubmissionFeedback(); await auth.updateProfile(body); reload(); setSaved(true); }
    catch (failure) { if (failure instanceof ApiError) setErrors(failure.fields); setError(failure instanceof Error ? failure.message : t('retry')); }
    finally { lock.current = false; setBusy(false); }
   }}>
    <Box><Typography component="h2" variant="h6">{t('personalDetails')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{t('profileHelp')}</Typography></Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
     {names.map(key => <FormInput key={key} name={key} label={t(key)} defaultValue={user?.[key] || ''} maxLength={50} disabled={busy} error={errors[key]} autoComplete={key === 'first_name' ? 'given-name' : key === 'middle_name' ? 'additional-name' : 'family-name'} onChange={() => setErrors(current => ({ ...current, [key]: '' }))}/>)}
     <DateInput label={t('birthday')} value={birthday} maxDate={dayjs()} disabled={busy}
      error={invalidBirthday ? t('invalidDate') : errors.birthday}
      onChange={(date, validationError) => {
       setBirthday(date);
       setInvalidBirthday(!!validationError);
       setErrors(current => ({ ...current, birthday: '' }));
       setSaved(false);
       setError(undefined);
      }}/>
    </Box>
    <Divider/><Typography component="h2" variant="h6">{t('accountDetails')}</Typography>
    {uuid && <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, paddingInlineStart: 1.75, paddingInlineEnd: .5, minHeight: 54, border: 1, borderColor: 'divider', borderRadius: '10px', bgcolor: 'action.disabledBackground' }}>
     <Typography variant="body2" color="text.secondary">{t('userUuid')}</Typography>
     <Tooltip title={t('copyUuid')}>
      <Button type="button" size="small" color="inherit" dir="ltr"
       aria-label={t('copyUuid') + ' ' + uuid}
       onClick={() => void copyUuid(uuid)}
       sx={{ minHeight: 44, gap: .75, fontFamily: 'monospace' }}>
       {uuid.split('-').at(-1)}
       <ContentCopyOutlined sx={{ fontSize: 14, color: 'text.secondary' }}/>
      </Button>
     </Tooltip>
    </Box>}
    <Stack spacing={3} sx={theme => ({
     '& .MuiOutlinedInput-root.Mui-disabled': {
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? .08 : .04),
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiOutlinedInput-input.Mui-disabled': { WebkitTextFillColor: theme.palette.text.secondary },
     },
     '& .MuiInputLabel-root.Mui-disabled': { color: 'text.secondary' },
    })}>
     <FormInput name="user_name" label={t('user_name')} value={user?.user_name || ''} disabled dir="ltr"/>
     <FormInput name="email" label={t('email')} type="email" value={user?.email || ''} disabled dir="ltr"/>
    </Stack>
    {error && <Alert severity="error">{error}</Alert>}{saved && <Alert severity="success">{t('profileSaved')}</Alert>}
    <Button type="submit" variant="contained" loading={busy} disabled={busy} sx={{ minHeight: 48, alignSelf: { sm: 'flex-start' }, minWidth: 160 }}>{t('saveChanges')}</Button>
   </Stack></Paper>
   <Paper data-motion-panel sx={panel}><Stack spacing={2}><ShieldOutlined color="primary"/><Typography component="h2" variant="h6">{t('security')}</Typography><Typography variant="body2" color="text.secondary">{t('manageSecurity')}</Typography><Button component={Link} to="/account/security" variant="outlined">{t('security')}</Button></Stack></Paper>
  </Box>
  <Snackbar open={!!copyNotice} message={copyNotice?.message} autoHideDuration={4000} onClose={() => setCopyNotice(undefined)}/>
  <Configurator/>
 </Stack></Container>;
}
