export const DEFAULT_TIME_ZONE = 'Africa/Cairo';

const pad = (value: number) => String(value).padStart(2, '0');

const getFormatter = (timeZone: string) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const getDateKeyInTimeZone = (
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE
): string => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  if (!year || !month || !day) {
    return getFormatter(timeZone).format(date);
  }
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey: string): { year: number; month: number; day: number } => {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  return {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
  };
};

export const dateFromDateKey = (dateKey: string): Date => {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

export const dateKeyFromUtcDate = (date: Date): string => {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const shiftDateKey = (dateKey: string, days: number): string => {
  const date = dateFromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKeyFromUtcDate(date);
};

export const getDayOfWeekFromDateKey = (dateKey: string): number => {
  return dateFromDateKey(dateKey).getUTCDay();
};

export const getLocalTimestampForDateKey = (
  dateKey: string,
  hour: number,
  minute: number = 0
): number => {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
};
