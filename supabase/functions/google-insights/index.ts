import { googleAdsSearch, normalizeCustomerId } from '../_shared/googleAds.ts';
import {
  authenticatedSupabase,
  corsHeaders,
  ensureGoogleAccessToken,
  errorMessage,
  getGoogleConnection,
  json,
} from '../_shared/googleConnection.ts';

type InsightRow = {
  platform: 'google';
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
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const accountId = normalizeCustomerId(url.searchParams.get('account_id') || '');
    const campaignIds = parseCampaignIds(url.searchParams.get('campaign_ids'));
    const dateRange = getDateRange(
      url.searchParams.get('date_preset') || 'last_7d',
      url.searchParams.get('date_start'),
      url.searchParams.get('date_end'),
    );

    if (!accountId) throw new Error('Missing account_id parameter');

    const { supabase, user } = await authenticatedSupabase(req);
    const connection = await getGoogleConnection(supabase, user.id);
    const accessToken = await ensureGoogleAccessToken(supabase, connection);
    const account = await getSavedAccount(supabase, user.id, accountId);

    const campaignFilter = campaignIds.length > 0
      ? `and campaign.id in (${campaignIds.join(',')})`
      : '';

    const rows = await googleAdsSearch({
      accessToken,
      customerId: accountId,
      query: `
        select
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.average_cpm,
          metrics.conversions,
          metrics.cost_per_conversion,
          metrics.conversions_value
        from campaign
        where segments.date between '${dateRange.start}' and '${dateRange.end}'
          and campaign.status != 'REMOVED'
          ${campaignFilter}
      `,
    });

    const insights = rows.map((row) => normalizeInsight(row, accountId, dateRange.start, dateRange.end));
    const dailyData = await fetchDailyData(accessToken, accountId, dateRange.start, dateRange.end);
    const totals = calculateTotals(insights);

    await persistInsights(supabase, user.id, account.id, insights, dateRange.start, dateRange.end);

    return json({
      data: insights,
      totals,
      dailyData,
      platformTotals: { meta: undefined, google: totals },
      datePreset: url.searchParams.get('date_preset') || 'last_7d',
      dateRange,
    });
  } catch (error) {
    console.error('google-insights error:', error);
    return json({ error: errorMessage(error) }, 400);
  }
});

function normalizeInsight(row: any, accountId: string, dateStart: string, dateEnd: string): InsightRow {
  const spend = microsToCurrency(row.metrics?.costMicros);
  const conversionValue = numberValue(row.metrics?.conversionsValue);

  return {
    platform: 'google',
    accountId,
    campaignId: String(row.campaign?.id || ''),
    campaignName: row.campaign?.name || 'Campanha sem nome',
    dateStart,
    dateEnd,
    spend,
    impressions: integerValue(row.metrics?.impressions),
    clicks: integerValue(row.metrics?.clicks),
    ctr: numberValue(row.metrics?.ctr) * 100,
    cpc: microsToCurrency(row.metrics?.averageCpc),
    cpm: microsToCurrency(row.metrics?.averageCpm),
    conversions: numberValue(row.metrics?.conversions),
    costPerConversion: row.metrics?.costPerConversion ? microsToCurrency(row.metrics.costPerConversion) : null,
    conversionValue,
    roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
    raw: row,
  };
}

async function fetchDailyData(accessToken: string, accountId: string, dateStart: string, dateEnd: string) {
  const rows = await googleAdsSearch({
    accessToken,
    customerId: accountId,
    query: `
      select
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions
      from customer
      where segments.date between '${dateStart}' and '${dateEnd}'
      order by segments.date
    `,
  });

  return rows.map((row) => ({
    date: row.segments.date,
    dateFormatted: formatPtBrDayMonth(row.segments.date),
    platform: 'google',
    spend: microsToCurrency(row.metrics?.costMicros),
    impressions: integerValue(row.metrics?.impressions),
    clicks: integerValue(row.metrics?.clicks),
    ctr: numberValue(row.metrics?.ctr) * 100,
    cpc: microsToCurrency(row.metrics?.averageCpc),
    conversions: numberValue(row.metrics?.conversions),
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
    .eq('platform', 'google');

  const campaignMap = new Map((campaigns || []).map((campaign: any) => [campaign.external_campaign_id, campaign.id]));

  await supabase
    .from('ad_insights_snapshots')
    .delete()
    .eq('user_id', userId)
    .eq('account_id', accountDbId)
    .eq('platform', 'google')
    .eq('date_start', dateStart)
    .eq('date_end', dateEnd);

  if (insights.length === 0) return;

  const rows = insights.map((insight) => ({
    user_id: userId,
    account_id: accountDbId,
    campaign_id: insight.campaignId ? campaignMap.get(insight.campaignId) || null : null,
    platform: 'google',
    date_start: dateStart,
    date_end: dateEnd,
    spend: insight.spend,
    impressions: insight.impressions,
    clicks: insight.clicks,
    ctr: insight.ctr,
    cpc: insight.cpc,
    cpm: insight.cpm,
    conversions: insight.conversions,
    cost_per_conversion: insight.costPerConversion,
    conversion_value: insight.conversionValue,
    roas: insight.roas,
    raw: insight.raw,
  }));

  const { error } = await supabase.from('ad_insights_snapshots').insert(rows);
  if (error) throw error;
}

async function getSavedAccount(supabase: any, userId: string, accountId: string) {
  const { data, error } = await supabase
    .from('ad_platform_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'google')
    .eq('external_account_id', accountId)
    .single();

  if (error || !data) {
    throw new Error('Google Ads account is not synced. Refresh accounts first.');
  }

  return data;
}

function calculateTotals(insights: InsightRow[]) {
  const spend = insights.reduce((sum, item) => sum + item.spend, 0);
  const impressions = insights.reduce((sum, item) => sum + item.impressions, 0);
  const clicks = insights.reduce((sum, item) => sum + item.clicks, 0);
  const conversions = insights.reduce((sum, item) => sum + item.conversions, 0);
  const conversionValue = insights.reduce((sum, item) => sum + (item.conversionValue || 0), 0);

  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    conversions,
    costPerConversion: conversions > 0 ? spend / conversions : null,
    conversionValue,
    roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
  };
}

function getDateRange(datePreset: string, dateStart: string | null, dateEnd: string | null) {
  if (dateStart && dateEnd) return { start: dateStart, end: dateEnd };

  const today = new Date();
  const end = formatDate(today);
  const startDate = new Date(today);

  if (datePreset === 'last_30d') startDate.setDate(today.getDate() - 29);
  else if (datePreset === 'last_60d') startDate.setDate(today.getDate() - 59);
  else if (datePreset === 'yesterday') {
    startDate.setDate(today.getDate() - 1);
    return { start: formatDate(startDate), end: formatDate(startDate) };
  }
  else if (datePreset === 'today') startDate.setDate(today.getDate());
  else startDate.setDate(today.getDate() - 6);

  return { start: formatDate(startDate), end };
}

function parseCampaignIds(campaignIds: string | null): string[] {
  if (!campaignIds) return [];
  return campaignIds
    .split(',')
    .map((id) => normalizeCustomerId(id))
    .filter(Boolean);
}

function microsToCurrency(value: string | number | null | undefined): number {
  return numberValue(value) / 1_000_000;
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
