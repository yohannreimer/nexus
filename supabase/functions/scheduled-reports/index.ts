import { runScheduledReports } from '../_shared/reportEngine.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Scheduled reports are not configured.');
    }

    if (!(await isAuthorizedSchedulerRequest(req, supabaseUrl, serviceRoleKey))) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const result = await runScheduledReports({
      supabaseUrl,
      serviceRoleKey,
      nowIso: new Date().toISOString(),
      dryRun,
    });

    return jsonResponse(result);
  } catch (error) {
    console.error('Scheduled reports failed:', safeErrorMessage(error));
    return jsonResponse({ error: safeErrorMessage(error) }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected scheduled reports error.';
}

async function isAuthorizedSchedulerRequest(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<boolean> {
  const configuredSchedulerSecret = Deno.env.get('SCHEDULED_REPORTS_SECRET') || '';
  const providedSchedulerSecret = req.headers.get('x-scheduler-secret') || '';
  if (configuredSchedulerSecret && providedSchedulerSecret === configuredSchedulerSecret) {
    return true;
  }

  const authorization = req.headers.get('Authorization') || '';
  if (authorization === `Bearer ${serviceRoleKey}`) return true;

  const token = authorization.replace('Bearer ', '').trim();
  if (!token) return false;

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}
