export type AdPlatform = 'meta' | 'google';

export interface PlatformConnection {
  id: string;
  platform: AdPlatform;
  externalUserId?: string;
  externalUserName?: string;
  status: 'active' | 'expired' | 'revoked' | 'error';
  tokenExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformAccount {
  id: string;
  platform: AdPlatform;
  externalAccountId: string;
  name: string;
  currency: string;
  timezone?: string | null;
  status: string;
  isConfigured: boolean;
  whatsappTarget?: string;
  selectedCampaignIds: string[];
  lastReportSent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PlatformCampaign {
  id: string;
  platform: AdPlatform;
  externalCampaignId: string;
  name: string;
  status: string;
  objective?: string | null;
  channelType?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PlatformInsight {
  platform: AdPlatform;
  accountId: string;
  campaignId?: string;
  campaignName?: string;
  dateStart?: string;
  dateEnd?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number | null;
  conversionValue: number | null;
  roas: number | null;
  raw?: unknown;
}

export interface PlatformInsightsResponse {
  data: PlatformInsight[];
  totals: PlatformInsightTotals;
  dailyData: Array<{
    date: string;
    dateFormatted: string;
    platform: AdPlatform;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    conversions: number;
  }>;
  platformTotals: Record<AdPlatform, PlatformInsightTotals | undefined>;
  datePreset?: string;
  dateRange: { start: string; end: string } | null;
}

export interface PlatformInsightTotals {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number | null;
  conversionValue: number | null;
  roas: number | null;
}
