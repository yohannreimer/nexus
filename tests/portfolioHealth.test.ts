import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePortfolioHealth } from '../services/portfolioHealth';
import type {
  AgencyClient,
  AgencyClientAccountLink,
  ClientReportRun,
  ClientReportSettings,
  ClientWorkspaceSummary,
} from '../services/clientWorkspaceTypes';

test('automation off produces automation_off', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1', { deliveryEnabled: false })],
    runs: [],
    analyses: [],
  });

  assert.equal(result.summary.automation_off, 1);
  assert.equal(result.alerts[0].action, 'review_client');
});

test('no active linked accounts produces integration_broken alert and critical health', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1', { linkedAccounts: [] })],
    runs: [],
    analyses: [],
  });

  assert.equal(result.summary.integration_broken, 1);
  assert.equal(result.alerts[0].action, 'reconnect_integration');
  assert.equal(result.alerts[0].severity, 'critical');
});

test('failed latest report produces attention', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1')],
    runs: [run('r1', 'c1', 'failed', { createdAt: '2026-05-15T12:00:00.000Z' })],
    analyses: [],
  });

  assert.equal(result.summary.attention, 1);
  assert.equal(result.alerts[0].action, 'resend_report');
});

test('account disconnect warning produces critical alert', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1')],
    runs: [run('r1', 'c1', 'sent_with_warnings', { warnings: [{ type: 'account_disconnected' }] })],
    analyses: [],
  });

  assert.equal(result.summary.critical, 1);
  assert.equal(result.alerts[0].action, 'reconnect_integration');
});

test('spend without conversions over configured threshold produces alert', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1', { targetCpl: 50 })],
    runs: [run('r1', 'c1', 'sent', { spend: 320, conversions: 0 })],
    analyses: [],
  });

  assert.equal(result.summary.attention, 1);
  assert.equal(result.alerts.some((alert) => alert.action === 'validate_budget'), true);
});

test('healthy client with recent sent report produces healthy', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1')],
    runs: [run('r1', 'c1', 'sent', { spend: 100, conversions: 5 })],
    analyses: [],
  });

  assert.equal(result.summary.healthy, 1);
  assert.equal(result.alerts.length, 0);
});

test('conversion improvement creates opportunity', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1')],
    runs: [
      run('new', 'c1', 'sent', { createdAt: '2026-05-15T12:00:00.000Z', conversions: 10, spend: 200 }),
      run('old', 'c1', 'sent', { createdAt: '2026-05-08T12:00:00.000Z', conversions: 4, spend: 200 }),
    ],
    analyses: [],
  });

  assert.equal(result.opportunities.length, 1);
  assert.equal(result.opportunities[0].action, 'increase_budget');
});

test('missing recent daily memory creates monitoring alert before report history', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1')],
    runs: [],
    analyses: [],
    dailySnapshots: [],
    today: '2026-05-16',
  });

  assert.equal(result.summary.no_data, 1);
  assert.equal(result.alerts[0].id, 'c1:daily_memory_missing');
  assert.equal(result.alerts[0].title, 'Sem leitura diaria recente');
});

test('daily memory detects cost per conversion spike against recent baseline', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1')],
    runs: [],
    analyses: [],
    today: '2026-05-16',
    dailySnapshots: [
      snapshot('c1', '2026-05-12', 100, 5),
      snapshot('c1', '2026-05-13', 120, 6),
      snapshot('c1', '2026-05-14', 110, 5),
      snapshot('c1', '2026-05-15', 220, 3),
    ],
  });

  assert.equal(result.summary.attention, 1);
  assert.equal(result.alerts.some((alert) => alert.id === 'c1:cost_per_conversion_spike'), true);
});

test('daily memory detects repeated spend without conversions', () => {
  const result = evaluatePortfolioHealth({
    clients: [summary('c1')],
    runs: [],
    analyses: [],
    today: '2026-05-16',
    dailySnapshots: [
      snapshot('c1', '2026-05-13', 90, 0),
      snapshot('c1', '2026-05-14', 80, 0),
      snapshot('c1', '2026-05-15', 70, 0),
    ],
  });

  assert.equal(result.summary.attention, 1);
  assert.equal(result.actionQueue.some((alert) => alert.id === 'c1:three_day_spend_without_conversion'), true);
});

function summary(
  id: string,
  options: {
    deliveryEnabled?: boolean;
    linkedAccounts?: AgencyClientAccountLink[];
    targetCpl?: number;
  } = {},
): ClientWorkspaceSummary {
  const linkedAccounts = options.linkedAccounts ?? [link(id, 'a1')];
  const settings = settingsFor(id, options.deliveryEnabled ?? true, options.targetCpl);

  return {
    client: client(id),
    settings,
    linkedAccounts,
    accountCount: linkedAccounts.length,
    metaAccountCount: linkedAccounts.filter((item) => item.platform === 'meta').length,
    googleAccountCount: linkedAccounts.filter((item) => item.platform === 'google').length,
    nextSendLabel: settings.deliveryEnabled ? 'Diario as 08:00' : 'Nao configurado',
    health: linkedAccounts.length === 0 ? 'needs_accounts' : settings.deliveryEnabled ? 'ok' : 'automation_off',
  };
}

function client(id: string): AgencyClient {
  return {
    id,
    userId: 'u1',
    name: `Cliente ${id}`,
    status: 'active',
    primaryWhatsapp: null,
    internalOwner: null,
    notes: null,
    metadata: {},
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function link(clientId: string, accountId: string): AgencyClientAccountLink {
  return {
    id: `${clientId}-${accountId}`,
    userId: 'u1',
    clientId,
    accountId,
    platform: 'meta',
    isActive: true,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function settingsFor(clientId: string, deliveryEnabled: boolean, targetCpl?: number): ClientReportSettings {
  return {
    id: `settings-${clientId}`,
    userId: 'u1',
    clientId,
    defaultPeriod: 'last_30d',
    sendTime: '08:00',
    timezone: 'America/Sao_Paulo',
    deliveryEnabled,
    deliveryFrequency: 'daily',
    weeklyDay: null,
    monthlyDay: null,
    deliveryTarget: null,
    webhookUrl: null,
    defaultReportMode: 'executive',
    portalMode: 'executive',
    clientReportExposure: 'executive_safe',
    internalAiEnabled: true,
    briefingEnabled: true,
    reportTemplateSettings: targetCpl ? { targetCpl } : {},
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function run(
  id: string,
  clientId: string,
  status: ClientReportRun['status'],
  options: {
    createdAt?: string;
    warnings?: unknown[];
    spend?: number;
    conversions?: number;
  } = {},
): ClientReportRun {
  return {
    id,
    userId: 'u1',
    clientId,
    periodStart: '2026-05-01',
    periodEnd: '2026-05-15',
    status,
    reportMode: 'executive',
    executionType: 'scheduled',
    idempotencyKey: null,
    linkedAccountIds: ['a1'],
    deterministicMessage: null,
    reportHtml: null,
    pdfUrl: null,
    portalSnapshotUrl: null,
    webhookTarget: null,
    webhookResponse: {},
    attemptCount: 1,
    scheduledFor: null,
    warnings: options.warnings || [],
    platformsIncluded: ['meta'],
    summaryPayload: {
      metrics: {
        spend: options.spend ?? 100,
        conversions: options.conversions ?? 1,
      },
    },
    errorMessage: null,
    createdAt: options.createdAt || '2026-05-15T12:00:00.000Z',
    sentAt: status === 'sent' || status === 'sent_with_warnings' ? options.createdAt || '2026-05-15T12:00:00.000Z' : null,
  };
}

function snapshot(clientId: string, date: string, spend: number, conversions: number) {
  return {
    clientId,
    date,
    spend,
    impressions: 1000,
    clicks: 50,
    conversions,
    accountCount: 1,
    campaignCount: 2,
  };
}
