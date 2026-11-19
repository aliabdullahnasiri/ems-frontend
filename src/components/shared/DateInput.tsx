import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/fa';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { faIR } from '@mui/x-date-pickers/locales';
import type { DateValidationError } from '@mui/x-date-pickers/models';
import { useLocale } from '../../i18n/locale';

const pashtoCalendarName = (options: Intl.DateTimeFormatOptions, date: Date) =>
 new Intl.DateTimeFormat('ps', { ...options, calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' }).format(date);

dayjs.locale({
 name: 'ps',
 formats: { L: 'DD/MM/YYYY' },
 relativeTime: {},
 weekStart: 6,
 months: Array.from({ length: 12 }, (_, month) => pashtoCalendarName({ month: 'long' }, new Date(Date.UTC(2024, month, 1)))),
 weekdays: Array.from({ length: 7 }, (_, day) => pashtoCalendarName({ weekday: 'long' }, new Date(Date.UTC(2024, 0, 7 + day)))),
}, undefined, true);

export function DateInput({ label, value, onChange, error, maxDate, minDate, disabled }: {
 label: string;
 value: Dayjs | null;
 onChange: (value: Dayjs | null, error: DateValidationError) => void;
 error?: string;
 maxDate?: Dayjs;
 minDate?: Dayjs;
 disabled?: boolean;
}) {
 const { locale, t } = useLocale();
 return <LocalizationProvider dateAdapter={AdapterDayjs}
  adapterLocale={locale}
  localeText={{
   ...(locale === 'fa' ? faIR.components.MuiLocalizationProvider.defaultProps.localeText : {}),
   cancelButtonLabel: t('cancel'),
   okButtonLabel: t('confirm'),
   clearButtonLabel: t('clearDate'),
   openDatePickerDialogue: () => t('chooseDate'),
  }}>
  <DatePicker label={label} value={value} format="DD MMM YYYY" disabled={disabled}
   minDate={minDate} maxDate={maxDate}
   onChange={(date, context) => onChange(date, context.validationError)}
   slotProps={{
    openPickerButton: { edge: false },
    actionBar: { actions: ['clear', 'cancel', 'accept'] },
    textField: { fullWidth: true, ...(error ? { error: true, helperText: error } : {}) },
   }}/>
 </LocalizationProvider>;
}
