// Edge Function: send-webhook
// Sends manual reports and versioned scheduled report payloads to N8N/WhatsApp.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

class WebhookRequestError extends Error {
  response: Record<string, unknown>;

  constructor(message: string, response: Record<string, unknown>) {
    super(message);
    this.name = 'WebhookRequestError';
    this.response = response;
  }
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const body = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    if (isV2Payload(body)) {
      return await handleV2Payload(supabase, user.id, body);
    }

    return await handleManualPayload(supabase, user.id, body);
  } catch (error) {
    console.error('Error sending webhook:', safeErrorMessage(error));
    return jsonResponse({ error: safeErrorMessage(error) }, error instanceof HttpError ? error.status : 400);
  }
});

async function handleManualPayload(supabase: any, userId: string, body: any): Promise<Response> {
  const { webhookUrl, whatsappNumber, reportContent, clientName, adAccountId, adAccountName } = body;

  if (!webhookUrl && !whatsappNumber) {
    throw new Error('Missing webhookUrl or whatsappNumber');
  }

  if (!reportContent) {
    throw new Error('Missing reportContent');
  }

  const targetWebhook = await resolveWebhookTarget(supabase, userId, webhookUrl);
  if (!targetWebhook) {
    throw new Error('No webhook URL configured. Set N8N_WEBHOOK_URL in Edge Function secrets.');
  }

  const payload = {
    timestamp: new Date().toISOString(),
    userId,
    client: {
      name: clientName || 'Cliente',
      whatsapp: whatsappNumber,
    },
    adAccount: {
      id: adAccountId,
      name: adAccountName,
    },
    report: reportContent,
    source: 'nexus-ai',
    version: '1.0',
  };

  await postWebhook(targetWebhook, payload);

  const { error: logError } = await supabase.from('report_logs').insert({
    user_id: userId,
    ad_account_id: adAccountId,
    status: 'sent',
    message_preview: reportContent.slice(0, 500),
    webhook_response: {
      sentTo: safeDeliveryTarget(whatsappNumber),
      sentVia: whatsappNumber ? 'whatsapp' : 'webhook',
    },
  });

  if (logError) {
    console.warn('Could not write report log:', logError.message);
  }

  const { error: clientUpdateError } = await supabase
    .from('clients')
    .update({ last_report_sent: new Date().toISOString() })
    .eq('ad_account_id', adAccountId)
    .eq('user_id', userId);

  if (clientUpdateError) {
    console.warn('Could not update last_report_sent:', clientUpdateError.message);
  }

  return jsonResponse({
    success: true,
    message: 'Report sent successfully',
    sentTo: safeDeliveryTarget(whatsappNumber),
  });
}

async function handleV2Payload(supabase: any, userId: string, body: any): Promise<Response> {
  validateV2Payload(body);

  if (body.reportRunId) {
    await validateStoredReportRun(supabase, userId, body);
  }

  const targetWebhook = await resolveWebhookTarget(supabase, userId, body.webhookUrl);
  if (!targetWebhook) {
    throw new Error('No webhook URL configured. Set N8N_WEBHOOK_URL in Edge Function secrets.');
  }

  const payload = {
    timestamp: new Date().toISOString(),
    userId,
    source: body.source,
    version: body.version,
    reportRunId: body.reportRunId,
    phone: body.phone,
    message: body.message,
    client: body.client,
    period: body.period,
    metrics: body.metrics,
    portalLink: body.portalLink ?? null,
    report: body.report,
  };

  try {
    const webhookResponse = await postWebhook(targetWebhook, payload);

    if (body.reportRunId) {
      await updateOwnedReportRun(supabase, userId, body.reportRunId, {
        status: 'sent',
        webhook_target: targetWebhook,
        webhook_response: webhookResponse,
        error_message: null,
        attempt_count: 1,
        sent_at: new Date().toISOString(),
      });
    }

    return jsonResponse({
      success: true,
      message: 'Report sent successfully',
      sentTo: safeDeliveryTarget(body.phone),
    });
  } catch (error) {
    if (body.reportRunId) {
      const webhookResponse = getWebhookFailureResponse(error);
      const patch: Record<string, unknown> = {
        status: 'failed',
        webhook_target: targetWebhook,
        error_message: safeErrorMessage(error),
        attempt_count: 1,
      };
      if (webhookResponse) {
        patch.webhook_response = webhookResponse;
      }

      await updateOwnedReportRun(supabase, userId, body.reportRunId, {
        ...patch,
      }).catch((updateError: unknown) => {
        console.warn('Could not update report run after webhook failure:', safeErrorMessage(updateError));
      });
    }

    throw error;
  }
}

async function validateStoredReportRun(supabase: any, userId: string, body: any): Promise<void> {
  const { data: run, error } = await supabase
    .from('client_report_runs')
    .select('id,user_id,client_id,period_start,period_end,deterministic_message')
    .eq('id', body.reportRunId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Could not validate report run: ${error.message}`);
  }

  if (!run) {
    throw new HttpError(404, 'Report run not found');
  }

  if (run.deterministic_message && run.deterministic_message !== body.message) {
    throw new HttpError(400, 'Report run message does not match stored content');
  }

  if (body.period) {
    if (run.period_start && run.period_start !== body.period.start) {
      throw new HttpError(400, 'Report run period start does not match stored content');
    }

    if (run.period_end && run.period_end !== body.period.end) {
      throw new HttpError(400, 'Report run period end does not match stored content');
    }
  }

  if (run.client_id && body.client?.id && run.client_id !== body.client.id) {
    throw new HttpError(400, 'Report run client does not match stored content');
  }
}

async function resolveWebhookTarget(supabase: any, userId: string, incomingWebhookUrl?: string): Promise<string | null> {
  const incoming = normalizeOptionalUrl(incomingWebhookUrl);
  if (incoming) return incoming;

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('default_webhook_url')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: agencyConfig } = await supabase
    .from('agency_config')
    .select('"webhookUrl"')
    .eq('user_id', userId)
    .maybeSingle();

  return normalizeOptionalUrl(userSettings?.default_webhook_url)
    || normalizeOptionalUrl(agencyConfig?.webhookUrl)
    || normalizeOptionalUrl(Deno.env.get('N8N_WEBHOOK_URL'))
    || normalizeOptionalUrl(Deno.env.get('DEFAULT_WEBHOOK_URL'));
}

async function postWebhook(targetWebhook: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const webhookResponse = await fetch(targetWebhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await webhookResponse.text();
  const parsedBody = parseJsonOrText(responseText);

  if (!webhookResponse.ok) {
    throw new WebhookRequestError(`Webhook failed: ${webhookResponse.status}`, {
      ok: webhookResponse.ok,
      status: webhookResponse.status,
      body: parsedBody,
    });
  }

  return {
    ok: webhookResponse.ok,
    status: webhookResponse.status,
    body: parsedBody,
  };
}

async function updateOwnedReportRun(
  supabase: any,
  userId: string,
  reportRunId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('client_report_runs')
    .update(patch)
    .eq('id', reportRunId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Could not update report run: ${error.message}`);
  }
}

function isV2Payload(body: any): boolean {
  return body?.version === '2' || body?.source === 'nexus-ai-scheduled' || Boolean(body?.reportRunId);
}

function validateV2Payload(body: any): void {
  const requiredFields = ['source', 'version', 'phone', 'message', 'client', 'period', 'metrics', 'report'];
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      throw new Error(`Missing ${field}`);
    }
  }
}

function safeDeliveryTarget(phone?: string | null): string {
  return String(phone || '').trim() || 'webhook';
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function parseJsonOrText(value: string): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value.slice(0, 2000);
  }
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected webhook error.';
}

function getWebhookFailureResponse(error: unknown): Record<string, unknown> | null {
  return error instanceof WebhookRequestError ? error.response : null;
}
