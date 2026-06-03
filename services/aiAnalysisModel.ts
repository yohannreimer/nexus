import type { ClientAiProfile, ClientReportRun } from './clientWorkspaceTypes';

export type AiAnalysisInput = {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  totals: Record<string, number>;
  campaigns: Array<Record<string, unknown>>;
  profile: ClientAiProfile;
  recentRuns: ClientReportRun[];
};

export type NormalizedAiAnalysis = {
  summary: string;
  positives: unknown[];
  attentionPoints: unknown[];
  internalAlerts: unknown[];
  recommendations: Array<Record<string, unknown> & { audience: 'agency' }>;
  talkingPoints: unknown[];
  riskLevel: 'low' | 'normal' | 'attention' | 'critical';
  opportunityLevel: 'low' | 'normal' | 'high';
};

const DEFAULT_ANALYSIS: NormalizedAiAnalysis = {
  summary: 'Nao foi possivel gerar uma analise confiavel para este periodo.',
  positives: [],
  attentionPoints: [],
  internalAlerts: [],
  recommendations: [],
  talkingPoints: [],
  riskLevel: 'normal',
  opportunityLevel: 'normal',
};

const RISK_LEVELS = new Set<NormalizedAiAnalysis['riskLevel']>(['low', 'normal', 'attention', 'critical']);
const OPPORTUNITY_LEVELS = new Set<NormalizedAiAnalysis['opportunityLevel']>(['low', 'normal', 'high']);

export function normalizeAiAnalysisPayload(payload: unknown): NormalizedAiAnalysis {
  const parsed = parsePayload(payload);
  if (!parsed) return { ...DEFAULT_ANALYSIS };

  return {
    summary: readString(parsed.summary) || DEFAULT_ANALYSIS.summary,
    positives: readArray(parsed.positives),
    attentionPoints: readArray(parsed.attentionPoints ?? parsed.attention_points),
    internalAlerts: readArray(parsed.internalAlerts ?? parsed.internal_alerts),
    recommendations: readRecommendations(parsed.recommendations),
    talkingPoints: readArray(parsed.talkingPoints ?? parsed.talking_points),
    riskLevel: readRiskLevel(parsed.riskLevel ?? parsed.risk_level),
    opportunityLevel: readOpportunityLevel(parsed.opportunityLevel ?? parsed.opportunity_level),
  };
}

function parsePayload(payload: unknown): Record<string, unknown> | null {
  if (isPlainObject(payload)) return payload;
  if (typeof payload !== 'string') return null;

  try {
    const parsed = JSON.parse(payload);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item !== null && item !== undefined);
}

function readRecommendations(value: unknown): Array<Record<string, unknown> & { audience: 'agency' }> {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item !== null && item !== undefined)
    .map((item) => {
      if (isPlainObject(item)) {
        return { ...item, audience: 'agency' };
      }
      return { text: String(item), audience: 'agency' };
    });
}

function readRiskLevel(value: unknown): NormalizedAiAnalysis['riskLevel'] {
  return RISK_LEVELS.has(value as NormalizedAiAnalysis['riskLevel'])
    ? value as NormalizedAiAnalysis['riskLevel']
    : DEFAULT_ANALYSIS.riskLevel;
}

function readOpportunityLevel(value: unknown): NormalizedAiAnalysis['opportunityLevel'] {
  return OPPORTUNITY_LEVELS.has(value as NormalizedAiAnalysis['opportunityLevel'])
    ? value as NormalizedAiAnalysis['opportunityLevel']
    : DEFAULT_ANALYSIS.opportunityLevel;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
