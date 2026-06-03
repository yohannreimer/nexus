import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GRAPH_VERSION = Deno.env.get('FACEBOOK_GRAPH_VERSION') || 'v23.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type InsightRow = {
  campaignId: string;
  campaignName: string;
  objective: string;
  objectiveLabel: string;
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
  raw?: unknown;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const accountId = normalizeAccountId(url.searchParams.get('account_id') || '');
    const campaignIds = parseCampaignIds(url.searchParams.get('campaign_ids'));
    const dateRange = getDateRange(
      url.searchParams.get('date_preset') || 'last_7d',
      url.searchParams.get('date_start'),
      url.searchParams.get('date_end'),
    );

    if (!accountId) throw new Error('Missing account_id parameter');

    const { supabase, user } = await authenticatedSupabase(req);
    const connection = await getMetaConnection(supabase, user.id);
    const account = await getSavedAccount(supabase, user.id, accountId);

    const fields = 'campaign_id,campaign_name,impressions,clicks,ctr,cpc,cpm,spend,reach,frequency,actions,cost_per_action_type';
    const params: Record<string, string> = {
      fields,
      level: 'campaign',
      time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
    };
    if (campaignIds.length > 0) {
      params.filtering = JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: campaignIds }]);
    }

    const insightsData = await graphGet(`${accountId}/insights`, connection.access_token, params);
    const objectiveMap = await fetchCampaignObjectives(connection.access_token, insightsData.data || []);
    const insights = (insightsData.data || []).map((row: any) => normalizeInsight(row, objectiveMap));
    const dailyData = await fetchDailyData(connection.access_token, accountId, dateRange.start, dateRange.end);
    const objectiveData = calculateObjectiveData(insights);
    const totals = calculateTotals(insights);

    await persistInsights(supabase, user.id, account.id, insights, dateRange.start, dateRange.end);

    return json({
      data: insights,
      dailyData,
      objectiveData,
      totals,
      platformTotals: { meta: totals, google: undefined },
      datePreset: url.searchParams.get('date_preset') || 'last_7d',
      dateRange,
    });
  } catch (error) {
    console.error('facebook-insights error:', error);
    return json({ error: errorMessage(error) }, 400);
  }
});

function normalizeInsight(row: any, objectives: Record<string, { objective: string; objectiveLabel: string }>): InsightRow {
  const actions = row.actions || [];
  const costPerAction = row.cost_per_action_type || [];
  const leads = integerValue(actionValue(actions, 'lead'));
  const purchases = integerValue(actionValue(actions, 'purchase'));
  const messaging = integerValue(actionValue(actions, 'onsite_conversion.messaging_conversation_started_7d'));
  const campaignObjective = objectives[row.campaign_id] || { objective: 'UNKNOWN', objectiveLabel: 'Desconhecido' };

  return {
    campaignId: row.campaign_id,
    campaignName: row.campaign_name || 'Campanha sem nome',
    objective: campaignObjective.objective,
    objectiveLabel: campaignObjective.objectiveLabel,
    impressions: integerValue(row.impressions),
    clicks: integerValue(row.clicks),
    ctr: numberValue(row.ctr),
    cpc: numberValue(row.cpc),
    cpm: numberValue(row.cpm),
    spend: numberValue(row.spend),
    reach: integerValue(row.reach),
    frequency: numberValue(row.frequency),
    leads,
    purchases,
    messaging,
    costPerLead: nullableNumber(actionValue(costPerAction, 'lead')),
    costPerPurchase: nullableNumber(actionValue(costPerAction, 'purchase')),
    raw: row,
  };
}

async function fetchCampaignObjectives(accessToken: string, insights: any[]) {
  const campaignIds = insights.map((item) => item.campaign_id).filter(Boolean);
  if (campaignIds.length === 0) return {};

  const payload = await graphGet('', accessToken, {
    ids: campaignIds.join(','),
    fields: 'objective',
  });

  const labels: Record<string, string> = {
    OUTCOME_TRAFFIC: 'Tráfego',
    OUTCOME_ENGAGEMENT: 'Engajamento',
    OUTCOME_LEADS: 'Cadastros/Leads',
    OUTCOME_SALES: 'Vendas',
    OUTCOME_AWARENESS: 'Reconhecimento',
    CONVERSIONS: 'Conversões',
    MESSAGES: 'Mensagens',
    LINK_CLICKS: 'Cliques no Link',
    LEAD_GENERATION: 'Geração de Leads',
    VIDEO_VIEWS: 'Visualizações de Vídeo',
    REACH: 'Alcance',
    BRAND_AWARENESS: 'Reconhecimento de Marca',
    POST_ENGAGEMENT: 'Engajamento com Post',
    PAGE_LIKES: 'Curtidas na Página',
    APP_INSTALLS: 'Instalações de App',
  };

  return Object.fromEntries(Object.entries(payload).map(([id, value]: [string, any]) => {
    const objective = value?.objective || 'UNKNOWN';
    return [id, { objective, objectiveLabel: labels[objective] || objective }];
  }));
}

async function fetchDailyData(accessToken: string, accountId: string, dateStart: string, dateEnd: string) {
  const payload = await graphGet(`${accountId}/insights`, accessToken, {
    fields: 'impressions,clicks,spend,ctr,cpc',
    level: 'account',
    time_increment: '1',
    time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
  });

  return (payload.data || []).map((day: any) => ({
    date: day.date_start,
    dateFormatted: formatPtBrDayMonth(day.date_start),
    platform: 'meta',
    spend: numberValue(day.spend),
    impressions: integerValue(day.impressions),
    clicks: integerValue(day.clicks),
    ctr: numberValue(day.ctr),
    cpc: numberValue(day.cpc),
    conversions: 0,
  }));
}

async function persistInsights(
  supabase: any,
  userId: string,
  accountDbId: string,
  insights: InsightRow[],
  dateStart: string,
  dateEnd: string,
) {
  const { data: campaigns } = await supabase
    .from('ad_platform_campaigns')
    .select('id,external_campaign_id')
    .eq('account_id', accountDbId)
    .eq('platform', 'meta');

  const campaignMap = new Map((campaigns || []).map((campaign: any) => [campaign.external_campaign_id, campaign.id]));
  await supabase
    .from('ad_insights_snapshots')
    .delete()
    .eq('user_id', userId)
    .eq('account_id', accountDbId)
    .eq('platform', 'meta')
    .eq('date_start', dateStart)
    .eq('date_end', dateEnd);

  if (insights.length === 0) return;

  const rows = insights.map((insight) => {
    const conversions = insight.leads + insight.purchases + insight.messaging;
    return {
      user_id: userId,
      account_id: accountDbId,
      campaign_id: insight.campaignId ? campaignMap.get(insight.campaignId) || null : null,
      platform: 'meta',
      date_start: dateStart,
      date_end: dateEnd,
      spend: insight.spend,
      impressions: insight.impressions,
      clicks: insight.clicks,
      ctr: insight.ctr,
      cpc: insight.cpc,
      cpm: insight.cpm,
      conversions,
      cost_per_conversion: conversions > 0 ? insight.spend / conversions : null,
      conversion_value: null,
      roas: null,
      raw: insight.raw,
    };
  });

  const { error } = await supabase.from('ad_insights_snapshots').insert(rows);
  if (error) throw error;
}

function calculateObjectiveData(insights: InsightRow[]) {
  const objectiveMap: Record<string, any> = {};
  insights.forEach((insight) => {
    if (!objectiveMap[insight.objective]) {
      objectiveMap[insight.objective] = {
        objective: insight.objective,
        objectiveLabel: insight.objectiveLabel,
        spend: 0,
        impressions: 0,
        clicks: 0,
        campaigns: 0,
      };
    }
    objectiveMap[insight.objective].spend += insight.spend;
    objectiveMap[insight.objective].impressions += insight.impressions;
    objectiveMap[insight.objective].clicks += insight.clicks;
    objectiveMap[insight.objective].campaigns += 1;
  });

  return Object.values(objectiveMap).map((objective: any) => ({
    ...objective,
    ctr: objective.impressions > 0 ? (objective.clicks / objective.impressions) * 100 : 0,
    cpc: objective.clicks > 0 ? objective.spend / objective.clicks : 0,
  }));
}

function calculateTotals(insights: InsightRow[]) {
  const totals = insights.reduce((acc, item) => ({
    impressions: acc.impressions + item.impressions,
    clicks: acc.clicks + item.clicks,
    spend: acc.spend + item.spend,
    reach: acc.reach + item.reach,
    leads: acc.leads + item.leads,
    purchases: acc.purchases + item.purchases,
    messaging: acc.messaging + item.messaging,
  }), { impressions: 0, clicks: 0, spend: 0, reach: 0, leads: 0, purchases: 0, messaging: 0 });

  const conversions = totals.leads + totals.purchases + totals.messaging;
  return {
    ...totals,
    conversions,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    costPerLead: totals.leads > 0 ? totals.spend / totals.leads : null,
    costPerConversion: conversions > 0 ? totals.spend / conversions : null,
    conversionValue: null,
    roas: null,
  };
}

async function authenticatedSupabase(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');

  const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'));
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid or expired token');
  return { supabase, user };
}

async function getMetaConnection(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('ad_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'meta')
    .single();

  if (error || !data) throw new Error('Meta Ads is not connected');
  if (!data.access_token) throw new Error('Meta access token is missing. Reconnect Meta Ads.');
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    throw new Error('Meta access token expired. Reconnect Meta Ads.');
  }
  return data;
}

async function getSavedAccount(supabase: any, userId: string, accountId: string) {
  const { data, error } = await supabase
    .from('ad_platform_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'meta')
    .eq('external_account_id', accountId)
    .single();

  if (error || !data) throw new Error('Meta Ads account is not synced. Refresh accounts first.');
  return data;
}

async function graphGet(path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Meta API request failed');
  return payload;
}

function getDateRange(datePreset: string, dateStart: string | null, dateEnd: string | null) {
  if (dateStart && dateEnd) return { start: dateStart, end: dateEnd };

  const today = new Date();
  const startDate = new Date(today);
  if (datePreset === 'last_30d') startDate.setDate(today.getDate() - 29);
  else if (datePreset === 'last_60d') startDate.setDate(today.getDate() - 59);
  else if (datePreset === 'yesterday') {
    startDate.setDate(today.getDate() - 1);
    return { start: formatDate(startDate), end: formatDate(startDate) };
  } else if (datePreset === 'today') startDate.setDate(today.getDate());
  else startDate.setDate(today.getDate() - 6);

  return { start: formatDate(startDate), end: formatDate(today) };
}

function parseCampaignIds(campaignIds: string | null): string[] {
  if (!campaignIds) return [];
  return campaignIds.split(',').map((id) => id.trim()).filter(Boolean);
}

function normalizeAccountId(accountId: string): string {
  const clean = String(accountId || '').trim();
  if (!clean) return '';
  return clean.startsWith('act_') ? clean : `act_${clean.replace(/\D/g, '')}`;
}

function actionValue(actions: any[], type: string): string | number | null {
  return actions.find((action) => action.action_type === type)?.value ?? null;
}

function nullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function integerValue(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function numberValue(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatPtBrDayMonth(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
