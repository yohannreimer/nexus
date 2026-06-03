import type { AdPlatform, PlatformAccount, PlatformInsightTotals } from './platformTypes';

export type AgencyClientStatus = 'active' | 'paused' | 'archived';
export type ClientReportPeriod = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'last_60d' | 'custom';
export type ClientReportMode = 'executive' | 'analytical';
export type ClientDeliveryFrequency = 'daily' | 'weekly' | 'monthly';
export type ClientPortalMode = 'essential' | 'executive' | 'complete';
export type ClientReportExposure = 'executive_safe' | 'consultative' | 'detailed';
export type ClientReportExecutionType = 'manual' | 'scheduled';
export type ClientReportRunStatus = 'pending' | 'processing' | 'generated' | 'sent' | 'failed' | 'sent_with_warnings';
export type NexusPlan = 'starter' | 'pro' | 'agency';

export type NexusPlanLimits = {
  maxClients: number | null;
  portalEnabled: boolean;
  aiEnabled: boolean;
  reportAutomationEnabled: boolean;
  whiteLabelEnabled: boolean;
};

export interface AgencyClient {
  id: string;
  userId: string;
  name: string;
  status: AgencyClientStatus;
  primaryWhatsapp: string | null;
  internalOwner: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyClientAccountLink {
  id: string;
  userId: string;
  clientId: string;
  accountId: string;
  platform: AdPlatform;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  account?: PlatformAccount;
}

export interface ClientReportSettings {
  id: string;
  userId: string;
  clientId: string;
  defaultPeriod: ClientReportPeriod;
  sendTime: string;
  timezone: string;
  deliveryEnabled: boolean;
  deliveryFrequency: ClientDeliveryFrequency;
  weeklyDay: number | null;
  monthlyDay: number | null;
  deliveryTarget: string | null;
  webhookUrl: string | null;
  defaultReportMode: ClientReportMode;
  portalMode: ClientPortalMode;
  clientReportExposure: ClientReportExposure;
  internalAiEnabled: boolean;
  briefingEnabled: boolean;
  reportTemplateSettings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientReportRun {
  id: string;
  userId: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  status: ClientReportRunStatus;
  reportMode: ClientReportMode;
  executionType: ClientReportExecutionType;
  idempotencyKey: string | null;
  linkedAccountIds: string[];
  deterministicMessage: string | null;
  reportHtml: string | null;
  pdfUrl: string | null;
  portalSnapshotUrl: string | null;
  webhookTarget: string | null;
  webhookResponse: Record<string, unknown>;
  attemptCount: number;
  scheduledFor: string | null;
  warnings: unknown[];
  platformsIncluded: AdPlatform[];
  summaryPayload: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface ClientPortal {
  id: string;
  userId: string;
  clientId: string;
  slug: string;
  status: 'active' | 'paused';
  mode: ClientPortalMode;
  branding: Record<string, unknown>;
  visibilitySettings: Record<string, unknown>;
  accessSettings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientAiProfile {
  id: string;
  userId: string;
  clientId: string;
  objective: 'leads' | 'sales' | 'traffic' | 'awareness' | 'mixed';
  tone: 'direct' | 'consultative' | 'premium' | 'informal';
  businessRules: Record<string, unknown>;
  importantMetrics: string[];
  exposureLevel: 'conservative' | 'normal' | 'detailed';
  internalAiEnabled: boolean;
  briefingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientAiAnalysis {
  id: string;
  userId: string;
  clientId: string;
  reportRunId: string | null;
  periodStart: string;
  periodEnd: string;
  summary: string;
  positives: unknown[];
  attentionPoints: unknown[];
  internalAlerts: unknown[];
  recommendations: unknown[];
  talkingPoints: unknown[];
  riskLevel: 'low' | 'normal' | 'attention' | 'critical';
  opportunityLevel: 'low' | 'normal' | 'high';
  rawAiPayload: Record<string, unknown>;
  provider: string | null;
  model: string | null;
  createdAt: string;
}

export interface AgencyAiBriefing {
  id: string;
  userId: string;
  briefingDate: string;
  portfolioSummary: Record<string, unknown>;
  clientPriorities: unknown[];
  alerts: unknown[];
  opportunities: unknown[];
  generatedText: string;
  provider: string | null;
  model: string | null;
  createdAt: string;
}

export interface ClientDailySnapshot {
  clientId: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  accountCount: number;
  campaignCount: number;
}

export interface ClientWorkspaceSummary {
  client: AgencyClient;
  settings: ClientReportSettings | null;
  linkedAccounts: AgencyClientAccountLink[];
  accountCount: number;
  metaAccountCount: number;
  googleAccountCount: number;
  nextSendLabel: string;
  health: 'ok' | 'needs_accounts' | 'automation_off' | 'attention';
  totals?: PlatformInsightTotals;
}

export interface AvailableAccount extends PlatformAccount {
  linkedClientId: string | null;
  linkedClientName: string | null;
}
