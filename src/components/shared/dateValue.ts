import dayjs from 'dayjs';

export const dateFormat = 'YYYY-MM-DD';

export function parseDate(value: string | null | undefined) {
 return value ? dayjs(value) : null;
}
