import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type RunScheduledReportsInput = {
  supabaseUrl: string;
  serviceRoleKey: string;
  nowIso: string;
  dryRun: boolean;
};

type RunScheduledReportsResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  runIds: string[];
};

type ReportSetting = {
  id: string;
  user_id: string;
  client_id: string;
  default_period: string;
  send_time: string;
  timezone: string | null;
  delivery_enabled: boolean;
  delivery_frequency: string | null;
  weekly_day: number | null;
  monthly_day: number | null;
  delivery_target: string | null;
  webhook_url: string | null;
  default_report_mode: string | null;
};

type PendingReportRun = {
  id: string;
  user_id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  status: string;
  report_mode: string | null;
  execution_type: string | null;
  idempotency_key: string | null;
  scheduled_for: string | null;
};

type AgencyClient = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  primary_whatsapp: string | null;
};

type ClientAccountLink = {
  id: string;
  user_id: string;
  client_id: string;
  account_id: string;
  platform: string;
  is_active: boolean;
};

type PlatformAccount = {
  id: string;
  user_id: string;
  platform: string;
  external_account_id: string;
  name: string;
  currency: string | null;
  timezone: string | null;
  status: string | null;
  is_active: boolean | null;
};

type InsightSnapshot = {
  id: string;
  user_id: string;
  account_id: string;
  campaign_id: string | null;
  platform: string;
  date_start: string;
  date_end: string;
  spend: number | string | null;
  impressions: number | string | null;
  clicks: number | string | null;
  ctr: number | string | null;
  cpc: number | string | null;
  cpm: number | string | null;
  conversions: number | string | null;
  cost_per_conversion: number | string | null;
  conversion_value: number | string | null;
  roas: number | string | null;
  raw: Record<string, unknown> | null;
};

type Campaign = {
  id: string;
  account_id: string;
  platform: string;
  external_campaign_id: string;
  name: string;
};

type Metrics = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number | null;
  conversionValue: number;
  roas: number | null;
};

type CampaignSummary = Metrics & {
  campaignId: string | null;
  campaignName: string;
  platform: string;
  accountId: string;
  accountName: string;
};

type WebhookCacheEntry = {
  userDefault: string | null;
  agencyDefault: string | null;
};

class WebhookRequestError extends Error {
  response: Record<string, unknown>;

  constructor(message: string, response: Record<string, unknown>) {
    super(message);
    this.name = 'WebhookRequestError';
    this.response = response;
  }
}

class RunClaimSkipped extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunClaimSkipped';
  }
}

const DUPLICATE_STATUSES = ['processing', 'generated', 'sent', 'sent_with_warnings'];
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const DEFAULT_PERIOD = 'last_30d';

export async function runScheduledReports(input: RunScheduledReportsInput): Promise<RunScheduledReportsResult> {
  const supabase = createClient(input.supabaseUrl, input.serviceRoleKey);
  const now = new Date(input.nowIso);
  const result: RunScheduledReportsResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    runIds: [],
  };

  const { data: settings, error } = await supabase
    .from('client_report_settings')
    .select('*')
    .eq('delivery_enabled', true);

  if (error) {
    throw new Error(`Unable to load scheduled report settings: ${error.message}`);
  }

  const webhookCache = new Map<string, WebhookCacheEntry>();
  const attemptedRunIds = new Set<string>();
  const attemptedIdempotencyKeys = new Set<string>();

  // Pending retry runs are user-triggered and should not wait for the schedule minute to be due again.
  const pendingRetries = await loadPendingRetryRuns(supabase);
  for (const pendingRun of pendingRetries) {
    attemptedRunIds.add(pendingRun.id);
    if (pendingRun.idempotency_key) {
      attemptedIdempotencyKeys.add(pendingRun.idempotency_key);
    }
    await processPendingRetryRun(supabase, pendingRun, input, result, webhookCache);
  }

  for (const setting of (settings || []) as ReportSetting[]) {
    try {
      const due = evaluateDueState(setting, now);
      if (!due.due) {
        result.skipped += 1;
        continue;
      }

      const period = calculateReportPeriod(setting.default_period, due.localDate);
      const idempotencyKey = [
        setting.client_id,
        normalizeFrequency(setting.delivery_frequency),
        due.scheduledFor,
        period.start,
        period.end,
      ].join(':');

      if (attemptedIdempotencyKeys.has(idempotencyKey)) {
        result.skipped += 1;
        continue;
      }

      const { data: existingRun, error: existingError } = await supabase
        .from('client_report_runs')
        .select('id,status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingError) {
        throw new Error(`Unable to check report idempotency: ${existingError.message}`);
      }

      if (existingRun && attemptedRunIds.has(existingRun.id)) {
        result.skipped += 1;
        continue;
      }

      if (existingRun && DUPLICATE_STATUSES.includes(existingRun.status)) {
        result.skipped += 1;
        continue;
      }

      attemptedIdempotencyKeys.add(idempotencyKey);
      if (existingRun) {
        attemptedRunIds.add(existingRun.id);
      }

      await processReportRun(supabase, {
        existingRunId: existingRun?.id || null,
        existingRunStatus: existingRun?.status || null,
        setting,
        period,
        idempotencyKey,
        scheduledFor: due.scheduledFor,
        requireExistingStatus: existingRun?.status === 'pending' ? 'pending' : null,
      }, input, result, webhookCache);
    } catch (clientError) {
      result.failed += 1;
      const message = safeErrorMessage(clientError);
      console.warn(`Scheduled report failed for client ${setting.client_id}: ${message}`);
    }
  }

  return result;
}

async function processPendingRetryRun(
  supabase: any,
  pendingRun: PendingReportRun,
  input: RunScheduledReportsInput,
  result: RunScheduledReportsResult,
  webhookCache: Map<string, WebhookCacheEntry>,
): Promise<void> {
  try {
    if (!pendingRun.idempotency_key) {
      throw new Error('Pending retry run is missing an idempotency key.');
    }

    if (!pendingRun.scheduled_for) {
      throw new Error('Pending retry run is missing scheduled_for.');
    }

    const setting = await loadReportSettingForRun(supabase, pendingRun);
    await processReportRun(supabase, {
      existingRunId: pendingRun.id,
      existingRunStatus: pendingRun.status,
      setting,
      period: { start: pendingRun.period_start, end: pendingRun.period_end },
      idempotencyKey: pendingRun.idempotency_key,
      scheduledFor: pendingRun.scheduled_for,
      requireExistingStatus: 'pending',
    }, input, result, webhookCache);
  } catch (retryError) {
    result.failed += 1;
    const message = safeErrorMessage(retryError);
    console.warn(`Pending report retry failed for run ${pendingRun.id}: ${message}`);

    if (!input.dryRun) {
      await persistRunFailure(supabase, pendingRun.id, retryError).catch((updateError: unknown) => {
        console.warn(`Unable to persist pending retry failure for run ${pendingRun.id}: ${safeErrorMessage(updateError)}`);
      });
    }
  }
}

async function processReportRun(
  supabase: any,
  runInput: {
    existingRunId: string | null;
    existingRunStatus: string | null;
    setting: ReportSetting;
    period: { start: string; end: string };
    idempotencyKey: string;
    scheduledFor: string;
    requireExistingStatus: string | null;
  },
  input: RunScheduledReportsInput,
  result: RunScheduledReportsResult,
  webhookCache: Map<string, WebhookCacheEntry>,
): Promise<void> {
  let runId: string | null = null;
  result.processed += 1;

  try {
    const client = await loadClient(supabase, runInput.setting);
    const { links, accounts, warnings: accountWarnings } = await loadLinkedAccounts(supabase, runInput.setting);
    const linkedAccountIds = accounts.map((account) => account.id);
    const platformsIncluded = uniqueStrings(accounts.map((account) => account.platform));

    if (input.dryRun) {
      return;
    }

    runId = await createOrReuseRun(supabase, {
      existingRunId: runInput.existingRunId,
      existingRunStatus: runInput.existingRunStatus,
      setting: runInput.setting,
      period: runInput.period,
      idempotencyKey: runInput.idempotencyKey,
      scheduledFor: runInput.scheduledFor,
      linkedAccountIds,
      platformsIncluded,
      requireExistingStatus: runInput.requireExistingStatus,
    });
    result.runIds.push(runId);

    const phone = firstNonEmpty(runInput.setting.delivery_target, client.primary_whatsapp);
    if (!phone) {
      throw new Error('No WhatsApp delivery target configured for this client.');
    }

    if (client.status !== 'active') {
      throw new Error('Client is not active.');
    }

    if (links.length === 0 || accounts.length === 0) {
      throw new Error('No active ad accounts linked to this client.');
    }

    const targetWebhook = await resolveWebhookTarget(supabase, runInput.setting, webhookCache);
    if (!targetWebhook) {
      throw new Error('No webhook URL configured for scheduled reports.');
    }

    const snapshots = await loadSnapshots(supabase, runInput.setting.user_id, linkedAccountIds, runInput.period.start, runInput.period.end);
    const snapshotAccountIds = uniqueStrings(snapshots.map((snapshot) => snapshot.account_id));
    const missingAccountNames = accounts
      .filter((account) => !snapshotAccountIds.includes(account.id))
      .map((account) => account.name);
    const warnings = [...accountWarnings];

    if (missingAccountNames.length > 0) {
      warnings.push(`No exact-period snapshots found for: ${missingAccountNames.join(', ')}`);
    }

    if (snapshots.length === 0) {
      throw new Error(`No insight snapshots found for exact period ${runInput.period.start} to ${runInput.period.end}. Refresh account insights before the scheduled send.`);
    }

    const campaigns = await loadCampaigns(supabase, snapshots);
    const report = buildReport({
      client,
      accounts,
      campaigns,
      snapshots,
      period: runInput.period,
      warnings,
    });

    const payload = {
      source: 'nexus-ai-scheduled',
      version: '2',
      reportRunId: runId,
      phone,
      message: report.message,
      client: { id: client.id, name: client.name },
      period: { start: runInput.period.start, end: runInput.period.end },
      metrics: report.metrics,
      portalLink: null,
      report: { html: report.html, pdfUrl: null },
    };

    await updateRun(supabase, runId, {
      webhook_target: targetWebhook,
      warnings,
      deterministic_message: report.message,
      report_html: report.html,
      summary_payload: report.summaryPayload,
      platforms_included: platformsIncluded,
      linked_account_ids: linkedAccountIds,
      scheduled_for: runInput.scheduledFor,
    });

    const webhookResponse = await postWebhook(targetWebhook, payload);
    const status = warnings.length > 0 ? 'sent_with_warnings' : 'sent';

    await updateRun(supabase, runId, {
      status,
      webhook_target: targetWebhook,
      webhook_response: webhookResponse,
      error_message: null,
      attempt_count: 1,
      warnings,
      deterministic_message: report.message,
      report_html: report.html,
      summary_payload: report.summaryPayload,
      platforms_included: platformsIncluded,
      linked_account_ids: linkedAccountIds,
      scheduled_for: runInput.scheduledFor,
      sent_at: new Date().toISOString(),
    });

    result.sent += 1;
  } catch (clientError) {
    if (clientError instanceof RunClaimSkipped) {
      result.processed = Math.max(0, result.processed - 1);
      result.skipped += 1;
      return;
    }

    if (runId && !input.dryRun) {
      await persistRunFailure(supabase, runId, clientError).catch((updateError: unknown) => {
        console.warn(`Unable to persist scheduled report failure for run ${runId}: ${safeErrorMessage(updateError)}`);
      });
    }
    throw clientError;
  }
}

function evaluateDueState(setting: ReportSetting, now: Date): { due: boolean; localDate: string; scheduledFor: string } {
  const timezone = setting.timezone || DEFAULT_TIMEZONE;
  const local = getZonedParts(now, timezone);
  const localDate = formatDate(local.year, local.month, local.day);
  const sendTime = normalizeSendTime(setting.send_time);
  if (!sendTime) {
    return { due: false, localDate, scheduledFor: now.toISOString() };
  }

  const currentTime = `${pad(local.hour)}:${pad(local.minute)}`;

  if (currentTime !== sendTime) {
    return { due: false, localDate, scheduledFor: zonedLocalToUtcIso(localDate, sendTime, timezone) };
  }

  const frequency = normalizeFrequency(setting.delivery_frequency);
  const dayOfWeek = dayOfWeekForDate(localDate);
  const lastDay = daysInMonth(local.year, local.month);
  const hasInvalidWeeklyDay = setting.weekly_day !== null && (setting.weekly_day < 0 || setting.weekly_day > 6);
  const hasInvalidMonthlyDay = setting.monthly_day !== null && (setting.monthly_day < 1 || setting.monthly_day > 31);
  if (hasInvalidWeeklyDay || hasInvalidMonthlyDay) {
    return { due: false, localDate, scheduledFor: zonedLocalToUtcIso(localDate, sendTime, timezone) };
  }

  const monthlyDay = Math.min(setting.monthly_day || 1, lastDay);
  const weeklyDay = setting.weekly_day ?? 1;

  const due = frequency === 'daily'
    || (frequency === 'weekly' && dayOfWeek === weeklyDay)
    || (frequency === 'monthly' && local.day === monthlyDay);

  return { due, localDate, scheduledFor: zonedLocalToUtcIso(localDate, sendTime, timezone) };
}

function calculateReportPeriod(period: string | null, localDate: string): { start: string; end: string } {
  switch (period) {
    case 'today':
      return { start: localDate, end: localDate };
    case 'yesterday': {
      const date = addDays(localDate, -1);
      return { start: date, end: date };
    }
    case 'last_7d':
      return { start: addDays(localDate, -6), end: localDate };
    case 'last_60d':
      return { start: addDays(localDate, -59), end: localDate };
    case 'last_30d':
    default:
      return { start: addDays(localDate, -29), end: localDate };
  }
}

async function loadClient(supabase: any, setting: ReportSetting): Promise<AgencyClient> {
  const { data, error } = await supabase
    .from('agency_clients')
    .select('id,user_id,name,status,primary_whatsapp')
    .eq('id', setting.client_id)
    .eq('user_id', setting.user_id)
    .single();

  if (error || !data) {
    throw new Error('Client record was not found for this report setting.');
  }

  return data as AgencyClient;
}

async function loadPendingRetryRuns(supabase: any): Promise<PendingReportRun[]> {
  const { data, error } = await supabase
    .from('client_report_runs')
    .select('id,user_id,client_id,period_start,period_end,status,report_mode,execution_type,idempotency_key,scheduled_for')
    .eq('status', 'pending')
    .eq('execution_type', 'scheduled')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Unable to load pending report retries: ${error.message}`);
  }

  return (data || []) as PendingReportRun[];
}

async function loadReportSettingForRun(supabase: any, run: PendingReportRun): Promise<ReportSetting> {
  const { data, error } = await supabase
    .from('client_report_settings')
    .select('*')
    .eq('client_id', run.client_id)
    .eq('user_id', run.user_id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load report settings for pending retry: ${error.message}`);
  }

  if (!data) {
    throw new Error('Report settings were not found for this pending retry.');
  }

  return data as ReportSetting;
}

async function loadLinkedAccounts(
  supabase: any,
  setting: ReportSetting,
): Promise<{ links: ClientAccountLink[]; accounts: PlatformAccount[]; warnings: string[] }> {
  const { data: linksData, error: linksError } = await supabase
    .from('agency_client_accounts')
    .select('*')
    .eq('client_id', setting.client_id)
    .eq('user_id', setting.user_id)
    .eq('is_active', true);

  if (linksError) {
    throw new Error(`Unable to load linked accounts: ${linksError.message}`);
  }

  const links = (linksData || []) as ClientAccountLink[];
  const accountIds = uniqueStrings(links.map((link) => link.account_id));
  if (accountIds.length === 0) {
    return { links, accounts: [], warnings: [] };
  }

  const { data: accountsData, error: accountsError } = await supabase
    .from('ad_platform_accounts')
    .select('id,user_id,platform,external_account_id,name,currency,timezone,status,is_active')
    .in('id', accountIds)
    .eq('user_id', setting.user_id)
    .eq('is_active', true);

  if (accountsError) {
    throw new Error(`Unable to load platform accounts: ${accountsError.message}`);
  }

  const accounts = (accountsData || []) as PlatformAccount[];
  const activeAccountIds = uniqueStrings(accounts.map((account) => account.id));
  const inactiveLinks = links.filter((link) => !activeAccountIds.includes(link.account_id));
  const warnings = inactiveLinks.length > 0
    ? [`${inactiveLinks.length} linked account(s) are inactive or unavailable.`]
    : [];

  return { links, accounts, warnings };
}

async function createOrReuseRun(
  supabase: any,
  input: {
    existingRunId: string | null;
    existingRunStatus: string | null;
    setting: ReportSetting;
    period: { start: string; end: string };
    idempotencyKey: string;
    scheduledFor: string;
    linkedAccountIds: string[];
    platformsIncluded: string[];
    requireExistingStatus: string | null;
  },
): Promise<string> {
  const payload = {
    user_id: input.setting.user_id,
    client_id: input.setting.client_id,
    period_start: input.period.start,
    period_end: input.period.end,
    status: 'processing',
    report_mode: input.setting.default_report_mode || 'executive',
    execution_type: 'scheduled',
    idempotency_key: input.idempotencyKey,
    linked_account_ids: input.linkedAccountIds,
    platforms_included: input.platformsIncluded,
    summary_payload: {},
    error_message: null,
    webhook_response: {},
    attempt_count: 0,
    scheduled_for: input.scheduledFor,
    warnings: [],
    deterministic_message: null,
    report_html: null,
    sent_at: null,
  };

  if (input.existingRunId) {
    let query = supabase
      .from('client_report_runs')
      .update(payload)
      .eq('id', input.existingRunId)
      .eq('user_id', input.setting.user_id);

    if (input.requireExistingStatus) {
      query = query.eq('status', input.requireExistingStatus);
    }

    const selection = query.select('id');
    const { data, error } = input.requireExistingStatus
      ? await selection.maybeSingle()
      : await selection.single();

    if (error) {
      const currentStatus = input.existingRunStatus ? ` Current status was ${input.existingRunStatus}.` : '';
      throw new Error(`Unable to reuse report run.${currentStatus} ${error?.message || 'No run returned'}`.trim());
    }

    if (!data) {
      throw new RunClaimSkipped('Report run was already claimed or no longer has a retryable status.');
    }

    return data.id;
  }

  const { data, error } = await supabase
    .from('client_report_runs')
    .insert(payload)
    .select('id')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      throw new Error('A report run already exists for this scheduled period.');
    }
    throw new Error(`Unable to create report run: ${error?.message || 'No run returned'}`);
  }

  return data.id;
}

async function persistRunFailure(supabase: any, runId: string, error: unknown): Promise<void> {
  const webhookResponse = getWebhookFailureResponse(error);
  const patch: Record<string, unknown> = {
    status: 'failed',
    error_message: safeErrorMessage(error),
    attempt_count: webhookResponse ? 1 : 0,
    warnings: [safeErrorMessage(error)],
    sent_at: null,
  };
  if (webhookResponse) {
    patch.webhook_response = webhookResponse;
  }

  await updateRun(supabase, runId, patch);
}

async function resolveWebhookTarget(
  supabase: any,
  setting: ReportSetting,
  cache: Map<string, WebhookCacheEntry>,
): Promise<string | null> {
  const settingWebhook = normalizeOptionalUrl(setting.webhook_url);
  if (settingWebhook) return settingWebhook;

  let cached = cache.get(setting.user_id);
  if (!cached) {
    const [{ data: userSettings }, { data: agencyConfig }] = await Promise.all([
      supabase
        .from('user_settings')
        .select('default_webhook_url')
        .eq('user_id', setting.user_id)
        .maybeSingle(),
      supabase
        .from('agency_config')
        .select('"webhookUrl"')
        .eq('user_id', setting.user_id)
        .maybeSingle(),
    ]);

    cached = {
      userDefault: normalizeOptionalUrl(userSettings?.default_webhook_url),
      agencyDefault: normalizeOptionalUrl(agencyConfig?.webhookUrl),
    };
    cache.set(setting.user_id, cached);
  }

  return cached.userDefault
    || cached.agencyDefault
    || normalizeOptionalUrl(Deno.env.get('N8N_WEBHOOK_URL'))
    || normalizeOptionalUrl(Deno.env.get('DEFAULT_WEBHOOK_URL'));
}

async function loadSnapshots(
  supabase: any,
  userId: string,
  accountIds: string[],
  periodStart: string,
  periodEnd: string,
): Promise<InsightSnapshot[]> {
  if (accountIds.length === 0) return [];

  const { data, error } = await supabase
    .from('ad_insights_snapshots')
    .select('*')
    .eq('user_id', userId)
    .in('account_id', accountIds)
    .eq('date_start', periodStart)
    .eq('date_end', periodEnd);

  if (error) {
    throw new Error(`Unable to load insight snapshots: ${error.message}`);
  }

  return (data || []) as InsightSnapshot[];
}

async function loadCampaigns(supabase: any, snapshots: InsightSnapshot[]): Promise<Map<string, Campaign>> {
  const campaignIds = uniqueStrings(snapshots.map((snapshot) => snapshot.campaign_id).filter(Boolean) as string[]);
  if (campaignIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('ad_platform_campaigns')
    .select('id,account_id,platform,external_campaign_id,name')
    .in('id', campaignIds);

  if (error) {
    throw new Error(`Unable to load campaigns for snapshots: ${error.message}`);
  }

  return new Map(((data || []) as Campaign[]).map((campaign) => [campaign.id, campaign]));
}

function buildReport(input: {
  client: AgencyClient;
  accounts: PlatformAccount[];
  campaigns: Map<string, Campaign>;
  snapshots: InsightSnapshot[];
  period: { start: string; end: string };
  warnings: string[];
}): {
  message: string;
  html: string;
  metrics: Metrics;
  summaryPayload: Record<string, unknown>;
} {
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const metrics = calculateTotals(input.snapshots);
  const campaignRows = consolidateCampaigns(input.snapshots, input.campaigns, accountById);
  const platforms = uniqueStrings(input.accounts.map((account) => platformLabel(account.platform)));

  const message = [
    `Ola, ${input.client.name}!`,
    `Relatorio de midia do periodo ${formatDisplayDate(input.period.start)} a ${formatDisplayDate(input.period.end)}.`,
    `Investimento: ${formatCurrency(metrics.spend)}.`,
    `Impressoes: ${formatInteger(metrics.impressions)}. Cliques: ${formatInteger(metrics.clicks)}. CTR: ${formatPercent(metrics.ctr)}.`,
    `Conversoes: ${formatNumber(metrics.conversions)}.`,
    `Plataformas: ${platforms.join(', ') || 'Nao informado'}.`,
  ].join('\n');

  const html = buildHtmlReport({
    clientName: input.client.name,
    period: input.period,
    metrics,
    campaignRows,
    platforms,
    warnings: input.warnings,
  });

  return {
    message,
    html,
    metrics,
    summaryPayload: {
      period: input.period,
      metrics,
      campaigns: campaignRows,
      warnings: input.warnings,
      generatedAt: new Date().toISOString(),
    },
  };
}

function calculateTotals(snapshots: InsightSnapshot[]): Metrics {
  const totals = snapshots.reduce(
    (acc, snapshot) => {
      acc.spend += toNumber(snapshot.spend);
      acc.impressions += toNumber(snapshot.impressions);
      acc.clicks += toNumber(snapshot.clicks);
      acc.conversions += toNumber(snapshot.conversions);
      acc.conversionValue += toNumber(snapshot.conversion_value);
      return acc;
    },
    {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
    },
  );

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const costPerConversion = totals.conversions > 0 ? totals.spend / totals.conversions : null;
  const roas = totals.spend > 0 && totals.conversionValue > 0 ? totals.conversionValue / totals.spend : null;

  return {
    spend: roundCurrency(totals.spend),
    impressions: Math.round(totals.impressions),
    clicks: Math.round(totals.clicks),
    ctr: roundMetric(ctr),
    cpc: roundCurrency(cpc),
    cpm: roundCurrency(cpm),
    conversions: roundMetric(totals.conversions),
    costPerConversion: costPerConversion === null ? null : roundCurrency(costPerConversion),
    conversionValue: roundCurrency(totals.conversionValue),
    roas: roas === null ? null : roundMetric(roas),
  };
}

function consolidateCampaigns(
  snapshots: InsightSnapshot[],
  campaigns: Map<string, Campaign>,
  accountById: Map<string, PlatformAccount>,
): CampaignSummary[] {
  const byKey = new Map<string, CampaignSummary>();

  for (const snapshot of snapshots) {
    const campaign = snapshot.campaign_id ? campaigns.get(snapshot.campaign_id) : null;
    const account = accountById.get(snapshot.account_id);
    const key = snapshot.campaign_id || `${snapshot.account_id}:account`;
    const existing = byKey.get(key) || {
      campaignId: snapshot.campaign_id,
      campaignName: campaign?.name || 'Conta completa',
      platform: snapshot.platform,
      accountId: snapshot.account_id,
      accountName: account?.name || 'Conta de anuncios',
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      conversions: 0,
      costPerConversion: null,
      conversionValue: 0,
      roas: null,
    };

    existing.spend += toNumber(snapshot.spend);
    existing.impressions += toNumber(snapshot.impressions);
    existing.clicks += toNumber(snapshot.clicks);
    existing.conversions += toNumber(snapshot.conversions);
    existing.conversionValue += toNumber(snapshot.conversion_value);
    byKey.set(key, existing);
  }

  return [...byKey.values()]
    .map((row) => {
      const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
      const cpc = row.clicks > 0 ? row.spend / row.clicks : 0;
      const cpm = row.impressions > 0 ? (row.spend / row.impressions) * 1000 : 0;
      const costPerConversion = row.conversions > 0 ? row.spend / row.conversions : null;
      const roas = row.spend > 0 && row.conversionValue > 0 ? row.conversionValue / row.spend : null;

      return {
        ...row,
        spend: roundCurrency(row.spend),
        impressions: Math.round(row.impressions),
        clicks: Math.round(row.clicks),
        ctr: roundMetric(ctr),
        cpc: roundCurrency(cpc),
        cpm: roundCurrency(cpm),
        conversions: roundMetric(row.conversions),
        costPerConversion: costPerConversion === null ? null : roundCurrency(costPerConversion),
        conversionValue: roundCurrency(row.conversionValue),
        roas: roas === null ? null : roundMetric(roas),
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

function buildHtmlReport(input: {
  clientName: string;
  period: { start: string; end: string };
  metrics: Metrics;
  campaignRows: CampaignSummary[];
  platforms: string[];
  warnings: string[];
}): string {
  const topRows = input.campaignRows.slice(0, 10);
  const campaignTable = topRows.length === 0
    ? '<p>Sem campanhas consolidadas para o periodo.</p>'
    : `<table><thead><tr><th>Campanha</th><th>Plataforma</th><th>Investimento</th><th>Cliques</th><th>CTR</th><th>Conversoes</th></tr></thead><tbody>${topRows.map((row) => (
      `<tr><td>${escapeHtml(row.campaignName)}</td><td>${escapeHtml(platformLabel(row.platform))}</td><td>${formatCurrency(row.spend)}</td><td>${formatInteger(row.clicks)}</td><td>${formatPercent(row.ctr)}</td><td>${formatNumber(row.conversions)}</td></tr>`
    )).join('')}</tbody></table>`;

  const warningsHtml = input.warnings.length > 0
    ? `<section><h2>Avisos internos</h2><ul>${input.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></section>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatorio - ${escapeHtml(input.clientName)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #17202a; margin: 0; padding: 32px; background: #f7f8fa; }
    main { max-width: 880px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; padding: 28px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    h2 { font-size: 18px; margin-top: 28px; }
    p { line-height: 1.5; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
    .metric { border: 1px solid #e5e7eb; padding: 12px; }
    .label { color: #5f6b7a; font-size: 12px; text-transform: uppercase; }
    .value { display: block; margin-top: 6px; font-size: 20px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; font-size: 13px; }
    th { color: #5f6b7a; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(input.clientName)}</h1>
    <p>Relatorio de midia de ${formatDisplayDate(input.period.start)} a ${formatDisplayDate(input.period.end)}.</p>
    <p>Plataformas: ${escapeHtml(input.platforms.join(', ') || 'Nao informado')}.</p>
    <section class="metrics">
      ${metricCard('Investimento', formatCurrency(input.metrics.spend))}
      ${metricCard('Impressoes', formatInteger(input.metrics.impressions))}
      ${metricCard('Cliques', formatInteger(input.metrics.clicks))}
      ${metricCard('CTR', formatPercent(input.metrics.ctr))}
      ${metricCard('CPC', formatCurrency(input.metrics.cpc))}
      ${metricCard('Conversoes', formatNumber(input.metrics.conversions))}
    </section>
    <section>
      <h2>Campanhas</h2>
      ${campaignTable}
    </section>
    ${warningsHtml}
  </main>
</body>
</html>`;
}

function metricCard(label: string, value: string): string {
  return `<div class="metric"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`;
}

async function postWebhook(targetWebhook: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(targetWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  const responseBody = parseJsonOrText(responseText);

  const webhookResponse = {
    ok: response.ok,
    status: response.status,
    body: responseBody,
  };

  if (!response.ok) {
    throw new WebhookRequestError(`Webhook request failed with status ${response.status}.`, webhookResponse);
  }

  return webhookResponse;
}

async function updateRun(supabase: any, runId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('client_report_runs')
    .update(patch)
    .eq('id', runId);

  if (error) {
    throw new Error(`Unable to update report run: ${error.message}`);
  }
}

function getZonedParts(date: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  }

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function zonedLocalToUtcIso(localDate: string, sendTime: string, timezone: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, minute] = sendTime.split(':').map(Number);
  const desiredLocalMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = new Date(desiredLocalMs);

  for (let i = 0; i < 3; i += 1) {
    const observed = getZonedParts(guess, timezone);
    const observedLocalMs = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, 0);
    const diff = desiredLocalMs - observedLocalMs;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }

  return guess.toISOString();
}

function normalizeSendTime(sendTime: string | null): string | null {
  const match = String(sendTime || '08:00').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

function normalizeFrequency(frequency: string | null): string {
  return ['daily', 'weekly', 'monthly'].includes(frequency || '') ? String(frequency) : 'daily';
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function dayOfWeekForDate(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return null;
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number): string {
  return `${formatNumber(value)}%`;
}

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function platformLabel(platform: string): string {
  if (platform === 'meta') return 'Meta Ads';
  if (platform === 'google') return 'Google Ads';
  return platform;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  return String(error || 'Unknown scheduled report error');
}

function getWebhookFailureResponse(error: unknown): Record<string, unknown> | null {
  return error instanceof WebhookRequestError ? error.response : null;
}
