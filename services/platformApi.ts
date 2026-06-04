import { isSupabaseConfigured, supabase } from './supabase';
import {
  fetchWorkspacePlatformAccounts,
  fetchWorkspacePlatformCampaigns,
  fetchWorkspacePlatformInsights,
  getWorkspacePlatformLoginUrl,
} from './nexusApi';
import { calculateTotals, groupTotalsByPlatform } from './platformMetrics';
import type {
  AdPlatform,
  PlatformAccount,
  PlatformCampaign,
  PlatformInsight,
  PlatformInsightsResponse,
} from './platformTypes';
import { getPublicEnv, isPublicEnvEnabled } from './publicEnv';

const SUPABASE_URL = getPublicEnv('VITE_SUPABASE_URL');

type CallOptions = {
  method?: 'GET' | 'POST';
  params?: Record<string, string>;
  body?: object;
};

async function callPlatformFunction<T>(functionName: string, options: CallOptions = {}): Promise<T> {
  if (!isSupabaseConfigured() || !supabase || !SUPABASE_URL) {
    throw new Error('Supabase não está configurado');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Usuário não autenticado');

  const url = new URL(`${SUPABASE_URL}/functions/v1/${functionName}`);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `Erro na função ${functionName}`);
  return json;
}

export async function getPlatformLoginUrl(platform: AdPlatform): Promise<{ loginUrl: string }> {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    return getWorkspacePlatformLoginUrl(platform, redirectTo);
  }

  if (!SUPABASE_URL) throw new Error('Supabase não está configurado');

  if (platform === 'meta') {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    return callPlatformFunction<{ loginUrl: string }>('facebook-oauth', {
      method: 'GET',
      params: redirectTo ? { redirect_to: redirectTo } : undefined,
    });
  }

  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  return callPlatformFunction<{ loginUrl: string }>('google-oauth', {
    method: 'GET',
    params: redirectTo ? { redirect_to: redirectTo } : undefined,
  });
}

export async function fetchPlatformAccounts(platform?: AdPlatform): Promise<PlatformAccount[]> {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    const accounts = await fetchWorkspacePlatformAccounts();
    return platform ? accounts.filter((account) => account.platform === platform) : accounts;
  }

  if (platform === 'google') {
    const result = await callPlatformFunction<{ data: PlatformAccount[] }>('google-accounts');
    return result.data;
  }

  if (platform === 'meta') {
    const result = await callPlatformFunction<{ data: any[] }>('meta-accounts');
    return result.data.map(mapMetaAccount);
  }

  const [meta, google] = await Promise.allSettled([
    fetchPlatformAccounts('meta'),
    fetchPlatformAccounts('google'),
  ]);

  return [
    ...(meta.status === 'fulfilled' ? meta.value : []),
    ...(google.status === 'fulfilled' ? google.value : []),
  ];
}

export async function fetchPlatformCampaigns(platform: AdPlatform, accountId: string): Promise<PlatformCampaign[]> {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    return fetchWorkspacePlatformCampaigns(platform, accountId);
  }

  if (platform === 'google') {
    const result = await callPlatformFunction<{ data: PlatformCampaign[] }>('google-campaigns', {
      method: 'GET',
      params: { account_id: accountId },
    });
    return result.data;
  }

  const result = await callPlatformFunction<{ data: any[] }>('meta-campaigns', {
    method: 'GET',
    params: { account_id: accountId },
  });

  return result.data.map((campaign) => ({
    id: campaign.id,
    platform: 'meta',
    externalCampaignId: campaign.id,
    name: campaign.name,
    status: campaign.status,
    objective: campaign.objective,
    channelType: null,
    metadata: {
      dailyBudget: campaign.dailyBudget,
      lifetimeBudget: campaign.lifetimeBudget,
      startTime: campaign.startTime,
      stopTime: campaign.stopTime,
    },
  }));
}

export async function fetchPlatformInsights(
  platform: AdPlatform,
  accountId: string,
  options: {
    campaignIds?: string[];
    datePreset?: string;
    dateStart?: string;
    dateEnd?: string;
  } = {},
): Promise<PlatformInsightsResponse> {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    return fetchWorkspacePlatformInsights(platform, accountId, options);
  }

  const params: Record<string, string> = { account_id: accountId };
  if (options.campaignIds?.length) params.campaign_ids = options.campaignIds.join(',');
  if (options.datePreset) params.date_preset = options.datePreset;
  if (options.dateStart && options.dateEnd) {
    params.date_start = options.dateStart;
    params.date_end = options.dateEnd;
  }

  if (platform === 'google') {
    return callPlatformFunction<PlatformInsightsResponse>('google-insights', { method: 'GET', params });
  }

  const result = await callPlatformFunction<any>('meta-insights', { method: 'GET', params });
  return mapMetaInsightsResponse(accountId, result);
}

function mapMetaAccount(account: any): PlatformAccount {
  return {
    id: account.externalAccountId || account.id,
    platform: 'meta',
    externalAccountId: account.externalAccountId || account.id,
    name: account.name,
    currency: account.currency || 'BRL',
    status: String(account.accountStatus ?? 'active'),
    isConfigured: !!account.isConfigured,
    whatsappTarget: account.whatsappTarget || '',
    selectedCampaignIds: account.selectedCampaignIds || [],
    lastReportSent: account.lastReportSent || null,
    metadata: {
      amountSpent: account.amountSpent,
      clientId: account.clientId,
    },
  };
}

function mapMetaInsightsResponse(accountId: string, response: any): PlatformInsightsResponse {
  const data: PlatformInsight[] = (response.data || []).map((row: any) => {
    const conversions = Number(row.leads || 0) + Number(row.purchases || 0) + Number(row.messaging || 0);
    const spend = Number(row.spend || 0);
    return {
      platform: 'meta',
      accountId,
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      spend,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      ctr: Number(row.ctr || 0),
      cpc: Number(row.cpc || 0),
      cpm: Number(row.cpm || 0),
      conversions,
      costPerConversion: conversions > 0 ? spend / conversions : null,
      conversionValue: null,
      roas: null,
      raw: row,
    };
  });

  const totals = calculateTotals(data);

  return {
    data,
    totals,
    dailyData: (response.dailyData || []).map((day: any) => ({
      date: day.date,
      dateFormatted: day.dateFormatted,
      platform: 'meta',
      spend: Number(day.spend || 0),
      impressions: Number(day.impressions || 0),
      clicks: Number(day.clicks || 0),
      ctr: Number(day.ctr || 0),
      cpc: Number(day.cpc || 0),
      conversions: 0,
    })),
    platformTotals: groupTotalsByPlatform(data),
    datePreset: response.datePreset,
    dateRange: response.dateRange,
  };
}
