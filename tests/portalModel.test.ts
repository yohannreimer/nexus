import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPortalSlug,
  defaultPortalVisibility,
  sanitizePortalPayload,
} from '../services/portalModel';
import type { ClientPortal, ClientReportRun } from '../services/clientWorkspaceTypes';

test('buildPortalSlug removes accents and normalizes client names', () => {
  assert.equal(buildPortalSlug('Clínica Estética Premium'), 'clinica-estetica-premium');
  assert.equal(buildPortalSlug('  João & Filhos - Ads  '), 'joao-filhos-ads');
  assert.equal(buildPortalSlug('!!!'), 'cliente');
});

test('defaultPortalVisibility keeps essential portal compact', () => {
  const visibility = defaultPortalVisibility('essential');

  assert.equal(visibility.kpis, true);
  assert.equal(visibility.history, true);
  assert.equal(visibility.campaigns, false);
  assert.equal(visibility.detailedCharts, false);
  assert.equal(visibility.platformBreakdown, false);
});

test('defaultPortalVisibility configures executive portal for client-facing reports', () => {
  const visibility = defaultPortalVisibility('executive');

  assert.equal(visibility.kpis, true);
  assert.equal(visibility.comparison, true);
  assert.equal(visibility.simpleChart, true);
  assert.equal(visibility.history, true);
  assert.equal(visibility.campaigns, false);
  assert.equal(visibility.detailedCharts, false);
});

test('defaultPortalVisibility configures complete portal with full report sections', () => {
  const visibility = defaultPortalVisibility('complete');

  assert.equal(visibility.kpis, true);
  assert.equal(visibility.platformBreakdown, true);
  assert.equal(visibility.campaigns, true);
  assert.equal(visibility.simpleChart, true);
  assert.equal(visibility.detailedCharts, true);
  assert.equal(visibility.history, true);
});

test('sanitizePortalPayload excludes internal and credential-like fields', () => {
  const payload = sanitizePortalPayload({
    clientName: 'Cliente Seguro',
    portal: portal(),
    latestRun: reportRun(),
  });
  const serialized = JSON.stringify(payload);

  assert.equal(payload.clientName, 'Cliente Seguro');
  assert.deepEqual(payload.portal, {
    slug: 'cliente-seguro',
    status: 'active',
    mode: 'executive',
    branding: { accentColor: '#6366f1' },
    visibility: {
      ...defaultPortalVisibility('executive'),
      campaigns: true,
    },
  });
  assert.equal(payload.latestReport.periodStart, '2026-05-01');
  assert.equal(payload.latestReport.periodEnd, '2026-05-15');
  assert.equal(payload.latestReport.status, 'sent');
  assert.equal(serialized.includes('access-token'), false);
  assert.equal(serialized.includes('refresh-token'), false);
  assert.equal(serialized.includes('act_123'), false);
  assert.equal(serialized.includes('https://n8n.example/webhook'), false);
  assert.equal(serialized.includes('internal-recommendation'), false);
  assert.equal(serialized.includes('raw-provider-payload'), false);
});

function portal(): ClientPortal {
  return {
    id: 'portal-1',
    userId: 'user-1',
    clientId: 'client-1',
    slug: 'cliente-seguro',
    status: 'active',
    mode: 'executive',
    branding: { accentColor: '#6366f1' },
    visibilitySettings: { campaigns: true },
    accessSettings: { password: 'secret' },
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function reportRun(): ClientReportRun {
  return {
    id: 'run-1',
    userId: 'user-1',
    clientId: 'client-1',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-15',
    status: 'sent',
    reportMode: 'executive',
    executionType: 'scheduled',
    idempotencyKey: 'client-1:2026-05-01',
    linkedAccountIds: ['internal-account-id'],
    deterministicMessage: 'Resumo público do período.',
    reportHtml: '<h1>Relatório</h1>',
    pdfUrl: 'https://cdn.example/report.pdf',
    portalSnapshotUrl: 'https://portal.example/cliente-seguro',
    webhookTarget: 'https://n8n.example/webhook',
    webhookResponse: { ok: true },
    attemptCount: 1,
    scheduledFor: '2026-05-15T11:00:00.000Z',
    warnings: [],
    platformsIncluded: ['google', 'meta'],
    summaryPayload: {
      spend: 100,
      clicks: 20,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      externalAccountId: 'act_123',
      webhookUrl: 'https://n8n.example/webhook',
      recommendations: ['internal-recommendation'],
      rawAiPayload: { text: 'raw-provider-payload' },
      nested: {
        safeMetric: 42,
        rawAccountId: 'act_123',
      },
    },
    errorMessage: null,
    createdAt: '2026-05-15T11:00:00.000Z',
    sentAt: '2026-05-15T11:01:00.000Z',
  };
}
