export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function parseGoalTargetDate(value: string): Date {
  if (value.includes('T')) {
    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  const date = parseDateKey(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function formatGoalTargetDate(value: string): string {
  const date = parseGoalTargetDate(value);
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function toDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  if (value.includes('T')) {
    return value.slice(0, 16);
  }

  return `${value}T23:59`;
}

export function formatLongDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(year, month - 1, day));
}

export function formatShortDate(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric'
  }).format(parseDateKey(dateKey));
}

export function formatMonthYear(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1));
}

export function getMonthKey(dateKey = getLocalDateKey()): string {
  return dateKey.slice(0, 7);
}

export function getNextMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const nextMonth = new Date(year, month, 1);
  return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(nextMonth);
}

export function getWeekStartKey(dateKey = getLocalDateKey()): string {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return getLocalDateKey(date);
}

export function getWeekDates(weekStartKey: string): string[] {
  const start = parseDateKey(weekStartKey);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return getLocalDateKey(date);
  });
}

export function formatWeekRange(weekStartKey: string): string {
  const dates = getWeekDates(weekStartKey);
  const first = parseDateKey(dates[0]);
  const last = parseDateKey(dates[6]);
  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();

  if (sameMonth) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      day: 'numeric'
    }).format(first) + ` - ${last.getDate()}, ${last.getFullYear()}`;
  }

  return (
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(first) +
    ' - ' +
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(last)
  );
}

export function getMonthDates(monthKey: string): string[] {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return Array.from({ length: last.getDate() }, (_, index) => {
    const date = new Date(first);
    date.setDate(index + 1);
    return getLocalDateKey(date);
  });
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

export function getMinutesRemaining(startedAt: string, timerMinutes: number): number {
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const totalMs = timerMinutes * 60 * 1000;
  return Math.max(0, Math.ceil((totalMs - elapsedMs) / 60000));
}
