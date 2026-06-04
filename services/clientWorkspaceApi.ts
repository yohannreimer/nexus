import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdPlatform, PlatformAccount } from './platformTypes';
import { callNexusApi } from './nexusApi';
import { isPublicEnvEnabled } from './publicEnv';
import type {
  AgencyAiBriefing,
  AgencyClient,
  AgencyClientAccountLink,
  AgencyClientStatus,
  AvailableAccount,
  ClientAiAnalysis,
  ClientDailySnapshot,
  ClientAiProfile,
  ClientDeliveryFrequency,
  ClientPortal,
  ClientPortalMode,
  ClientReportExecutionType,
  ClientReportExposure,
  ClientReportMode,
  ClientReportPeriod,
  ClientReportRun,
  ClientReportRunStatus,
  ClientReportSettings,
  ClientWorkspaceSummary,
} from './clientWorkspaceTypes';
import { sanitizePortalPayload } from './portalModel';

type DbClient = {
  id: string;
  user_id: string | null;
  name: string;
  status: AgencyClientStatus;
  primary_whatsapp: string | null;
  internal_owner: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type DbLink = {
  id: string;
  user_id: string;
  client_id: string;
  account_id: string;
  platform: AdPlatform;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DbSettings = {
  id: string;
  user_id: string;
  client_id: string;
  default_period: ClientReportPeriod;
  send_time: string;
  timezone: string;
  delivery_enabled: boolean;
  delivery_frequency: ClientDeliveryFrequency | null;
  weekly_day: number | null;
  monthly_day: number | null;
  delivery_target: string | null;
  webhook_url: string | null;
  default_report_mode: ClientReportMode;
  portal_mode?: ClientPortalMode | null;
  client_report_exposure?: ClientReportExposure | null;
  internal_ai_enabled?: boolean | null;
  briefing_enabled?: boolean | null;
  report_template_settings?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type DbReportRun = {
  id: string;
  user_id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  status: ClientReportRunStatus;
  report_mode: ClientReportMode;
  execution_type?: ClientReportExecutionType | null;
  idempotency_key?: string | null;
  linked_account_ids?: string[] | null;
  deterministic_message?: string | null;
  report_html?: string | null;
  pdf_url?: string | null;
  portal_snapshot_url?: string | null;
  webhook_target?: string | null;
  webhook_response?: Record<string, unknown> | null;
  attempt_count?: number | null;
  scheduled_for?: string | null;
  warnings?: unknown[] | null;
  platforms_included: AdPlatform[] | null;
  summary_payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
};

type DbInsightSnapshot = {
  account_id: string;
  campaign_id: string | null;
  date_start: string;
  date_end: string;
  spend: number | string | null;
  impressions: number | string | null;
  clicks: number | string | null;
  conversions: number | string | null;
};

type DbClientPortal = {
  id: string;
  user_id: string;
  client_id: string;
  slug: string;
  status: ClientPortal['status'];
  mode: ClientPortalMode;
  branding: Record<string, unknown> | null;
  visibility_settings: Record<string, unknown> | null;
  access_settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type DbClientAiProfile = {
  id: string;
  user_id: string;
  client_id: string;
  objective: ClientAiProfile['objective'];
  tone: ClientAiProfile['tone'];
  business_rules: Record<string, unknown> | null;
  important_metrics: string[] | Record<string, unknown> | null;
  exposure_level: ClientAiProfile['exposureLevel'];
  internal_ai_enabled: boolean;
  briefing_enabled: boolean;
  created_at: string;
  updated_at: string;
};

type DbClientAiAnalysis = {
  id: string;
  user_id: string;
  client_id: string;
  report_run_id: string | null;
  period_start: string;
  period_end: string;
  summary: string;
  positives: unknown[] | null;
  attention_points: unknown[] | null;
  internal_alerts: unknown[] | null;
  recommendations: unknown[] | null;
  talking_points: unknown[] | null;
  risk_level: ClientAiAnalysis['riskLevel'];
  opportunity_level: ClientAiAnalysis['opportunityLevel'];
  raw_ai_payload: Record<string, unknown> | null;
  provider: string | null;
  model: string | null;
  created_at: string;
};

type DbAgencyAiBriefing = {
  id: string;
  user_id: string;
  briefing_date: string;
  portfolio_summary: Record<string, unknown> | null;
  client_priorities: unknown[] | null;
  alerts: unknown[] | null;
  opportunities: unknown[] | null;
  generated_text: string;
  provider: string | null;
  model: string | null;
  created_at: string;
};

type DbPlatformAccount = {
  id: string;
  platform: AdPlatform;
  external_account_id: string;
  name: string;
  currency: string | null;
  timezone: string | null;
  status: string | null;
  is_active: boolean | null;
  metadata: Record<string, unknown> | null;
};

type SupabaseModule = {
  isSupabaseConfigured: () => boolean;
  supabase: SupabaseClient | null;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
};

type LegacyMetaOAuthAccount = {
  id?: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
  timezone?: string;
  account_status?: string | number | null;
  business_name?: string | null;
  amount_spent?: string | number | null;
};

const CLIENT_REPORT_RUN_SAFE_SELECT = 'id, user_id, client_id, period_start, period_end, status, report_mode, execution_type, idempotency_key, linked_account_ids, deterministic_message, report_html, pdf_url, portal_snapshot_url, attempt_count, scheduled_for, warnings, platforms_included, summary_payload, error_message, created_at, sent_at';

export type ClientAiAnalysisInput = Omit<ClientAiAnalysis, 'id' | 'userId' | 'createdAt'>;
export type AgencyAiBriefingInput = Omit<AgencyAiBriefing, 'id' | 'userId' | 'createdAt'>;
export type PublicPortalReport = Record<string, unknown>;
export type PublicClientPortalData = {
  clientName: string;
  portal: Record<string, unknown>;
  latestRun: PublicPortalReport | null;
  recentRuns: PublicPortalReport[];
};

export function mapAgencyClient(row: DbClient): AgencyClient {
  return {
    id: row.id,
    userId: row.user_id || '',
    name: row.name,
    status: row.status,
    primaryWhatsapp: row.primary_whatsapp,
    internalOwner: row.internal_owner,
    notes: row.notes,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClientAccountLink(row: DbLink, account?: PlatformAccount): AgencyClientAccountLink {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    accountId: row.account_id,
    platform: row.platform,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(account ? { account } : {}),
  };
}

export function mapClientReportSettings(row: DbSettings): ClientReportSettings {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    defaultPeriod: row.default_period,
    sendTime: row.send_time,
    timezone: row.timezone,
    deliveryEnabled: row.delivery_enabled,
    deliveryFrequency: row.delivery_frequency || 'daily',
    weeklyDay: row.weekly_day ?? null,
    monthlyDay: row.monthly_day ?? null,
    deliveryTarget: row.delivery_target,
    webhookUrl: row.webhook_url,
    defaultReportMode: row.default_report_mode,
    portalMode: row.portal_mode || 'executive',
    clientReportExposure: row.client_report_exposure || 'executive_safe',
    internalAiEnabled: row.internal_ai_enabled ?? false,
    briefingEnabled: row.briefing_enabled ?? false,
    reportTemplateSettings: ensureRecord(row.report_template_settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ClientReportSettingsInput = {
  defaultPeriod?: ClientReportPeriod;
  sendTime?: string;
  timezone?: string;
  deliveryEnabled?: boolean;
  deliveryFrequency?: ClientDeliveryFrequency;
  weeklyDay?: number | null;
  monthlyDay?: number | null;
  deliveryTarget?: string | null;
  webhookUrl?: string | null;
  defaultReportMode?: ClientReportMode;
  portalMode?: ClientPortalMode;
  clientReportExposure?: ClientReportExposure;
  internalAiEnabled?: boolean;
  briefingEnabled?: boolean;
  reportTemplateSettings?: Record<string, unknown>;
};

export function mergeClientReportSettingsInput(
  existing: ClientReportSettings | null,
  input: ClientReportSettingsInput,
): Required<ClientReportSettingsInput> {
  return {
    defaultPeriod: input.defaultPeriod ?? existing?.defaultPeriod ?? 'last_30d',
    sendTime: input.sendTime ?? existing?.sendTime ?? '08:00',
    timezone: input.timezone ?? existing?.timezone ?? 'America/Sao_Paulo',
    deliveryEnabled: input.deliveryEnabled ?? existing?.deliveryEnabled ?? false,
    deliveryFrequency: input.deliveryFrequency ?? existing?.deliveryFrequency ?? 'daily',
    weeklyDay: input.weeklyDay !== undefined ? input.weeklyDay : existing?.weeklyDay ?? null,
    monthlyDay: input.monthlyDay !== undefined ? input.monthlyDay : existing?.monthlyDay ?? null,
    deliveryTarget: input.deliveryTarget !== undefined ? input.deliveryTarget : existing?.deliveryTarget ?? null,
    webhookUrl: input.webhookUrl !== undefined ? input.webhookUrl : existing?.webhookUrl ?? null,
    defaultReportMode: input.defaultReportMode ?? existing?.defaultReportMode ?? 'executive',
    portalMode: input.portalMode ?? existing?.portalMode ?? 'executive',
    clientReportExposure: input.clientReportExposure ?? existing?.clientReportExposure ?? 'executive_safe',
    internalAiEnabled: input.internalAiEnabled ?? existing?.internalAiEnabled ?? false,
    briefingEnabled: input.briefingEnabled ?? existing?.briefingEnabled ?? false,
    reportTemplateSettings: input.reportTemplateSettings ?? existing?.reportTemplateSettings ?? {},
  };
}

export function mapClientReportRun(row: DbReportRun): ClientReportRun {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    reportMode: row.report_mode,
    executionType: row.execution_type || 'manual',
    idempotencyKey: row.idempotency_key ?? null,
    linkedAccountIds: row.linked_account_ids || [],
    deterministicMessage: row.deterministic_message ?? null,
    reportHtml: row.report_html ?? null,
    pdfUrl: row.pdf_url ?? null,
    portalSnapshotUrl: row.portal_snapshot_url ?? null,
    webhookTarget: row.webhook_target ?? null,
    webhookResponse: ensureRecord(row.webhook_response),
    attemptCount: row.attempt_count ?? 0,
    scheduledFor: row.scheduled_for ?? null,
    warnings: ensureArray(row.warnings),
    platformsIncluded: row.platforms_included || [],
    summaryPayload: row.summary_payload || {},
    errorMessage: row.error_message,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  };
}

export function mapClientPortal(row: DbClientPortal): ClientPortal {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    slug: row.slug,
    status: row.status,
    mode: row.mode,
    branding: ensureRecord(row.branding),
    visibilitySettings: ensureRecord(row.visibility_settings),
    accessSettings: ensureRecord(row.access_settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClientAiProfile(row: DbClientAiProfile): ClientAiProfile {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    objective: row.objective,
    tone: row.tone,
    businessRules: ensureRecord(row.business_rules),
    importantMetrics: Array.isArray(row.important_metrics) ? row.important_metrics : [],
    exposureLevel: row.exposure_level,
    internalAiEnabled: row.internal_ai_enabled,
    briefingEnabled: row.briefing_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClientAiAnalysis(row: DbClientAiAnalysis): ClientAiAnalysis {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    reportRunId: row.report_run_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    summary: row.summary,
    positives: ensureArray(row.positives),
    attentionPoints: ensureArray(row.attention_points),
    internalAlerts: ensureArray(row.internal_alerts),
    recommendations: ensureArray(row.recommendations),
    talkingPoints: ensureArray(row.talking_points),
    riskLevel: row.risk_level,
    opportunityLevel: row.opportunity_level,
    rawAiPayload: ensureRecord(row.raw_ai_payload),
    provider: row.provider,
    model: row.model,
    createdAt: row.created_at,
  };
}

export function mapAgencyAiBriefing(row: DbAgencyAiBriefing): AgencyAiBriefing {
  return {
    id: row.id,
    userId: row.user_id,
    briefingDate: row.briefing_date,
    portfolioSummary: ensureRecord(row.portfolio_summary),
    clientPriorities: ensureArray(row.client_priorities),
    alerts: ensureArray(row.alerts),
    opportunities: ensureArray(row.opportunities),
    generatedText: row.generated_text,
    provider: row.provider,
    model: row.model,
    createdAt: row.created_at,
  };
}

export function mapPlatformAccount(row: DbPlatformAccount): PlatformAccount {
  return {
    id: row.id,
    platform: row.platform,
    externalAccountId: row.external_account_id,
    name: row.name,
    currency: row.currency || 'BRL',
    timezone: row.timezone,
    status: row.status || 'active',
    isConfigured: !!row.is_active,
    selectedCampaignIds: [],
    metadata: row.metadata || {},
  };
}

export function buildAvailableAccounts(
  accounts: PlatformAccount[],
  clients: AgencyClient[],
  links: AgencyClientAccountLink[],
): AvailableAccount[] {
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const activeLinkByAccountId = new Map(
    links.filter((link) => link.isActive).map((link) => [link.accountId, link]),
  );

  return accounts.map((account) => {
    const link = activeLinkByAccountId.get(account.id);
    const client = link ? clientById.get(link.clientId) : undefined;

    return {
      ...account,
      linkedClientId: client?.id || null,
      linkedClientName: client?.name || null,
    };
  });
}

export function buildClientSummaryHealth(
  links: AgencyClientAccountLink[],
  settings: ClientReportSettings | null,
): ClientWorkspaceSummary['health'] {
  if (links.filter((link) => link.isActive).length === 0) return 'needs_accounts';
  if (!settings?.deliveryEnabled) return 'automation_off';
  return 'ok';
}

export async function listAgencyClients(): Promise<AgencyClient[]> {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    const result = await callNexusApi<{ data: DbClient[] }>('/api/workspace/agency-clients');
    return result.data.map(mapAgencyClient);
  }

  const client = await requireSupabase('listar clientes');
  const { data, error } = await client.from('agency_clients').select('*').order('name');
  if (error) throwSupabaseError('listar clientes', error);

  return ((data || []) as DbClient[]).map(mapAgencyClient);
}

export async function listWorkspacePlatformAccounts(): Promise<PlatformAccount[]> {
  const client = await requireSupabase('listar contas de anúncio');
  const { data, error } = await client
    .from('ad_platform_accounts')
    .select('id, platform, external_account_id, name, currency, timezone, status, is_active, metadata')
    .order('name');
  if (error) throwSupabaseError('listar contas de anúncio', error);

  return ((data || []) as DbPlatformAccount[]).map(mapPlatformAccount);
}

export async function syncLegacyMetaOAuthToWorkspace(input: {
  facebookUserId: string;
  facebookUserName: string;
  accessToken: string;
  expiresIn: number;
  accounts: LegacyMetaOAuthAccount[];
}): Promise<void> {
  const client = await requireSupabase('sincronizar Meta Ads no workspace');
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throwSupabaseError('carregar usuário autenticado', authError);
  if (!authData.user) throw new Error('Usuário não autenticado');

  const now = new Date().toISOString();
  const tokenExpiresAt = new Date(Date.now() + input.expiresIn * 1000).toISOString();

  const { data: connection, error: connectionError } = await client
    .from('ad_connections')
    .upsert({
      user_id: authData.user.id,
      platform: 'meta',
      external_user_id: input.facebookUserId,
      external_user_name: input.facebookUserName,
      access_token: input.accessToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      scopes: ['ads_read', 'read_insights', 'business_management'],
      status: 'active',
      metadata: { source: 'legacy_oauth_payload' },
      updated_at: now,
    }, { onConflict: 'user_id,platform' })
    .select('id')
    .single();
  if (connectionError) throwSupabaseError('sincronizar conexão Meta Ads', connectionError);

  const rows = input.accounts
    .map((account) => {
      const externalAccountId = normalizeMetaAccountId(account.id || '');
      if (!externalAccountId) return null;

      return {
        user_id: authData.user.id,
        connection_id: connection.id,
        platform: 'meta',
        external_account_id: externalAccountId,
        name: account.name || account.business_name || `Meta Ads ${externalAccountId}`,
        currency: account.currency || 'BRL',
        timezone: account.timezone_name || account.timezone || null,
        status: String(account.account_status || 'active'),
        is_active: isActiveMetaAccount(account.account_status),
        metadata: {
          graphId: account.id || externalAccountId,
          amountSpent: account.amount_spent || null,
          businessName: account.business_name || null,
          source: 'legacy_oauth_payload',
        },
        updated_at: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (rows.length === 0) return;

  const { error: accountsError } = await client
    .from('ad_platform_accounts')
    .upsert(rows, { onConflict: 'user_id,platform,external_account_id' });
  if (accountsError) throwSupabaseError('sincronizar contas Meta Ads', accountsError);
}

export async function createAgencyClient(input: {
  name: string;
  status?: AgencyClientStatus;
  primaryWhatsapp?: string | null;
  internalOwner?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AgencyClient> {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    const result = await callNexusApi<{ data: DbClient }>('/api/workspace/agency-clients', {
      method: 'POST',
      body: input,
    });
    return mapAgencyClient(result.data);
  }

  const client = await requireSupabase('criar cliente');
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throwSupabaseError('carregar usuário autenticado', authError);
  if (!authData.user) throw new Error('Usuário não autenticado');

  const { data, error } = await client
    .from('agency_clients')
    .insert({
      user_id: authData.user.id,
      name: input.name,
      status: input.status || 'active',
      primary_whatsapp: input.primaryWhatsapp || null,
      internal_owner: input.internalOwner || null,
      notes: input.notes || null,
      metadata: input.metadata || {},
    })
    .select('*')
    .single();

  if (error) throwSupabaseError('criar cliente', error);
  return mapAgencyClient(data as DbClient);
}

export async function listClientAccountLinks(): Promise<AgencyClientAccountLink[]> {
  const client = await requireSupabase('listar vínculos de contas');
  const { data, error } = await client
    .from('agency_client_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throwSupabaseError('listar vínculos de contas', error);

  const rows = (data || []) as DbLink[];
  const accountIds = [...new Set(rows.map((row) => row.account_id))];
  if (accountIds.length === 0) return [];

  const { data: accountData, error: accountError } = await client
    .from('ad_platform_accounts')
    .select('id, platform, external_account_id, name, currency, timezone, status, is_active, metadata')
    .in('id', accountIds);
  if (accountError) throwSupabaseError('carregar contas vinculadas', accountError);

  const accountById = new Map(
    ((accountData || []) as DbPlatformAccount[]).map((account) => [account.id, mapPlatformAccount(account)]),
  );

  return rows.map((row) => mapClientAccountLink(row, accountById.get(row.account_id)));
}

export async function listClientReportSettings(): Promise<ClientReportSettings[]> {
  const client = await requireSupabase('listar configurações de relatórios');
  const { data, error } = await client
    .from('client_report_settings')
    .select('*')
    .order('send_time');
  if (error) throwSupabaseError('listar configurações de relatórios', error);

  return ((data || []) as DbSettings[]).map(mapClientReportSettings);
}

export async function upsertClientReportSettings(
  clientId: string,
  input: ClientReportSettingsInput,
): Promise<ClientReportSettings> {
  const client = await requireSupabase('salvar automação do cliente');
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throwSupabaseError('carregar usuário autenticado', authError);
  if (!authData.user) throw new Error('Usuário não autenticado');

  const { data: existingData, error: existingError } = await client
    .from('client_report_settings')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (existingError) throwSupabaseError('carregar automação atual do cliente', existingError);

  const merged = mergeClientReportSettingsInput(
    existingData ? mapClientReportSettings(existingData as DbSettings) : null,
    input,
  );
  const weeklyDay = merged.deliveryFrequency === 'weekly' ? merged.weeklyDay ?? 1 : null;
  const monthlyDay = merged.deliveryFrequency === 'monthly' ? merged.monthlyDay ?? 1 : null;
  const payload: Record<string, unknown> = {
    user_id: authData.user.id,
    client_id: clientId,
    default_period: merged.defaultPeriod,
    send_time: merged.sendTime,
    timezone: merged.timezone,
    delivery_enabled: merged.deliveryEnabled,
    delivery_frequency: merged.deliveryFrequency,
    weekly_day: weeklyDay,
    monthly_day: monthlyDay,
    delivery_target: merged.deliveryTarget,
    webhook_url: merged.webhookUrl,
    default_report_mode: merged.defaultReportMode,
    portal_mode: merged.portalMode,
    client_report_exposure: merged.clientReportExposure,
    internal_ai_enabled: merged.internalAiEnabled,
    briefing_enabled: merged.briefingEnabled,
    report_template_settings: merged.reportTemplateSettings,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('client_report_settings')
    .upsert(payload, { onConflict: 'client_id' })
    .select('*')
    .single();

  if (error) throwSupabaseError('salvar automação do cliente', error);
  return mapClientReportSettings(data as DbSettings);
}

export async function linkAccountToClient(
  clientId: string,
  account: PlatformAccount,
): Promise<AgencyClientAccountLink> {
  const client = await requireSupabase('vincular conta ao cliente');
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throwSupabaseError('carregar usuário autenticado', authError);
  if (!authData.user) throw new Error('Usuário não autenticado');

  const { data, error } = await client
    .from('agency_client_accounts')
    .insert({
      user_id: authData.user.id,
      client_id: clientId,
      account_id: account.id,
      platform: account.platform,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) {
    if (isDuplicateLinkError(error)) {
      throw new Error('Esta conta já está vinculada a outro cliente.');
    }
    throwSupabaseError('vincular conta ao cliente', error);
  }

  return mapClientAccountLink(data as DbLink, account);
}

export async function unlinkAccountFromClient(linkId: string): Promise<void> {
  const client = await requireSupabase('desvincular conta do cliente');
  const { error } = await client
    .from('agency_client_accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', linkId);
  if (error) throwSupabaseError('desvincular conta do cliente', error);
}

export async function listClientReportRuns(): Promise<ClientReportRun[]> {
  const client = await requireSupabase('listar execuções de relatórios');
  const { data, error } = await client
    .from('client_report_runs')
    .select(CLIENT_REPORT_RUN_SAFE_SELECT)
    .order('created_at', { ascending: false });
  if (error) throwSupabaseError('listar execuções de relatórios', error);

  return ((data || []) as DbReportRun[]).map(mapClientReportRun);
}

export async function listClientDailySnapshots(days = 15): Promise<ClientDailySnapshot[]> {
  const client = await requireSupabase('listar memória diária dos clientes');
  const since = toIsoDate(addDays(new Date(), -(Math.max(1, days) - 1)));

  const { data: linksData, error: linksError } = await client
    .from('agency_client_accounts')
    .select('client_id,account_id,is_active')
    .eq('is_active', true);
  if (linksError) throwSupabaseError('listar vínculos para memória diária', linksError);

  const links = ((linksData || []) as Array<{ client_id: string; account_id: string; is_active: boolean }>)
    .filter((link) => link.client_id && link.account_id);
  const accountIds = [...new Set(links.map((link) => link.account_id))];
  if (accountIds.length === 0) return [];

  const clientIdsByAccountId = new Map<string, string[]>();
  links.forEach((link) => {
    const list = clientIdsByAccountId.get(link.account_id) || [];
    list.push(link.client_id);
    clientIdsByAccountId.set(link.account_id, list);
  });

  const { data, error } = await client
    .from('ad_insights_snapshots')
    .select('account_id,campaign_id,date_start,date_end,spend,impressions,clicks,conversions')
    .in('account_id', accountIds)
    .gte('date_start', since)
    .order('date_start', { ascending: true });
  if (error) throwSupabaseError('listar snapshots diários', error);

  return consolidateDailySnapshots((data || []) as DbInsightSnapshot[], clientIdsByAccountId);
}

export async function listReportRunsForClient(clientId: string): Promise<ClientReportRun[]> {
  const client = await requireSupabase('listar execuções de relatórios do cliente');
  const { data, error } = await client
    .from('client_report_runs')
    .select(CLIENT_REPORT_RUN_SAFE_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throwSupabaseError('listar execuções de relatórios do cliente', error);

  return ((data || []) as DbReportRun[]).map(mapClientReportRun);
}

export async function listRecentReportRuns(limit = 50): Promise<ClientReportRun[]> {
  const client = await requireSupabase('listar execuções recentes de relatórios');
  const { data, error } = await client
    .from('client_report_runs')
    .select(CLIENT_REPORT_RUN_SAFE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throwSupabaseError('listar execuções recentes de relatórios', error);

  return ((data || []) as DbReportRun[]).map(mapClientReportRun);
}

export async function markReportRunForRetry(runId: string): Promise<ClientReportRun> {
  const client = await requireSupabase('marcar relatório para reenvio');
  const { data, error } = await client
    .from('client_report_runs')
    .update({
      status: 'pending',
      error_message: null,
      sent_at: null,
    })
    .eq('id', runId)
    .eq('status', 'failed')
    .eq('execution_type', 'scheduled')
    .select(CLIENT_REPORT_RUN_SAFE_SELECT)
    .single();
  if (error) throwSupabaseError('marcar relatório para reenvio', error);

  return mapClientReportRun(data as DbReportRun);
}

export async function listClientPortals(): Promise<ClientPortal[]> {
  const client = await requireSupabase('listar portais de clientes');
  const { data, error } = await client
    .from('client_portals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throwSupabaseError('listar portais de clientes', error);

  return ((data || []) as DbClientPortal[]).map(mapClientPortal);
}

export async function upsertClientPortal(
  input: Partial<ClientPortal> & { clientId: string; slug: string },
): Promise<ClientPortal> {
  const client = await requireSupabase('salvar portal do cliente');
  const userId = await requireAuthenticatedUserId(client, 'carregar usuário autenticado');
  const payload: Record<string, unknown> = {
    user_id: userId,
    client_id: input.clientId,
    slug: input.slug,
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) payload.status = input.status;
  if (input.mode !== undefined) payload.mode = input.mode;
  if (input.branding !== undefined) payload.branding = input.branding;
  if (input.visibilitySettings !== undefined) payload.visibility_settings = input.visibilitySettings;
  if (input.accessSettings !== undefined) payload.access_settings = input.accessSettings;

  const { data, error } = await client
    .from('client_portals')
    .upsert(payload, { onConflict: 'client_id' })
    .select('*')
    .single();

  if (error) throwSupabaseError('salvar portal do cliente', error);
  return mapClientPortal(data as DbClientPortal);
}

export async function getClientPortalBySlug(slug: string): Promise<ClientPortal | null> {
  const client = await requireSupabase('carregar portal do cliente');
  const { data, error } = await client
    .from('client_portals')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throwSupabaseError('carregar portal do cliente', error);

  return data ? mapClientPortal(data as DbClientPortal) : null;
}

export async function getPublicPortalBySlug(slug: string): Promise<PublicClientPortalData | null> {
  const client = await requireSupabase('carregar portal público do cliente');
  const { data, error } = await client.rpc('get_public_client_portal', { portal_slug: slug });
  if (error) throwSupabaseError('carregar portal público do cliente', error);
  if (!data) return null;

  const raw = data as Record<string, unknown>;
  const clientName = typeof raw.clientName === 'string' ? raw.clientName : 'Cliente';
  const portal = mapPublicRpcPortal(raw.portal);
  if (!portal || portal.status !== 'active') return null;

  const latestRun = mapPublicRpcRun(raw.latestRun);
  const recentRuns = Array.isArray(raw.recentRuns)
    ? raw.recentRuns.map(mapPublicRpcRun).filter((run): run is ClientReportRun => Boolean(run))
    : [];

  const latestPayload = sanitizePortalPayload({ clientName, portal, latestRun });
  return {
    clientName,
    portal: latestPayload.portal as Record<string, unknown>,
    latestRun: latestPayload.latestReport as PublicPortalReport | null,
    recentRuns: recentRuns.map((run) => (
      sanitizePortalPayload({ clientName, portal, latestRun: run }).latestReport as PublicPortalReport
    )),
  };
}

export async function listClientAiProfiles(): Promise<ClientAiProfile[]> {
  const client = await requireSupabase('listar perfis de IA dos clientes');
  const { data, error } = await client
    .from('client_ai_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throwSupabaseError('listar perfis de IA dos clientes', error);

  return ((data || []) as DbClientAiProfile[]).map(mapClientAiProfile);
}

export async function getClientAiProfile(clientId: string): Promise<ClientAiProfile | null> {
  const client = await requireSupabase('carregar perfil de IA do cliente');
  const { data, error } = await client
    .from('client_ai_profiles')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throwSupabaseError('carregar perfil de IA do cliente', error);

  return data ? mapClientAiProfile(data as DbClientAiProfile) : null;
}

export async function upsertClientAiProfile(
  input: Partial<ClientAiProfile> & { clientId: string },
): Promise<ClientAiProfile> {
  const client = await requireSupabase('salvar perfil de IA do cliente');
  const userId = await requireAuthenticatedUserId(client, 'carregar usuário autenticado');
  const payload: Record<string, unknown> = {
    user_id: userId,
    client_id: input.clientId,
    updated_at: new Date().toISOString(),
  };

  if (input.objective !== undefined) payload.objective = input.objective;
  if (input.tone !== undefined) payload.tone = input.tone;
  if (input.businessRules !== undefined) payload.business_rules = input.businessRules;
  if (input.importantMetrics !== undefined) payload.important_metrics = input.importantMetrics;
  if (input.exposureLevel !== undefined) payload.exposure_level = input.exposureLevel;
  if (input.internalAiEnabled !== undefined) payload.internal_ai_enabled = input.internalAiEnabled;
  if (input.briefingEnabled !== undefined) payload.briefing_enabled = input.briefingEnabled;

  const { data, error } = await client
    .from('client_ai_profiles')
    .upsert(payload, { onConflict: 'client_id' })
    .select('*')
    .single();

  if (error) throwSupabaseError('salvar perfil de IA do cliente', error);
  return mapClientAiProfile(data as DbClientAiProfile);
}

export async function listClientAiAnalyses(clientId: string): Promise<ClientAiAnalysis[]> {
  const client = await requireSupabase('listar análises de IA do cliente');
  const { data, error } = await client
    .from('client_ai_analyses')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throwSupabaseError('listar análises de IA do cliente', error);

  return ((data || []) as DbClientAiAnalysis[]).map(mapClientAiAnalysis);
}

export async function createClientAiAnalysis(input: ClientAiAnalysisInput): Promise<ClientAiAnalysis> {
  const client = await requireSupabase('criar análise de IA do cliente');
  const userId = await requireAuthenticatedUserId(client, 'carregar usuário autenticado');
  const { data, error } = await client
    .from('client_ai_analyses')
    .insert({
      user_id: userId,
      client_id: input.clientId,
      report_run_id: input.reportRunId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      summary: input.summary,
      positives: input.positives,
      attention_points: input.attentionPoints,
      internal_alerts: input.internalAlerts,
      recommendations: input.recommendations,
      talking_points: input.talkingPoints,
      risk_level: input.riskLevel,
      opportunity_level: input.opportunityLevel,
      raw_ai_payload: input.rawAiPayload,
      provider: input.provider,
      model: input.model,
    })
    .select('*')
    .single();

  if (error) throwSupabaseError('criar análise de IA do cliente', error);
  return mapClientAiAnalysis(data as DbClientAiAnalysis);
}

export async function listAgencyAiBriefings(): Promise<AgencyAiBriefing[]> {
  const client = await requireSupabase('listar briefings de IA da agência');
  const { data, error } = await client
    .from('agency_ai_briefings')
    .select('*')
    .order('briefing_date', { ascending: false });
  if (error) throwSupabaseError('listar briefings de IA da agência', error);

  return ((data || []) as DbAgencyAiBriefing[]).map(mapAgencyAiBriefing);
}

export async function upsertAgencyAiBriefing(input: AgencyAiBriefingInput): Promise<AgencyAiBriefing> {
  const client = await requireSupabase('salvar briefing de IA da agência');
  const userId = await requireAuthenticatedUserId(client, 'carregar usuário autenticado');
  const { data, error } = await client
    .from('agency_ai_briefings')
    .upsert({
      user_id: userId,
      briefing_date: input.briefingDate,
      portfolio_summary: input.portfolioSummary,
      client_priorities: input.clientPriorities,
      alerts: input.alerts,
      opportunities: input.opportunities,
      generated_text: input.generatedText,
      provider: input.provider,
      model: input.model,
    }, { onConflict: 'user_id,briefing_date' })
    .select('*')
    .single();

  if (error) throwSupabaseError('salvar briefing de IA da agência', error);
  return mapAgencyAiBriefing(data as DbAgencyAiBriefing);
}

async function requireSupabase(action: string): Promise<SupabaseClient> {
  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error(`Supabase não está configurado para ${action}.`);
  }
  return supabase;
}

async function requireAuthenticatedUserId(client: SupabaseClient, action: string): Promise<string> {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throwSupabaseError(action, sessionError);
  if (sessionData.session?.user?.id) return sessionData.session.user.id;

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throwSupabaseError(action, authError);
  if (!authData.user) throw new Error('Usuário não autenticado');
  return authData.user.id;
}

async function loadSupabase(): Promise<SupabaseModule> {
  return import('./supabase') as Promise<SupabaseModule>;
}

function throwSupabaseError(action: string, error: SupabaseErrorLike): never {
  throw new Error(`Erro ao ${action}: ${error.message || 'erro desconhecido do Supabase'}`);
}

function isDuplicateLinkError(error: SupabaseErrorLike): boolean {
  const text = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
  return text.includes('23505')
    || text.includes('duplicate')
    || text.includes('unique')
    || text.includes('idx_agency_client_accounts_active_account')
    || text.includes('agency_client_accounts_one_active_client_per_account');
}

function ensureRecord(value: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value || {};
}

function ensureArray<T = unknown>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function mapPublicRpcPortal(value: unknown): ClientPortal | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const slug = typeof row.slug === 'string' ? row.slug : '';
  const mode = row.mode === 'essential' || row.mode === 'complete' || row.mode === 'executive'
    ? row.mode
    : 'executive';
  const status = row.status === 'paused' ? 'paused' : 'active';
  if (!slug) return null;

  return {
    id: '',
    userId: '',
    clientId: '',
    slug,
    status,
    mode,
    branding: ensureRecord(row.branding as Record<string, unknown> | null | undefined),
    visibilitySettings: ensureRecord(row.visibilitySettings as Record<string, unknown> | null | undefined),
    accessSettings: {},
    createdAt: '',
    updatedAt: '',
  };
}

function mapPublicRpcRun(value: unknown): ClientReportRun | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  if (!id) return null;

  return {
    id,
    userId: '',
    clientId: typeof row.clientId === 'string' ? row.clientId : '',
    periodStart: typeof row.periodStart === 'string' ? row.periodStart : '',
    periodEnd: typeof row.periodEnd === 'string' ? row.periodEnd : '',
    status: isReportRunStatus(row.status) ? row.status : 'generated',
    reportMode: row.reportMode === 'analytical' ? 'analytical' : 'executive',
    executionType: row.executionType === 'scheduled' ? 'scheduled' : 'manual',
    idempotencyKey: null,
    linkedAccountIds: [],
    deterministicMessage: typeof row.deterministicMessage === 'string' ? row.deterministicMessage : null,
    reportHtml: typeof row.reportHtml === 'string' ? row.reportHtml : null,
    pdfUrl: typeof row.pdfUrl === 'string' ? row.pdfUrl : null,
    portalSnapshotUrl: typeof row.portalSnapshotUrl === 'string' ? row.portalSnapshotUrl : null,
    webhookTarget: null,
    webhookResponse: {},
    attemptCount: 0,
    scheduledFor: null,
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    platformsIncluded: Array.isArray(row.platformsIncluded)
      ? row.platformsIncluded.filter((item): item is AdPlatform => item === 'meta' || item === 'google')
      : [],
    summaryPayload: ensureRecord(row.summaryPayload as Record<string, unknown> | null | undefined),
    errorMessage: null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    sentAt: typeof row.sentAt === 'string' ? row.sentAt : null,
  };
}

function consolidateDailySnapshots(
  rows: DbInsightSnapshot[],
  clientIdsByAccountId: Map<string, string[]>,
): ClientDailySnapshot[] {
  type MutableDailySnapshot = ClientDailySnapshot & {
    accountIds: Set<string>;
    campaignIds: Set<string>;
  };
  const byClientDate = new Map<string, MutableDailySnapshot>();

  rows
    .filter((row) => row.date_start && row.date_start === row.date_end)
    .forEach((row) => {
      const clientIds = clientIdsByAccountId.get(row.account_id) || [];
      clientIds.forEach((clientId) => {
        const key = `${clientId}:${row.date_start}`;
        const current = byClientDate.get(key) || {
          clientId,
          date: row.date_start,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          accountCount: 0,
          campaignCount: 0,
          accountIds: new Set<string>(),
          campaignIds: new Set<string>(),
        };

        current.spend += numericValue(row.spend);
        current.impressions += numericValue(row.impressions);
        current.clicks += numericValue(row.clicks);
        current.conversions += numericValue(row.conversions);
        current.accountIds.add(row.account_id);
        if (row.campaign_id) current.campaignIds.add(row.campaign_id);
        current.accountCount = current.accountIds.size;
        current.campaignCount = current.campaignIds.size;
        byClientDate.set(key, current);
      });
    });

  return [...byClientDate.values()]
    .map(({ accountIds, campaignIds, ...row }) => ({
      ...row,
      spend: roundCurrency(row.spend),
      impressions: Math.round(row.impressions),
      clicks: Math.round(row.clicks),
      conversions: roundMetric(row.conversions),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.clientId.localeCompare(b.clientId));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function numericValue(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMetric(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function isReportRunStatus(value: unknown): value is ClientReportRunStatus {
  return value === 'pending'
    || value === 'processing'
    || value === 'generated'
    || value === 'sent'
    || value === 'failed'
    || value === 'sent_with_warnings';
}

function normalizeMetaAccountId(accountId: string): string {
  const clean = String(accountId || '').trim();
  if (!clean) return '';
  return clean.startsWith('act_') ? clean : `act_${clean.replace(/\D/g, '')}`;
}

function isActiveMetaAccount(status: string | number | null | undefined): boolean {
  if (status == null || status === '') return true;
  const numeric = Number(status);
  return Number.isNaN(numeric) ? String(status).toLowerCase() === 'active' : numeric === 1;
}
