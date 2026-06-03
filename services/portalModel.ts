import type { ClientPortal, ClientPortalMode, ClientReportRun } from './clientWorkspaceTypes';

type PortalVisibility = Record<string, boolean>;

const INTERNAL_PAYLOAD_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'token',
  'webhookUrl',
  'webhookTarget',
  'webhookResponse',
  'externalAccountId',
  'external_account_id',
  'rawAccountId',
  'raw_account_id',
  'accountId',
  'account_id',
  'linkedAccountIds',
  'linked_account_ids',
  'rawAiPayload',
  'raw_ai_payload',
  'internalRecommendations',
  'internal_recommendations',
  'recommendations',
]);

export function buildPortalSlug(clientName: string): string {
  const slug = clientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'cliente';
}

export function defaultPortalVisibility(mode: ClientPortalMode): PortalVisibility {
  const base: PortalVisibility = {
    kpis: true,
    comparison: false,
    simpleChart: false,
    history: true,
    platformBreakdown: false,
    campaigns: false,
    detailedCharts: false,
  };

  if (mode === 'essential') return base;

  if (mode === 'complete') {
    return {
      ...base,
      comparison: true,
      simpleChart: true,
      platformBreakdown: true,
      campaigns: true,
      detailedCharts: true,
    };
  }

  return {
    ...base,
    comparison: true,
    simpleChart: true,
  };
}

export function sanitizePortalPayload(input: {
  clientName: string;
  portal: ClientPortal;
  latestRun: ClientReportRun | null;
}): Record<string, unknown> {
  const visibility = {
    ...defaultPortalVisibility(input.portal.mode),
    ...toBooleanRecord(input.portal.visibilitySettings),
  };

  return {
    clientName: input.clientName,
    portal: {
      slug: input.portal.slug,
      status: input.portal.status,
      mode: input.portal.mode,
      branding: sanitizeRecord(input.portal.branding),
      visibility,
    },
    latestReport: input.latestRun ? sanitizeLatestReport(input.latestRun) : null,
  };
}

function sanitizeLatestReport(run: ClientReportRun): Record<string, unknown> {
  return {
    periodStart: run.periodStart,
    periodEnd: run.periodEnd,
    status: run.status,
    reportMode: run.reportMode,
    deterministicMessage: run.deterministicMessage,
    reportHtml: run.reportHtml,
    pdfUrl: run.pdfUrl,
    portalSnapshotUrl: run.portalSnapshotUrl,
    platformsIncluded: run.platformsIncluded,
    summary: sanitizeUnknown(run.summaryPayload),
    sentAt: run.sentAt,
    createdAt: run.createdAt,
  };
}

function toBooleanRecord(value: Record<string, unknown>): PortalVisibility {
  return Object.entries(value).reduce<PortalVisibility>((result, [key, item]) => {
    if (typeof item === 'boolean') result[key] = item;
    return result;
  }, {});
}

function sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
  const sanitized = sanitizeUnknown(value);
  return isPlainObject(sanitized) ? sanitized : {};
}

function sanitizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeUnknown);
  if (!isPlainObject(value)) return value;

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, item]) => {
    if (INTERNAL_PAYLOAD_KEYS.has(key)) return result;
    result[key] = sanitizeUnknown(item);
    return result;
  }, {});
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
