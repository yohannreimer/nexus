import type { AgencyClient, ClientAiAnalysis, ClientAiProfile, ClientReportRun } from './clientWorkspaceTypes';

const BLOCKED_KEYS = new Set([
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'token',
  'idempotencyKey',
  'linkedAccountIds',
  'webhookUrl',
  'webhookTarget',
  'webhookResponse',
  'rawOAuth',
  'raw_oauth',
  'rawAiPayload',
  'raw_ai_payload',
  'metadata',
]);

export function buildClientChatContext(input: {
  client: AgencyClient;
  profile: ClientAiProfile | null;
  reportRuns: ClientReportRun[];
  analyses: ClientAiAnalysis[];
}): Record<string, unknown> {
  const reportRuns = [...input.reportRuns].sort(sortByCreatedDesc).slice(0, 10);
  const analyses = [...input.analyses].sort(sortByCreatedDesc).slice(0, 5);
  const latestReport = reportRuns[0] || null;
  const latestAnalysis = analyses[0] || null;

  return sanitizeRecord({
    client: {
      id: input.client.id,
      name: input.client.name,
      status: input.client.status,
      internalOwner: input.client.internalOwner,
      notes: input.client.notes,
    },
    profile: input.profile ? {
      objective: input.profile.objective,
      tone: input.profile.tone,
      businessRules: input.profile.businessRules,
      importantMetrics: input.profile.importantMetrics,
      exposureLevel: input.profile.exposureLevel,
    } : null,
    latestReport: latestReport ? serializeRun(latestReport) : null,
    latestAnalysis: latestAnalysis ? serializeAnalysis(latestAnalysis) : null,
    recentMetrics: latestReport ? readMetrics(latestReport) : {},
    reportRuns: reportRuns.map(serializeRun),
    analyses: analyses.map(serializeAnalysis),
  });
}

function serializeRun(run: ClientReportRun): Record<string, unknown> {
  return {
    id: run.id,
    periodStart: run.periodStart,
    periodEnd: run.periodEnd,
    status: run.status,
    reportMode: run.reportMode,
    executionType: run.executionType,
    deterministicMessage: run.deterministicMessage,
    warnings: run.warnings,
    platformsIncluded: run.platformsIncluded,
    summaryPayload: run.summaryPayload,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt,
    sentAt: run.sentAt,
  };
}

function serializeAnalysis(analysis: ClientAiAnalysis): Record<string, unknown> {
  return {
    id: analysis.id,
    periodStart: analysis.periodStart,
    periodEnd: analysis.periodEnd,
    summary: analysis.summary,
    positives: analysis.positives,
    attentionPoints: analysis.attentionPoints,
    internalAlerts: analysis.internalAlerts,
    recommendations: analysis.recommendations,
    talkingPoints: analysis.talkingPoints,
    riskLevel: analysis.riskLevel,
    opportunityLevel: analysis.opportunityLevel,
    provider: analysis.provider,
    model: analysis.model,
    createdAt: analysis.createdAt,
  };
}

function readMetrics(run: ClientReportRun): Record<string, unknown> {
  const payload = run.summaryPayload || {};
  if (isRecord(payload.metrics)) return sanitizeRecord(payload.metrics);
  if (isRecord(payload.totals)) return sanitizeRecord(payload.totals);
  return sanitizeRecord(payload);
}

function sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
  const sanitized = sanitizeUnknown(value);
  return isRecord(sanitized) ? sanitized : {};
}

function sanitizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeUnknown);
  if (!isRecord(value)) return value;

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, item]) => {
    const lower = key.toLowerCase();
    if (
      BLOCKED_KEYS.has(key)
      || lower.includes('token')
      || lower.includes('webhook')
      || lower.includes('oauth')
      || lower.includes('secret')
      || lower.includes('raw')
    ) {
      return result;
    }
    result[key] = sanitizeUnknown(item);
    return result;
  }, {});
}

function sortByCreatedDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return timestamp(b.createdAt) - timestamp(a.createdAt);
}

function timestamp(value: string): number {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
