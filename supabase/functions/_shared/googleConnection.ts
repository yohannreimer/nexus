import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { refreshAccessToken, requiredEnv } from './googleAds.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export async function authenticatedSupabase(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');

  const supabase = createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid or expired token');

  return { supabase, user };
}

export async function getGoogleConnection(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('ad_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'google')
    .single();

  if (error || !data) throw new Error('Google Ads is not connected');
  if (!data.refresh_token) throw new Error('Google refresh token is missing. Reconnect Google Ads.');

  return data;
}

export async function ensureGoogleAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (connection.access_token && expiresAt > Date.now() + 60_000) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  const { error } = await supabase
    .from('ad_connections')
    .update({
      access_token: refreshed.access_token,
      token_expires_at: tokenExpiresAt,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  if (error) throw error;
  return refreshed.access_token;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}
