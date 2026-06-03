import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAvailableAccounts,
  buildClientSummaryHealth,
  mapAgencyAiBriefing,
  mapClientAiAnalysis,
  mapClientAiProfile,
  mapClientPortal,
  mapClientReportRun,
  mapClientReportSettings,
  mergeClientReportSettingsInput,
  mapPlatformAccount,
} from '../services/clientWorkspaceApi';
import type { AgencyClient, AgencyClientAccountLink, ClientReportSettings } from '../services/clientWorkspaceTypes';
import type { PlatformAccount } from '../services/platformTypes';

test('buildAvailableAccounts marks account ownership by client', () => {
  const accounts: PlatformAccount[] = [
    account('a1', 'meta', 'Conta 1'),
    account('a2', 'google', 'Conta 2'),
  ];
  const clients = [client('c1', 'Cliente A')];
  const links: AgencyClientAccountLink[] = [link('l1', 'c1', 'a1', 'meta')];

  const result = buildAvailableAccounts(accounts, clients, links);

  assert.equal(result[0].linkedClientId, 'c1');
  assert.equal(result[0].linkedClientName, 'Cliente A');
  assert.equal(result[1].linkedClientId, null);
  assert.equal(result[1].linkedClientName, null);
});

test('buildClientSummaryHealth identifies missing accounts before automation state', () => {
  assert.equal(buildClientSummaryHealth([], enabledSettings()), 'needs_accounts');
  assert.equal(buildClientSummaryHealth([link('l1', 'c1', 'a1', 'meta')], null), 'automation_off');
  assert.equal(buildClientSummaryHealth([link('l1', 'c1', 'a1', 'meta')], enabledSettings()), 'ok');
});

test('mapPlatformAccount keeps database id separate from external account id', () => {
  const result = mapPlatformAccount({
    id: 'db-account-uuid',
    platform: 'meta',
    external_account_id: 'act_123',
    name: 'Conta DB',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    status: 'active',
    is_active: true,
    metadata: { graphId: 'act_123' },
  });

  assert.equal(result.id, 'db-account-uuid');
  assert.equal(result.externalAccountId, 'act_123');
  assert.equal(result.name, 'Conta DB');
});

test('mapClientReportSettings fills intelligence defaults for existing rows', () => {
  const settings = mapClientReportSettings({
    id: 'settings-1',
    user_id: 'u1',
    client_id: 'c1',
    default_period: 'last_30d',
    send_time: '08:00',
    timezone: 'America/Sao_Paulo',
    delivery_enabled: true,
    delivery_frequency: null,
    weekly_day: null,
    monthly_day: null,
    delivery_target: '5511999999999',
    webhook_url: null,
    default_report_mode: 'executive',
    created_at: '2026-05-15T00:00:00.000Z',
    updated_at: '2026-05-15T00:00:00.000Z',
  });

  assert.equal(settings.portalMode, 'executive');
  assert.equal(settings.clientReportExposure, 'executive_safe');
  assert.equal(settings.internalAiEnabled, false);
  assert.equal(settings.briefingEnabled, false);
  assert.deepEqual(settings.reportTemplateSettings, {});
});

test('mapClientReportRun fills intelligence defaults for existing rows', () => {
  const run = mapClientReportRun({
    id: 'run-1',
    user_id: 'u1',
    client_id: 'c1',
    period_start: '2026-05-01',
    period_end: '2026-05-15',
    status: 'generated',
    report_mode: 'executive',
    platforms_included: null,
    summary_payload: null,
    error_message: null,
    created_at: '2026-05-15T00:00:00.000Z',
    sent_at: null,
  });

  assert.equal(run.executionType, 'manual');
  assert.equal(run.attemptCount, 0);
  assert.deepEqual(run.warnings, []);
  assert.equal(run.webhookTarget, null);
  assert.deepEqual(run.webhookResponse, {});
});

test('mergeClientReportSettingsInput preserves existing automation fields for partial updates', () => {
  const merged = mergeClientReportSettingsInput(enabledSettings(), { internalAiEnabled: true });

  assert.equal(merged.defaultPeriod, 'yesterday');
  assert.equal(merged.sendTime, '08:00');
  assert.equal(merged.timezone, 'America/Sao_Paulo');
  assert.equal(merged.deliveryEnabled, true);
  assert.equal(merged.deliveryFrequency, 'daily');
  assert.equal(merged.deliveryTarget, '5511999999999');
  assert.equal(merged.webhookUrl, null);
  assert.equal(merged.defaultReportMode, 'executive');
  assert.equal(merged.internalAiEnabled, true);
});

test('intelligence mappers convert portal, profile, analysis, and briefing rows', () => {
  const portal = mapClientPortal({
    id: 'portal-1',
    user_id: 'u1',
    client_id: 'c1',
    slug: 'cliente-a',
    status: 'active',
    mode: 'complete',
    branding: { color: '#111111' },
    visibility_settings: { reports: true },
    access_settings: { password: false },
    created_at: '2026-05-15T00:00:00.000Z',
    updated_at: '2026-05-15T01:00:00.000Z',
  });
  const profile = mapClientAiProfile({
    id: 'profile-1',
    user_id: 'u1',
    client_id: 'c1',
    objective: 'sales',
    tone: 'premium',
    business_rules: { margin: 'high' },
    important_metrics: ['roas', 'cpa'],
    exposure_level: 'detailed',
    internal_ai_enabled: true,
    briefing_enabled: true,
    created_at: '2026-05-15T00:00:00.000Z',
    updated_at: '2026-05-15T01:00:00.000Z',
  });
  const analysis = mapClientAiAnalysis({
    id: 'analysis-1',
    user_id: 'u1',
    client_id: 'c1',
    report_run_id: 'run-1',
    period_start: '2026-05-01',
    period_end: '2026-05-15',
    summary: 'Resumo',
    positives: ['crescimento'],
    attention_points: ['cpa'],
    internal_alerts: [],
    recommendations: ['otimizar'],
    talking_points: ['explicar teste'],
    risk_level: 'attention',
    opportunity_level: 'high',
    raw_ai_payload: { providerResponse: true },
    provider: 'openai',
    model: 'gpt-test',
    created_at: '2026-05-15T00:00:00.000Z',
  });
  const briefing = mapAgencyAiBriefing({
    id: 'briefing-1',
    user_id: 'u1',
    briefing_date: '2026-05-15',
    portfolio_summary: { spend: 100 },
    client_priorities: ['c1'],
    alerts: ['alerta'],
    opportunities: ['oportunidade'],
    generated_text: 'Bom dia',
    provider: 'openai',
    model: 'gpt-test',
    created_at: '2026-05-15T00:00:00.000Z',
  });

  assert.equal(portal.visibilitySettings.reports, true);
  assert.deepEqual(profile.importantMetrics, ['roas', 'cpa']);
  assert.equal(analysis.riskLevel, 'attention');
  assert.equal(briefing.briefingDate, '2026-05-15');
});

function account(id: string, platform: 'meta' | 'google', name: string): PlatformAccount {
  return {
    id,
    platform,
    externalAccountId: id,
    name,
    currency: 'BRL',
    status: 'active',
    isConfigured: false,
    selectedCampaignIds: [],
  };
}

function client(id: string, name: string): AgencyClient {
  return {
    id,
    userId: 'u1',
    name,
    status: 'active',
    primaryWhatsapp: null,
    internalOwner: null,
    notes: null,
    metadata: {},
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function link(id: string, clientId: string, accountId: string, platform: 'meta' | 'google'): AgencyClientAccountLink {
  return {
    id,
    userId: 'u1',
    clientId,
    accountId,
    platform,
    isActive: true,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function enabledSettings(): ClientReportSettings {
  return {
    id: 's1',
    userId: 'u1',
    clientId: 'c1',
    defaultPeriod: 'yesterday',
    sendTime: '08:00',
    timezone: 'America/Sao_Paulo',
    deliveryEnabled: true,
    deliveryFrequency: 'daily',
    weeklyDay: null,
    monthlyDay: null,
    deliveryTarget: '5511999999999',
    webhookUrl: null,
    defaultReportMode: 'executive',
    portalMode: 'executive',
    clientReportExposure: 'executive_safe',
    internalAiEnabled: false,
    briefingEnabled: false,
    reportTemplateSettings: {},
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}
