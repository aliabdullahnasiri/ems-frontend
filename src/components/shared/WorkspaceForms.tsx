import { createContext, useContext, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, type TextFieldProps } from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
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
  return <Box><input type="file" aria-label={t('uploadFile')} name="file" required accept="application/pdf,image/png,image/jpeg"
    aria-invalid={!!errors.file} aria-describedby={errors.file ? id : undefined} onChange={() => clear('file')} />
    {errors.file && <Box id={id} role="alert" sx={{ mt: 1, color: 'error.main', fontSize: 13 }}>{errors.file}</Box>}</Box>;
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
    const value = input.value.trim();
    if (input.required && !value) return t('requiredField');
    if (!value) return '';
    if ('maxLength' in input && input.maxLength > 0 && value.length > input.maxLength) return t('maximumLength').replace('{count}', String(input.maxLength));
    if (input.name === 'slug' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return t('invalidSlug');
    if (input.name === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return t('invalidUuid');
    if (input.name === 'user_id' && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0)) return t('invalidUserId');
    if (input.name === 'preferred_language' && !['en', 'fa', 'ps'].includes(value)) return t('invalidLanguage');
    if (input instanceof HTMLInputElement && input.type === 'file' && input.files?.[0] && !['application/pdf', 'image/png', 'image/jpeg'].includes(input.files[0].type)) return t('invalidFileType');
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
    lock.current = true; setBusy(true); dialog?.setBusy(true);
    try { await save(data); done?.(); dialog?.close(); }
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
      <Button type="submit" variant="contained" color={dialog?.destructive ? 'error' : 'primary'} loading={busy}>{title}</Button>
    </DialogActions>
  </Box>;
}

export function ActionDialog({ title, children, icon, destructive = false, primary = false, fullWidth = false, compact = false }: {
  title: string; children: ReactNode; icon?: ReactNode; destructive?: boolean; primary?: boolean; fullWidth?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const { t } = useLocale();
  const close = () => setOpen(false);
  return <>
    {compact && icon ? <Tooltip title={title}><IconButton aria-label={title} color={destructive ? 'error' : 'primary'} onClick={() => setOpen(true)} sx={{ width: 40, height: 40 }}>{icon}</IconButton></Tooltip> :
      <Button variant={primary ? 'contained' : 'outlined'} color={destructive ? 'error' : 'primary'} fullWidth={fullWidth} startIcon={icon} onClick={() => setOpen(true)} sx={{ flexShrink: 0 }}>{title}</Button>}
    <Dialog open={open} onClose={() => { if (!busy) close(); }} fullWidth maxWidth="sm" aria-labelledby={id}>
      <DialogTitle id={id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, pb: 1 }}>{title}<IconButton aria-label={t('close')} disabled={busy} onClick={close} edge="end"><CloseRounded /></IconButton></DialogTitle>
      <DialogContext.Provider value={{ close, setBusy, destructive }}>{children}</DialogContext.Provider>
    </Dialog>
  </>;
}
