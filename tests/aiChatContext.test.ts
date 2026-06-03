import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClientChatContext } from '../services/aiChatContext';
import type { AgencyClient, ClientAiAnalysis, ClientAiProfile, ClientReportRun } from '../services/clientWorkspaceTypes';

test('buildClientChatContext includes client, profile, latest report, latest analysis, and recent metrics', () => {
  const context = buildClientChatContext({
    client: client(),
    profile: profile(),
    reportRuns: [run('new', '2026-05-15T12:00:00.000Z'), run('old', '2026-05-01T12:00:00.000Z')],
    analyses: [analysis('a1', '2026-05-15T12:05:00.000Z')],
  });

  assert.equal(context.client.name, 'Cliente A');
  assert.equal(context.profile.objective, 'leads');
  assert.equal(context.latestReport.id, 'new');
  assert.equal(context.latestAnalysis.id, 'a1');
  assert.equal(context.recentMetrics.spend, 100);
  assert.equal(context.recentMetrics.conversions, 4);
});

test('buildClientChatContext excludes webhook URLs, tokens, raw OAuth data, and raw provider payload', () => {
  const context = buildClientChatContext({
    client: client(),
    profile: profile(),
    reportRuns: [run('new', '2026-05-15T12:00:00.000Z')],
    analyses: [analysis('a1', '2026-05-15T12:05:00.000Z')],
  });
  const serialized = JSON.stringify(context);

  assert.equal(serialized.includes('https://n8n.example/webhook'), false);
  assert.equal(serialized.includes('secret-token'), false);
  assert.equal(serialized.includes('oauth-raw'), false);
  assert.equal(serialized.includes('provider-raw'), false);
});

test('buildClientChatContext caps history to 10 report runs and 5 AI analyses', () => {
  const context = buildClientChatContext({
    client: client(),
    profile: profile(),
    reportRuns: Array.from({ length: 12 }, (_, index) => run(`run-${index}`, `2026-05-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`)),
    analyses: Array.from({ length: 7 }, (_, index) => analysis(`analysis-${index}`, `2026-05-${String(index + 1).padStart(2, '0')}T12:05:00.000Z`)),
  });

  assert.equal(context.reportRuns.length, 10);
  assert.equal(context.analyses.length, 5);
  assert.equal(context.reportRuns[0].id, 'run-11');
  assert.equal(context.analyses[0].id, 'analysis-6');
});

function client(): AgencyClient {
  return {
    id: 'client-1',
    userId: 'user-1',
    name: 'Cliente A',
    status: 'active',
    primaryWhatsapp: '5511999999999',
    internalOwner: 'Joao',
    notes: 'Cliente importante',
    metadata: { accessToken: 'secret-token' },
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function profile(): ClientAiProfile {
  return {
    id: 'profile-1',
    userId: 'user-1',
    clientId: 'client-1',
    objective: 'leads',
    tone: 'consultative',
    businessRules: { targetCpl: 50, rawOAuth: 'oauth-raw' },
    importantMetrics: ['spend', 'conversions'],
    exposureLevel: 'normal',
    internalAiEnabled: true,
    briefingEnabled: true,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function run(id: string, createdAt: string): ClientReportRun {
  return {
    id,
    userId: 'user-1',
    clientId: 'client-1',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-15',
    status: 'sent',
    reportMode: 'executive',
    executionType: 'scheduled',
    idempotencyKey: 'secret-token',
    linkedAccountIds: ['raw-account-id'],
    deterministicMessage: 'Resumo deterministico.',
    reportHtml: '<h1>Relatorio</h1>',
    pdfUrl: null,
    portalSnapshotUrl: null,
    webhookTarget: 'https://n8n.example/webhook',
    webhookResponse: { token: 'secret-token' },
    attemptCount: 1,
    scheduledFor: null,
    warnings: [],
    platformsIncluded: ['meta'],
    summaryPayload: {
      metrics: { spend: 100, conversions: 4 },
      accessToken: 'secret-token',
      rawOAuth: 'oauth-raw',
      webhookUrl: 'https://n8n.example/webhook',
    },
    errorMessage: null,
    createdAt,
    sentAt: createdAt,
  };
}

function analysis(id: string, createdAt: string): ClientAiAnalysis {
  return {
    id,
    userId: 'user-1',
    clientId: 'client-1',
    reportRunId: 'new',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-15',
    summary: 'Resumo da IA',
    positives: ['Bom volume'],
    attentionPoints: [],
    internalAlerts: [],
    recommendations: [{ action: 'Revisar verba', audience: 'agency' }],
    talkingPoints: ['Explicar resultado'],
    riskLevel: 'normal',
    opportunityLevel: 'high',
    rawAiPayload: { text: 'provider-raw' },
    provider: 'gemini',
    model: 'gemini-test',
    createdAt,
  };
}
