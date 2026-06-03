import type { ClientDeliveryFrequency, ClientReportPeriod } from './clientWorkspaceTypes';

export type ScheduleInput = {
  deliveryEnabled: boolean;
  deliveryFrequency: ClientDeliveryFrequency;
  sendTime: string;
  timezone: string;
  weeklyDay: number | null;
  monthlyDay: number | null;
};

export type IdempotencyInput = {
  clientId: string;
  frequency: ClientDeliveryFrequency;
  scheduledFor: string;
  periodStart: string;
  periodEnd: string;
};

type TimezoneDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const PERIOD_DAYS: Partial<Record<ClientReportPeriod, number>> = {
  last_7d: 7,
  last_30d: 30,
  last_60d: 60,
};

export function isReportDue(settings: ScheduleInput, now: Date = new Date()): boolean {
  if (!settings.deliveryEnabled) {
    return false;
  }

  const localNow = getTimezoneDateParts(now, settings.timezone);
  if (!localNow) {
    return false;
  }

  const sendTime = parseSendTime(settings.sendTime);

  if (!sendTime || localNow.hour !== sendTime.hour || localNow.minute !== sendTime.minute) {
    return false;
  }

  if (settings.deliveryFrequency === 'weekly') {
    return settings.weeklyDay !== null && getWeekday(localNow) === settings.weeklyDay;
  }

  if (settings.deliveryFrequency === 'monthly') {
    if (settings.monthlyDay === null || settings.monthlyDay < 1 || settings.monthlyDay > 31) {
      return false;
    }

    const dueDay = Math.min(settings.monthlyDay, getMonthLength(localNow.year, localNow.month));
    return localNow.day === dueDay;
  }

  return true;
}

export function calculateReportPeriod(
  period: ClientReportPeriod,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
): { start: string; end: string } {
  const localNow = getTimezoneDateParts(now, timezone) ?? getTimezoneDateParts(now, DEFAULT_TIMEZONE);
  if (!localNow) {
    throw new RangeError(`Invalid fallback timezone: ${DEFAULT_TIMEZONE}`);
  }

  const endDate = toDateOnly(localNow);

  if (period === 'yesterday') {
    const yesterday = addDays(endDate, -1);
    return { start: formatDateOnly(yesterday), end: formatDateOnly(yesterday) };
  }

  const days = PERIOD_DAYS[period];
  if (days) {
    return {
      start: formatDateOnly(addDays(endDate, -(days - 1))),
      end: formatDateOnly(endDate),
    };
  }

  return { start: formatDateOnly(endDate), end: formatDateOnly(endDate) };
}

export function buildReportIdempotencyKey(input: IdempotencyInput): string {
  return [
    input.clientId,
    input.frequency,
    input.scheduledFor,
    input.periodStart,
    input.periodEnd,
  ].join(':');
}

function getTimezoneDateParts(date: Date, timezone: string): TimezoneDateParts | null {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return null;
    }

    throw error;
  }

  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function parseSendTime(sendTime: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(sendTime);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function getWeekday(parts: Pick<TimezoneDateParts, 'year' | 'month' | 'day'>): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function getMonthLength(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toDateOnly(parts: Pick<TimezoneDateParts, 'year' | 'month' | 'day'>): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
