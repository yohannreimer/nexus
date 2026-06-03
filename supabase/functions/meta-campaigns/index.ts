import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GRAPH_VERSION = Deno.env.get('FACEBOOK_GRAPH_VERSION') || 'v23.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const accountId = normalizeAccountId(url.searchParams.get('account_id') || '');
    if (!accountId) throw new Error('Missing account_id parameter');

    const { supabase, user } = await authenticatedSupabase(req);
    const connection = await getMetaConnection(supabase, user.id);
    const account = await getSavedAccount(supabase, user.id, accountId);
    const campaignsData = await graphGet(
      `${accountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=100`,
      connection.access_token,
    );

    const campaignRows = (campaignsData.data || []).map((campaign: any) => ({
      user_id: user.id,
      account_id: account.id,
      platform: 'meta',
      external_campaign_id: String(campaign.id),
      name: campaign.name || `Campanha ${campaign.id}`,
      status: campaign.effective_status || campaign.status || 'UNKNOWN',
      objective: campaign.objective || null,
      channel_type: null,
      metadata: {
        dailyBudget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null,
        lifetimeBudget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : null,
        startTime: campaign.start_time || null,
        stopTime: campaign.stop_time || null,
      },
      updated_at: new Date().toISOString(),
    }));

    let savedRows: any[] = [];
    if (campaignRows.length > 0) {
      const { data, error } = await supabase
        .from('ad_platform_campaigns')
        .upsert(campaignRows, { onConflict: 'account_id,platform,external_campaign_id' })
        .select('*');
      if (error) throw error;
      savedRows = data || [];
    }

    return json({
      data: savedRows.map((row) => ({
        id: row.external_campaign_id,
        platform: 'meta',
        externalCampaignId: row.external_campaign_id,
        name: row.name,
        status: row.status,
        objective: row.objective,
        channelType: row.channel_type,
        dailyBudget: row.metadata?.dailyBudget || null,
        lifetimeBudget: row.metadata?.lifetimeBudget || null,
        startTime: row.metadata?.startTime || null,
        stopTime: row.metadata?.stopTime || null,
        metadata: row.metadata,
      })),
    });
  } catch (error) {
    console.error('facebook-campaigns error:', error);
    return json({ error: errorMessage(error) }, 400);
  }
});

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

async function graphGet(path: string, accessToken: string) {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}${separator}access_token=${accessToken}`);
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Meta API request failed');
  return payload;
}

function normalizeAccountId(accountId: string): string {
  const clean = String(accountId || '').trim();
  if (!clean) return '';
  return clean.startsWith('act_') ? clean : `act_${clean.replace(/\D/g, '')}`;
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
