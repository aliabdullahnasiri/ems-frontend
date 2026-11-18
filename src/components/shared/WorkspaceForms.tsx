import { waitForSubmissionFeedback } from '../../utils/submissionDelay';
import { createContext, useContext, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography, type TextFieldProps } from '@mui/material';
import { AttachFileOutlined, CloseRounded, UploadFileOutlined } from '@mui/icons-material';
import { ApiError } from '../../api/client';
import { useAuthText } from '../auth/text';
import { useLocale } from '../../i18n/locale';

const DialogContext = createContext<{ close: () => void; setBusy: (busy: boolean) => void; destructive: boolean } | null>(null);
const FormContext = createContext<{ errors: Record<string, string>; clear: (name: string) => void }>({ errors: {}, clear: () => {} });

export function WorkspaceField({ name, helperText, maxLength, ...props }: TextFieldProps & { name: string; maxLength?: number }) {
  const { errors, clear } = useContext(FormContext);
  return <TextField {...props} name={name} fullWidth error={!!errors[name]} helperText={errors[name] || helperText}
    onChange={event => { clear(name); props.onChange?.(event); }}
    slotProps={{ htmlInput: { maxLength }, formHelperText: { role: errors[name] ? 'alert' : undefined } }} />;
}
export function WorkspaceFileField() {
  const t = useAuthText();
  const { errors, clear } = useContext(FormContext);
  const id = useId();
  const [filename, setFilename] = useState('');
  return <Box>
    <Stack component="label" direction="row" spacing={2} sx={{
      position: 'relative', alignItems: 'center', p: 2, border: 1, borderStyle: 'dashed',
      borderRadius: '12px', borderColor: errors.file ? 'error.main' : 'divider',
      bgcolor: 'action.hover', cursor: 'pointer',
      '&:has(input:not(:disabled)):hover': { borderColor: errors.file ? 'error.main' : 'primary.main' },
      '&:focus-within': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      '&:has(input:disabled)': { cursor: 'default', opacity: 0.65 },
    }}>
      <Box sx={{
        display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0,
        border: 1, borderColor: 'divider', borderRadius: '10px', color: 'primary.main',
      }}>
        {filename ? <AttachFileOutlined /> : <UploadFileOutlined />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap dir={filename ? 'auto' : undefined} title={filename || undefined}>
          {filename || t('chooseUploadFile')}
        </Typography>
        <Typography id={id} variant="body2" color="text.secondary">
          {filename ? t('replaceUploadFile') : t('uploadFileFormats')}
        </Typography>
      </Box>
      <Box component="input" type="file" name="file" required accept="application/pdf,image/png,image/jpeg"
        aria-label={t('uploadFile')} aria-invalid={!!errors.file}
        aria-describedby={errors.file ? id + ' ' + id + '-error' : id}
        onChange={event => {
          setFilename(event.currentTarget.files?.[0]?.name ?? '');
          clear('file');
        }}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'inherit' }} />
    </Stack>
    {errors.file && <Typography id={id + '-error'} role="alert" variant="body2" color="error.main" sx={{ mt: 1 }}>
      {errors.file}
    </Typography>}
  </Box>;
}

export function Edit({ title, children, save, done }: { title: string; children?: ReactNode; save: (data: FormData) => Promise<unknown>; done?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const t = useAuthText();
  const dialog = useContext(DialogContext);
  function validate(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
    if (input.disabled || !input.name || ['checkbox', 'radio', 'submit', 'button'].includes(input.type)) return '';
    if (input instanceof HTMLInputElement && input.type === 'file') {
      const file = input.files?.[0];
      if (!file) return input.required ? t('requiredField') : '';
      if (file.size === 0 || file.size > 5 * 1024 * 1024) return t('invalidFileSize');
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) return t('invalidFileType');
      return '';
    }
    const value = input.value.trim();
    if (input.required && !value) return t('requiredField');
    if (!value) return '';
    if ('maxLength' in input && input.maxLength > 0 && value.length > input.maxLength) return t('maximumLength').replace('{count}', String(input.maxLength));
    if (input.name === 'slug' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return t('invalidSlug');
    if (['uuid', 'user_uuid'].includes(input.name) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return t('invalidUuid');
    if (input.name === 'preferred_language' && !['en', 'fa', 'ps'].includes(value)) return t('invalidLanguage');
    return '';
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const issues: Record<string, string> = {};
    for (const input of Array.from(form.elements)) {
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) continue;
      const error = validate(input);
      if (error) issues[input.name] = error;
    }
    setErrors(issues); setMessage('');
    if (Object.keys(issues).length) { (form.elements.namedItem(Object.keys(issues)[0]) as HTMLElement | null)?.focus(); return; }
    const data = new FormData(form);
    for (const input of form.querySelectorAll<HTMLInputElement>('input[type="file"][name]:not(:disabled)')) {
      const file = input.files?.[0];
      if (file) data.set(input.name, file);
    }
    lock.current = true; setBusy(true); dialog?.setBusy(true);
    try { await waitForSubmissionFeedback(); await save(data); done?.(); dialog?.close(); }
    catch (failure) {
      if (failure instanceof ApiError) {
        setErrors(failure.fields);
        (form.elements.namedItem(Object.keys(failure.fields)[0] || '') as HTMLElement | null)?.focus();
      }
      setMessage(failure instanceof Error ? failure.message : t('retry'));
    } finally { lock.current = false; setBusy(false); dialog?.setBusy(false); }
  }
  return <Box component="form" noValidate aria-busy={busy} onSubmit={submit}
    onBlur={event => {
      const input = event.target;
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
        const error = validate(input);
        setErrors(current => ({ ...current, [input.name]: error }));
      }
    }} sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
    <DialogContent sx={{ pt: 2 }}><FormContext.Provider value={{ errors, clear: name => setErrors(current => ({ ...current, [name]: '' })) }}>
      <Stack component="fieldset" disabled={busy} spacing={2.5} sx={{ p: 0, m: 0, border: 0, minWidth: 0 }}>{children}</Stack>
    </FormContext.Provider>{message && <Alert severity="error" sx={{ mt: 2 }}>{message}</Alert>}</DialogContent>
    <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', gap: 1 }}>
      {dialog && <Button color="inherit" disabled={busy} onClick={dialog.close}>{t('cancel')}</Button>}
      <Button type="submit" variant="contained" color={dialog?.destructive ? 'error' : 'primary'} loading={busy} disabled={busy}>{title}</Button>
    </DialogActions>
  </Box>;
}

export function ActionDialog({ title, children, icon, destructive = false, primary = false, fullWidth = false, compact = false, tabIndex }: {
  title: string; children: ReactNode; icon?: ReactNode; destructive?: boolean; primary?: boolean; fullWidth?: boolean; compact?: boolean; tabIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const { t } = useLocale();
  const close = () => setOpen(false);
  return <>
    {compact && icon ? <Tooltip title={title}><IconButton aria-label={title} tabIndex={tabIndex} color={destructive ? 'error' : 'primary'} onClick={() => setOpen(true)} sx={{ width: 40, height: 40 }}>{icon}</IconButton></Tooltip> :
      <Button variant={primary ? 'contained' : 'outlined'} color={destructive ? 'error' : 'primary'} fullWidth={fullWidth} startIcon={icon} onClick={() => setOpen(true)} sx={{ flexShrink: 0 }}>{title}</Button>}
    <Dialog open={open} onClose={() => { if (!busy) close(); }} fullWidth maxWidth="sm" aria-labelledby={id}>
      <DialogTitle id={id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, pb: 1 }}>{title}<IconButton aria-label={t('close')} disabled={busy} onClick={close} edge="end"><CloseRounded /></IconButton></DialogTitle>
      <DialogContext.Provider value={{ close, setBusy, destructive }}>{children}</DialogContext.Provider>
    </Dialog>
  </>;
}
