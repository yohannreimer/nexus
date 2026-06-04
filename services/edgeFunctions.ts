// Serviço para chamar as Edge Functions do Supabase
// Substitui as chamadas para localhost:3001

import { supabase, isSupabaseConfigured } from './supabase';
import type { PlatformAccount, PlatformCampaign, PlatformInsightsResponse } from './platformTypes';
import { getPublicEnv } from './publicEnv';

const SUPABASE_URL = getPublicEnv('VITE_SUPABASE_URL');

// Helper para fazer chamadas autenticadas às Edge Functions
export async function callEdgeFunction<T>(
  functionName: string, 
  options: {
    method?: 'GET' | 'POST';
    body?: object;
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'POST', body, params } = options;

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase não está configurado');
  }

  // Buscar sessão para obter o token
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Construir URL com parâmetros se necessário
  let url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    ...(body && method === 'POST' && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Edge function error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Facebook OAuth
// ============================================

export async function getLoginUrl(): Promise<{ loginUrl: string }> {
  // Esta função não precisa de autenticação
  const response = await fetch(`${SUPABASE_URL}/functions/v1/facebook-oauth`);
  return response.json();
}

// A função de callback do OAuth é chamada diretamente pelo Facebook
// O frontend recebe o token via redirect URL

// ============================================
// Facebook Accounts
// ============================================

export interface EdgeAdAccount {
  id: string;
  name: string;
  currency: string;
  accountStatus: number;
  amountSpent?: string;
  isConfigured: boolean;
  whatsappTarget: string;
  selectedCampaignIds: string[];
  lastReportSent: string | null;
  clientId: string | null;
}

export async function fetchAdAccounts(): Promise<EdgeAdAccount[]> {
  const result = await callEdgeFunction<{ data: EdgeAdAccount[] }>('facebook-accounts');
  return result.data;
}

// ============================================
// Facebook Campaigns
// ============================================

export interface EdgeCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startTime?: string;
  stopTime?: string;
}

export async function fetchCampaigns(accountId: string): Promise<EdgeCampaign[]> {
  const result = await callEdgeFunction<{ data: EdgeCampaign[] }>(
    'facebook-campaigns',
    { method: 'GET', params: { account_id: accountId } }
  );
  return result.data;
}

// ============================================
// Facebook Insights
// ============================================

export interface CampaignInsight {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  reach: number;
  frequency: number;
  leads: number;
  purchases: number;
  messaging: number;
  costPerLead: number | null;
  costPerPurchase: number | null;
}

export interface InsightsTotals {
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  leads: number;
  purchases: number;
  messaging: number;
  ctr: number;
  cpc: number;
  cpm: number;
  costPerLead: number | null;
}

export interface InsightsResponse {
  data: CampaignInsight[];
  totals: InsightsTotals;
  datePreset: string;
  dateRange: { start: string; end: string } | null;
}

export async function fetchInsights(
  accountId: string,
  options: {
    campaignIds?: string[];
    datePreset?: string;
    dateStart?: string;
    dateEnd?: string;
  } = {}
): Promise<InsightsResponse> {
  const params: Record<string, string> = {
    account_id: accountId,
  };

  if (options.campaignIds?.length) {
    params.campaign_ids = options.campaignIds.join(',');
  }
  if (options.datePreset) {
    params.date_preset = options.datePreset;
  }
  if (options.dateStart && options.dateEnd) {
    params.date_start = options.dateStart;
    params.date_end = options.dateEnd;
  }

  return callEdgeFunction<InsightsResponse>('facebook-insights', { method: 'GET', params });
}

// ============================================
// Google Ads
// ============================================

export async function getGoogleLoginUrl(): Promise<{ loginUrl: string }> {
  return callEdgeFunction<{ loginUrl: string }>('google-oauth', { method: 'GET' });
}

export async function fetchGoogleAdAccounts(): Promise<PlatformAccount[]> {
  const result = await callEdgeFunction<{ data: PlatformAccount[] }>('google-accounts');
  return result.data;
}

export async function fetchGoogleCampaigns(accountId: string): Promise<PlatformCampaign[]> {
  const result = await callEdgeFunction<{ data: PlatformCampaign[] }>(
    'google-campaigns',
    { method: 'GET', params: { account_id: accountId } }
  );
  return result.data;
}

export async function fetchGoogleInsights(
  accountId: string,
  options: {
    campaignIds?: string[];
    datePreset?: string;
    dateStart?: string;
    dateEnd?: string;
  } = {}
): Promise<PlatformInsightsResponse> {
  const params: Record<string, string> = { account_id: accountId };
  if (options.campaignIds?.length) params.campaign_ids = options.campaignIds.join(',');
  if (options.datePreset) params.date_preset = options.datePreset;
  if (options.dateStart && options.dateEnd) {
    params.date_start = options.dateStart;
    params.date_end = options.dateEnd;
  }

  return callEdgeFunction<PlatformInsightsResponse>('google-insights', { method: 'GET', params });
}

// ============================================
// Send Webhook (N8N/WhatsApp)
// ============================================

export interface SendWebhookParams {
  webhookUrl?: string;
  whatsappNumber?: string;
  reportContent: string;
  clientName?: string;
  adAccountId?: string;
  adAccountName?: string;
}

export interface SendWebhookResponse {
  success: boolean;
  message: string;
  sentTo: string;
}

export async function sendWebhook(params: SendWebhookParams): Promise<SendWebhookResponse> {
  return callEdgeFunction<SendWebhookResponse>('send-webhook', { body: params });
}

// ============================================
// Scheduled Reports
// ============================================

export async function runScheduledReportsNow(input: { dryRun: boolean }): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  runIds: string[];
}> {
  return callEdgeFunction('scheduled-reports', { body: input });
}

// ============================================
// Generate Report (sem Gemini por enquanto)
// ============================================

// A função generate-report usa Gemini, mas como não está sendo usada agora,
// ela pode ser implementada depois ou gerar relatório localmente

export async function generateReport(
  insights: InsightsResponse,
  clientName: string,
  templateId?: string
): Promise<{ report: string }> {
  return callEdgeFunction<{ report: string }>('generate-report', {
    body: { insights, clientName, templateId }
  });
}

export async function generateClientAiAnalysis(input: {
  clientId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<{ analysisId: string }> {
  return callEdgeFunction<{ analysisId: string }>('generate-report', {
    body: {
      type: 'internal_client_analysis',
      ...input,
    },
  });
}

// ============================================
// Export conveniente
// ============================================

export const edgeFunctions = {
  getLoginUrl,
  getGoogleLoginUrl,
  fetchAdAccounts,
  fetchGoogleAdAccounts,
  fetchCampaigns,
  fetchGoogleCampaigns,
  fetchInsights,
  fetchGoogleInsights,
  sendWebhook,
  runScheduledReportsNow,
  generateReport,
  generateClientAiAnalysis,
};

export default edgeFunctions;
