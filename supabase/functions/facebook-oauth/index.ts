import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GRAPH_VERSION = Deno.env.get('FACEBOOK_GRAPH_VERSION') || 'v23.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const redirectUri = Deno.env.get('FACEBOOK_REDIRECT_URI') || `${requiredEnv('SUPABASE_URL')}/functions/v1/facebook-oauth`;
  const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'));

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error') || url.searchParams.get('error_message');

    if (oauthError) return redirectWithStatus(oauthError, false);

    if (!code) {
      const user = await getAuthenticatedUser(req, supabase);
      await supabase.from('ad_oauth_states').delete().lt('expires_at', new Date().toISOString());

      const nextState = crypto.randomUUID();
      const redirectTo = url.searchParams.get('redirect_to') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: stateError } = await supabase.from('ad_oauth_states').insert({
        state: nextState,
        user_id: user.id,
        platform: 'meta',
        redirect_to: redirectTo,
        expires_at: expiresAt,
      });
      if (stateError) throw stateError;

      const loginUrl = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
      loginUrl.searchParams.set('client_id', requiredEnv('FACEBOOK_APP_ID'));
      loginUrl.searchParams.set('redirect_uri', redirectUri);
      loginUrl.searchParams.set('state', nextState);
      loginUrl.searchParams.set('scope', 'ads_read,read_insights,business_management');
      loginUrl.searchParams.set('response_type', 'code');

      return json({ loginUrl: loginUrl.toString(), expiresAt });
    }

    if (!state) throw new Error('Missing OAuth state');

    const { data: savedState, error: stateError } = await supabase
      .from('ad_oauth_states')
      .select('state,user_id,redirect_to,expires_at')
      .eq('state', state)
      .eq('platform', 'meta')
      .single();

    if (stateError || !savedState) throw new Error('Invalid OAuth state');
    if (new Date(savedState.expires_at) < new Date()) {
      await supabase.from('ad_oauth_states').delete().eq('state', state);
      throw new Error('OAuth state expired. Please connect Meta Ads again.');
    }

    const shortLivedToken = await exchangeCodeForToken(code, redirectUri);
    const longLived = await exchangeForLongLivedToken(shortLivedToken);
    const expiresIn = Number(longLived.expires_in || 5184000);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const profile = await fetchFacebookProfile(longLived.access_token);

    const { error: upsertError } = await supabase.from('ad_connections').upsert({
      user_id: savedState.user_id,
      platform: 'meta',
      external_user_id: profile?.id || null,
      external_user_name: profile?.name || profile?.email || null,
      access_token: longLived.access_token,
      refresh_token: null,
      token_expires_at: expiresAt,
      scopes: ['ads_read', 'read_insights', 'business_management'],
      status: 'active',
      metadata: {
        email: profile?.email || null,
        tokenType: longLived.token_type || 'bearer',
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });
    if (upsertError) throw upsertError;

    await supabase.from('facebook_connections').upsert({
      user_id: savedState.user_id,
      facebook_user_id: profile?.id || null,
      facebook_name: profile?.name || null,
      facebook_email: profile?.email || null,
      access_token: longLived.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    await supabase.from('ad_oauth_states').delete().eq('state', state);

    const frontendUrl = savedState.redirect_to || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    return Response.redirect(`${frontendUrl}?facebook_connected=1`, 302);
  } catch (error) {
    console.error('facebook-oauth error:', error);
    const message = error instanceof Error ? error.message : 'Facebook OAuth failed';
    return redirectWithStatus(message, false);
  }
});

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', requiredEnv('FACEBOOK_APP_ID'));
  tokenUrl.searchParams.set('client_secret', requiredEnv('FACEBOOK_APP_SECRET'));
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const response = await fetch(tokenUrl.toString());
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Failed to get Facebook access token');
  return payload.access_token;
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<any> {
  const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
  tokenUrl.searchParams.set('client_id', requiredEnv('FACEBOOK_APP_ID'));
  tokenUrl.searchParams.set('client_secret', requiredEnv('FACEBOOK_APP_SECRET'));
  tokenUrl.searchParams.set('fb_exchange_token', shortLivedToken);

  const response = await fetch(tokenUrl.toString());
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Failed to get long-lived Facebook token');
  return payload;
}

async function fetchFacebookProfile(accessToken: string): Promise<any | null> {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name,email&access_token=${accessToken}`);
  if (!response.ok) return null;
  return response.json();
}

async function getAuthenticatedUser(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid Supabase session');
  return user;
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function redirectWithStatus(message: string, success: boolean) {
  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
  const param = success ? 'facebook_connected' : 'facebook_error';
  return Response.redirect(`${frontendUrl}?${param}=${encodeURIComponent(message)}`, 302);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
