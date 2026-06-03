import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { googleAdsSearch, normalizeCustomerId } from '../_shared/googleAds.ts';
import { ensureGoogleAccessToken } from '../_shared/googleConnection.ts';

const GRAPH_VERSION = Deno.env.get('FACEBOOK_GRAPH_VERSION') || 'v23.0';
const TIME_ZONE = 'America/Sao_Paulo';
const MAX_DAYS_BACK = 7;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Platform = 'meta' | 'google';

type PlatformAccount = {
  id: string;
  user_id: string;
  connection_id: string;
  platform: Platform;
  external_account_id: string;
  name: string;
  is_active: boolean;
};

type AdConnection = {
  id: string;
  user_id: string;
  platform: Platform;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: string | null;
};

type InsightSnapshot = {
  user_id: string;
  account_id: string;
  campaign_id: string | null;
  platform: Platform;
  date_start: string;
  date_end: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cost_per_conversion: number | null;
  conversion_value: number | null;
  roas: number | null;
  raw: unknown;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const auth = await authorizeSchedulerRequest(req, supabaseUrl, serviceRoleKey);
    if (!auth.authorized) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const platforms = parsePlatforms(body?.platforms);
    const dates = resolveCollectionDates(body);
    const userId = typeof body?.userId === 'string' && body.userId ? body.userId : auth.userId;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const accounts = await listAccounts(supabase, platforms, userId);
    const connections = await listConnections(supabase, accounts);

    const result = {
      dryRun,
      dates,
      accountsFound: accounts.length,
      accountsProcessed: 0,
      snapshotsWritten: 0,
      skipped: [] as Array<{ accountId: string; platform: Platform; reason: string }>,
      errors: [] as Array<{ accountId: string; platform: Platform; message: string }>,
    };

    for (const account of accounts) {
      const connection = connections.get(account.connection_id);
      if (!connection) {
        result.skipped.push({ accountId: account.id, platform: account.platform, reason: 'connection_not_found' });
        continue;
      }

      if (connection.status && connection.status !== 'active') {
        result.skipped.push({ accountId: account.id, platform: account.platform, reason: `connection_${connection.status}` });
        continue;
      }

      try {
        for (const date of dates) {
          const snapshots = account.platform === 'google'
            ? await collectGoogleSnapshots(supabase, account, connection, date)
            : await collectMetaSnapshots(supabase, account, connection, date);

          result.accountsProcessed += 1;
          if (!dryRun) {
            await replaceSnapshots(supabase, account, date, snapshots);
          }
          result.snapshotsWritten += snapshots.length;
        }
      } catch (error) {
        result.errors.push({
          accountId: account.id,
          platform: account.platform,
          message: safeErrorMessage(error),
        });
      }
    }

    return jsonResponse(result);
  } catch (error) {
    console.error('daily-snapshots failed:', safeErrorMessage(error));
    return jsonResponse({ error: safeErrorMessage(error) }, 500);
  }
});

async function listAccounts(supabase: any, platforms: Platform[], userId?: string): Promise<PlatformAccount[]> {
  let query = supabase
    .from('ad_platform_accounts')
    .select('id,user_id,connection_id,platform,external_account_id,name,is_active')
    .eq('is_active', true)
    .in('platform', platforms);

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PlatformAccount[];
}

async function listConnections(supabase: any, accounts: PlatformAccount[]): Promise<Map<string, AdConnection>> {
  const ids = [...new Set(accounts.map((account) => account.connection_id).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('ad_connections')
    .select('id,user_id,platform,access_token,refresh_token,token_expires_at,status')
    .in('id', ids);
  if (error) throw error;

  return new Map(((data || []) as AdConnection[]).map((connection) => [connection.id, connection]));
}

async function collectGoogleSnapshots(
  supabase: any,
  account: PlatformAccount,
  connection: AdConnection,
  date: string,
): Promise<InsightSnapshot[]> {
  if (!connection.refresh_token) throw new Error('Google refresh token is missing. Reconnect Google Ads.');

  const accessToken = await ensureGoogleAccessToken(supabase, connection);
  const externalAccountId = normalizeCustomerId(account.external_account_id);
  const rows = await googleAdsSearch({
    accessToken,
    customerId: externalAccountId,
    query: `
      select
        segments.date,
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
      where segments.date = '${date}'
        and campaign.status != 'REMOVED'
    `,
  });

  const campaignMap = await campaignIdMap(supabase, account.id, 'google');
  const snapshots = rows.map((row: any) => {
    const spend = microsToCurrency(row.metrics?.costMicros);
    const conversions = numberValue(row.metrics?.conversions);
    const conversionValue = numberValue(row.metrics?.conversionsValue);
    const campaignExternalId = String(row.campaign?.id || '');

    return {
      user_id: account.user_id,
      account_id: account.id,
      campaign_id: campaignMap.get(campaignExternalId) || null,
      platform: 'google' as const,
      date_start: date,
      date_end: date,
      spend,
      impressions: integerValue(row.metrics?.impressions),
      clicks: integerValue(row.metrics?.clicks),
      ctr: numberValue(row.metrics?.ctr) * 100,
      cpc: microsToCurrency(row.metrics?.averageCpc),
      cpm: microsToCurrency(row.metrics?.averageCpm),
      conversions,
      cost_per_conversion: conversions > 0 ? spend / conversions : null,
      conversion_value: conversionValue,
      roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
      raw: row,
    };
  });

  return snapshots.length > 0 ? snapshots : [emptySnapshot(account, date)];
}

async function collectMetaSnapshots(
  supabase: any,
  account: PlatformAccount,
  connection: AdConnection,
  date: string,
): Promise<InsightSnapshot[]> {
  if (!connection.access_token) throw new Error('Meta access token is missing. Reconnect Meta Ads.');
  if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
    throw new Error('Meta access token expired. Reconnect Meta Ads.');
  }

  const externalAccountId = normalizeMetaAccountId(account.external_account_id);
  const payload = await graphGet(`${externalAccountId}/insights`, connection.access_token, {
    fields: 'campaign_id,campaign_name,impressions,clicks,ctr,cpc,cpm,spend,actions,cost_per_action_type',
    level: 'campaign',
    time_range: JSON.stringify({ since: date, until: date }),
  });

  const campaignMap = await campaignIdMap(supabase, account.id, 'meta');
  const snapshots = (payload.data || []).map((row: any) => {
    const actions = row.actions || [];
    const leads = integerValue(actionValue(actions, 'lead'));
    const purchases = integerValue(actionValue(actions, 'purchase'));
    const messaging = integerValue(actionValue(actions, 'onsite_conversion.messaging_conversation_started_7d'));
    const conversions = leads + purchases + messaging;
    const spend = numberValue(row.spend);

    return {
      user_id: account.user_id,
      account_id: account.id,
      campaign_id: campaignMap.get(String(row.campaign_id || '')) || null,
      platform: 'meta' as const,
      date_start: date,
      date_end: date,
      spend,
      impressions: integerValue(row.impressions),
      clicks: integerValue(row.clicks),
      ctr: numberValue(row.ctr),
      cpc: numberValue(row.cpc),
      cpm: numberValue(row.cpm),
      conversions,
      cost_per_conversion: conversions > 0 ? spend / conversions : null,
      conversion_value: null,
      roas: null,
      raw: row,
    };
  });

  return snapshots.length > 0 ? snapshots : [emptySnapshot(account, date)];
}

async function campaignIdMap(supabase: any, accountId: string, platform: Platform): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('ad_platform_campaigns')
    .select('id,external_campaign_id')
    .eq('account_id', accountId)
    .eq('platform', platform);
  if (error) throw error;

  return new Map((data || []).map((campaign: any) => [String(campaign.external_campaign_id), campaign.id]));
}

async function replaceSnapshots(
  supabase: any,
  account: PlatformAccount,
  date: string,
  snapshots: InsightSnapshot[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('ad_insights_snapshots')
    .delete()
    .eq('user_id', account.user_id)
    .eq('account_id', account.id)
    .eq('platform', account.platform)
    .eq('date_start', date)
    .eq('date_end', date);
  if (deleteError) throw deleteError;

  if (snapshots.length === 0) return;

  const { error: insertError } = await supabase
    .from('ad_insights_snapshots')
    .insert(snapshots);
  if (insertError) throw insertError;
}

function emptySnapshot(account: PlatformAccount, date: string): InsightSnapshot {
  return {
    user_id: account.user_id,
    account_id: account.id,
    campaign_id: null,
    platform: account.platform,
    date_start: date,
    date_end: date,
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    conversions: 0,
    cost_per_conversion: null,
    conversion_value: null,
    roas: null,
    raw: { empty: true, collected_by: 'daily-snapshots' },
  };
}

async function graphGet(path: string, accessToken: string, params: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Meta API request failed');
  return payload;
}

function resolveCollectionDates(body: any): string[] {
  if (typeof body?.dateStart === 'string' && typeof body?.dateEnd === 'string') {
    return dateRange(body.dateStart, body.dateEnd).slice(0, MAX_DAYS_BACK);
  }

  if (typeof body?.date === 'string' && isIsoDate(body.date)) return [body.date];

  const daysBack = clampInteger(body?.daysBack, 1, MAX_DAYS_BACK, 2);
  const today = typeof body?.today === 'string' && isIsoDate(body.today)
    ? body.today
    : zonedIsoDate(new Date(), TIME_ZONE);
  const end = addIsoDays(today, -1);
  const start = addIsoDays(end, -(daysBack - 1));
  return dateRange(start, end);
}

function dateRange(start: string, end: string): string[] {
  if (!isIsoDate(start) || !isIsoDate(end) || start > end) throw new Error('Invalid date range');

  const dates: string[] = [];
  let current = start;
  while (current <= end && dates.length < MAX_DAYS_BACK) {
    dates.push(current);
    current = addIsoDays(current, 1);
  }
  return dates;
}

function parsePlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) return ['meta', 'google'];
  const platforms = value.filter((item): item is Platform => item === 'meta' || item === 'google');
  return platforms.length > 0 ? platforms : ['meta', 'google'];
}

async function authorizeSchedulerRequest(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ authorized: boolean; userId?: string }> {
  const configuredSchedulerSecret = Deno.env.get('DAILY_SNAPSHOTS_SECRET') || Deno.env.get('SCHEDULED_REPORTS_SECRET') || '';
  const providedSchedulerSecret = req.headers.get('x-scheduler-secret') || '';
  if (configuredSchedulerSecret && providedSchedulerSecret === configuredSchedulerSecret) {
    return { authorized: true };
  }

  const authorization = req.headers.get('Authorization') || '';
  if (authorization === `Bearer ${serviceRoleKey}`) return { authorized: true };

  const token = authorization.replace('Bearer ', '').trim();
  if (!token) return { authorized: false };

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { authorized: false };
  return { authorized: true, userId: data.user.id };
}

function normalizeMetaAccountId(accountId: string): string {
  const clean = String(accountId || '').trim();
  if (!clean) return '';
  return clean.startsWith('act_') ? clean : `act_${clean.replace(/\D/g, '')}`;
}

function actionValue(actions: any[], type: string): string | number | null {
  return actions.find((action) => action.action_type === type)?.value ?? null;
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

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function zonedIsoDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new Error('Failed to resolve collection date');
  return `${year}-${month}-${day}`;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected daily snapshots error.';
}
