import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { exchangeCodeForTokens, requiredEnv } from '../_shared/googleAds.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || `${requiredEnv('SUPABASE_URL')}/functions/v1/google-oauth`;

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    );

    if (oauthError) {
      return redirectWithStatus(oauthError, false);
    }

    if (!code) {
      const user = await getAuthenticatedUser(req, supabase);
      await supabase.from('ad_oauth_states').delete().lt('expires_at', new Date().toISOString());

      const nextState = crypto.randomUUID();
      const redirectTo = url.searchParams.get('redirect_to') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: stateError } = await supabase.from('ad_oauth_states').insert({
        state: nextState,
        user_id: user.id,
        platform: 'google',
        redirect_to: redirectTo,
        expires_at: expiresAt,
      });

      if (stateError) throw stateError;

      const loginUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      loginUrl.searchParams.set('client_id', requiredEnv('GOOGLE_CLIENT_ID'));
      loginUrl.searchParams.set('redirect_uri', redirectUri);
      loginUrl.searchParams.set('response_type', 'code');
      loginUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/adwords');
      loginUrl.searchParams.set('access_type', 'offline');
      loginUrl.searchParams.set('prompt', 'consent');
      loginUrl.searchParams.set('state', nextState);

      return json({ loginUrl: loginUrl.toString(), expiresAt });
    }

    if (!state) {
      throw new Error('Missing OAuth state');
    }

    const { data: savedState, error: stateError } = await supabase
      .from('ad_oauth_states')
      .select('state,user_id,redirect_to,expires_at')
      .eq('state', state)
      .eq('platform', 'google')
      .single();

    if (stateError || !savedState) {
      throw new Error('Invalid OAuth state');
    }

    if (new Date(savedState.expires_at) < new Date()) {
      await supabase.from('ad_oauth_states').delete().eq('state', state);
      throw new Error('OAuth state expired. Please connect Google Ads again.');
    }

    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const existingConnection = await getExistingConnection(supabase, savedState.user_id);
    const refreshToken = tokens.refresh_token || existingConnection?.refresh_token;

    if (!refreshToken) {
      throw new Error('Google did not return a refresh token. Please revoke access and connect again.');
    }

    const profile = await fetchGoogleProfile(tokens.access_token);

    const { error: upsertError } = await supabase.from('ad_connections').upsert({
      user_id: savedState.user_id,
      platform: 'google',
      external_user_id: profile?.id || existingConnection?.external_user_id || null,
      external_user_name: profile?.name || profile?.email || existingConnection?.external_user_name || null,
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
      scopes: tokens.scope ? tokens.scope.split(' ') : ['https://www.googleapis.com/auth/adwords'],
      status: 'active',
      metadata: {
        tokenType: tokens.token_type,
        email: profile?.email || null,
        picture: profile?.picture || null,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

    if (upsertError) throw upsertError;

    await supabase.from('ad_oauth_states').delete().eq('state', state);

    const frontendUrl = savedState.redirect_to || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    return Response.redirect(`${frontendUrl}?google_connected=1`, 302);
  } catch (error) {
    console.error('google-oauth error:', error);
    const message = error instanceof Error ? error.message : 'Google OAuth failed';
    return redirectWithStatus(message, false);
  }
});

async function getAuthenticatedUser(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid Supabase session');

  return user;
}

async function getExistingConnection(supabase: any, userId: string) {
  const { data } = await supabase
    .from('ad_connections')
    .select('refresh_token,external_user_id,external_user_name')
    .eq('user_id', userId)
    .eq('platform', 'google')
    .maybeSingle();

  return data;
}

async function fetchGoogleProfile(accessToken: string): Promise<any | null> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;
  return response.json();
}

function redirectWithStatus(message: string, success: boolean) {
  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
  const param = success ? 'google_connected' : 'google_error';
  return Response.redirect(`${frontendUrl}?${param}=${encodeURIComponent(message)}`, 302);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
