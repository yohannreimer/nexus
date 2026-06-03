import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReportIdempotencyKey,
  calculateReportPeriod,
  isReportDue,
  type ScheduleInput,
} from '../services/reportSchedule';

const baseSettings: ScheduleInput = {
  deliveryEnabled: true,
  deliveryFrequency: 'daily',
  sendTime: '08:00',
  timezone: 'America/Sao_Paulo',
  weeklyDay: null,
  monthlyDay: null,
};

test('daily report is due at 08:00 in America/Sao_Paulo', () => {
  assert.equal(isReportDue(baseSettings, instant('2026-05-15T11:00:20Z')), true);
  assert.equal(isReportDue(baseSettings, instant('2026-05-15T10:59:59Z')), false);
});

test('weekly report is due only on the selected weekday', () => {
  const settings: ScheduleInput = {
    ...baseSettings,
    deliveryFrequency: 'weekly',
    weeklyDay: 5,
  };

  assert.equal(isReportDue(settings, instant('2026-05-15T11:00:00Z')), true);
  assert.equal(isReportDue(settings, instant('2026-05-16T11:00:00Z')), false);
});

test('monthly day 31 is clamped to the last day of shorter months', () => {
  const settings: ScheduleInput = {
    ...baseSettings,
    deliveryFrequency: 'monthly',
    monthlyDay: 31,
  };

  assert.equal(isReportDue(settings, instant('2026-02-28T11:00:00Z')), true);
  assert.equal(isReportDue(settings, instant('2026-02-27T11:00:00Z')), false);
});

test('invalid monthly days are not due', () => {
  const settings: ScheduleInput = {
    ...baseSettings,
    deliveryFrequency: 'monthly',
    monthlyDay: 99,
  };

  assert.equal(isReportDue(settings, instant('2026-02-28T11:00:00Z')), false);
});

test('malformed send times are not due', () => {
  assert.equal(
    isReportDue(
      {
        ...baseSettings,
        sendTime: '08:00abc',
      },
      instant('2026-05-15T11:00:00Z'),
    ),
    false,
  );
  assert.equal(
    isReportDue(
      {
        ...baseSettings,
        sendTime: '08:000',
      },
      instant('2026-05-15T11:00:00Z'),
    ),
    false,
  );
});

test('invalid timezone does not crash schedule checks', () => {
  assert.doesNotThrow(() => {
    assert.equal(
      isReportDue(
        {
          ...baseSettings,
          timezone: 'Invalid/Timezone',
        },
        instant('2026-05-15T11:00:00Z'),
      ),
      false,
    );
  });
});

test('disabled delivery is never due', () => {
  assert.equal(
    isReportDue(
      {
        ...baseSettings,
        deliveryEnabled: false,
      },
      instant('2026-05-15T11:00:00Z'),
    ),
    false,
  );
});

test('calculateReportPeriod returns timezone-local ISO date ranges', () => {
  const now = instant('2026-05-15T11:30:00Z');

  assert.deepEqual(calculateReportPeriod('today', now, 'America/Sao_Paulo'), {
    start: '2026-05-15',
    end: '2026-05-15',
  });
  assert.deepEqual(calculateReportPeriod('yesterday', now, 'America/Sao_Paulo'), {
    start: '2026-05-14',
    end: '2026-05-14',
  });
  assert.deepEqual(calculateReportPeriod('last_7d', now, 'America/Sao_Paulo'), {
    start: '2026-05-09',
    end: '2026-05-15',
  });
  assert.deepEqual(calculateReportPeriod('last_30d', now, 'America/Sao_Paulo'), {
    start: '2026-04-16',
    end: '2026-05-15',
  });
  assert.deepEqual(calculateReportPeriod('last_60d', now, 'America/Sao_Paulo'), {
    start: '2026-03-17',
    end: '2026-05-15',
  });
});

test('calculateReportPeriod falls back to America/Sao_Paulo for invalid timezone', () => {
  assert.deepEqual(calculateReportPeriod('today', instant('2026-05-15T02:30:00Z'), 'Invalid/Timezone'), {
    start: '2026-05-14',
    end: '2026-05-14',
  });
});

test('buildReportIdempotencyKey is stable across matching inputs', () => {
  const input = {
    clientId: 'client_123',
    frequency: 'weekly' as const,
    scheduledFor: '2026-05-15T11:00:00.000Z',
    periodStart: '2026-05-09',
    periodEnd: '2026-05-15',
  };

  assert.equal(
    buildReportIdempotencyKey(input),
    'client_123:weekly:2026-05-15T11:00:00.000Z:2026-05-09:2026-05-15',
  );
  assert.equal(buildReportIdempotencyKey(input), buildReportIdempotencyKey({ ...input }));
});

function instant(value: string): Date {
  return new Date(value);
}
