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
    const { supabase, user } = await authenticatedSupabase(req);
    const connection = await getMetaConnection(supabase, user.id);
    const accountsData = await graphGet(
      `me/adaccounts?fields=id,name,currency,account_status,business_name,amount_spent,timezone_name&limit=100`,
      connection.access_token,
    );

    const savedClients = await getSavedClients(supabase, user.id);
    const clientMap = new Map((savedClients || []).map((client: any) => [normalizeAccountId(client.ad_account_id), client]));

    const rows = (accountsData.data || []).map((account: any) => {
      const externalAccountId = normalizeAccountId(account.id);
      return {
        user_id: user.id,
        connection_id: connection.id,
        platform: 'meta',
        external_account_id: externalAccountId,
        name: account.name || account.business_name || `Meta Ads ${externalAccountId}`,
        currency: account.currency || 'BRL',
        timezone: account.timezone_name || null,
        status: String(account.account_status || 'active'),
        is_active: isActiveAccount(account.account_status),
        metadata: {
          graphId: account.id,
          amountSpent: account.amount_spent || null,
          businessName: account.business_name || null,
        },
        updated_at: new Date().toISOString(),
      };
    });

    let savedRows: any[] = [];
    if (rows.length > 0) {
      const { data, error } = await supabase
        .from('ad_platform_accounts')
        .upsert(rows, { onConflict: 'user_id,platform,external_account_id' })
        .select('*');
      if (error) throw error;
      savedRows = data || [];
    }

    return json({
      data: savedRows.map((row) => {
        const saved = clientMap.get(normalizeAccountId(row.external_account_id));
        return {
          id: row.external_account_id,
          platform: 'meta',
          externalAccountId: row.external_account_id,
          name: row.name,
          currency: row.currency || 'BRL',
          timezone: row.timezone,
          status: row.status,
          accountStatus: Number(row.status) || 1,
          amountSpent: row.metadata?.amountSpent || null,
          isConfigured: !!saved && !!saved.is_active,
          whatsappTarget: saved?.whatsapp_number || '',
          selectedCampaignIds: saved?.selected_campaign_ids || [],
          lastReportSent: saved?.last_report_sent || null,
          clientId: saved?.id || null,
          metadata: row.metadata,
        };
      }),
    });
  } catch (error) {
    console.error('facebook-accounts error:', error);
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

async function getSavedClients(supabase: any, userId: string) {
  const { data } = await supabase.from('clients').select('*').eq('user_id', userId);
  return data || [];
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
  return clean.startsWith('act_') ? clean : `act_${clean.replace(/\D/g, '')}`;
}

function isActiveAccount(status: string | number | null | undefined): boolean {
  return Number(status || 1) === 1;
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
