import type { AdPlatform } from './services/platformTypes';

export interface AgencyUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isConnectedToFacebook: boolean;
}

export type AdAccountStatus = 1 | 2 | 3 | 7 | 8 | 9 | 100 | 101 | 201 | 202 | 999; // Facebook account_status values

export interface AdAccount {
  platform?: AdPlatform;
  externalAccountId?: string;
  // Dados vindos do Facebook
  id: string; // act_123123
  name: string; // Nome da conta no FB
  currency: string;
  accountStatus: AdAccountStatus;
  
  // Dados da nossa plataforma (SaaS)
  isConfigured: boolean;
  whatsappTarget?: string; // Onde o relatório vai chegar
  selectedCampaignIds?: string[];
  lastReportSent?: string;
  nextReportDate?: string;
}

// Alias for compatibility
export type FacebookAdAccount = AdAccount;

// Estrutura real simplificada do Facebook Marketing API (Insights)
export interface FacebookInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string; // Facebook retorna valores monetários como string
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  roas?: string; // Calculado ou vindo de purchase_roas
  actions?: {
    action_type: string;
    value: string;
  }[];
}

export interface FacebookCampaign {
  id: string;
  name: string;
  status: string; // ACTIVE, PAUSED, etc
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  PREVIEW_AI = 'PREVIEW_AI',
}

export interface MockAdData {
  account_id: string;
  account_name: string;
  date_preset: string;
  data: FacebookInsight[];
}

export interface Client {

  id: string;

  name: string;

  companyName: string;

  whatsapp: string;

  adAccountId: string;
  platform?: AdPlatform;

  status: string;

  tokenExpiresAt: string;

  selectedCampaignIds: string[];

}

export type {
  AdPlatform,
  PlatformAccount,
  PlatformCampaign,
  PlatformConnection,
  PlatformInsight,
  PlatformInsightsResponse,
  PlatformInsightTotals,
} from './services/platformTypes';

export type {
  AgencyClient,
  AgencyClientAccountLink,
  AgencyClientStatus,
  AvailableAccount,
  ClientReportMode,
  ClientReportPeriod,
  ClientDeliveryFrequency,
  ClientReportRun,
  ClientReportRunStatus,
  ClientReportSettings,
  ClientPortal,
  ClientPortalMode,
  AgencyAiBriefing,
  ClientAiAnalysis,
  ClientDailySnapshot,
  ClientWorkspaceSummary,
} from './services/clientWorkspaceTypes';
