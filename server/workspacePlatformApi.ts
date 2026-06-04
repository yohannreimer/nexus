import crypto from 'node:crypto';
import type express from 'express';
import type { Request, Response } from 'express';
import { queryPostgres } from './postgres';
import type { ServerWorkspaceContext } from './prymeiraAccess';

type Platform = 'meta' | 'google';

type MountWorkspacePlatformRoutesInput = {
  requireWorkspace: (req: Request) => Promise<ServerWorkspaceContext>;
  respondNexusApiError: (res: Response, error: unknown) => unknown;
};

type AdConnectionRow = {
  id: string;
  workspace_id: string;
  platform: Platform;
  external_user_id: string | null;
  external_user_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

type PlatformAccountRow = {
  id: string;
  workspace_id: string;
  connection_id: string;
  platform: Platform;
  external_account_id: string;
  name: string;
  currency: string | null;
  timezone: string | null;
  status: string | null;
  is_active: boolean | null;
  metadata: Record<string, unknown> | null;
};

type InsightRow = {
  platform: Platform;
  accountId: string;
  campaignId?: string;
  campaignName?: string;
  dateStart?: string;
  dateEnd?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number | null;
  conversionValue: number | null;
  roas: number | null;
  raw?: unknown;
};

type DateRange = {
  start: string;
  end: string;
};

const META_GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v23.0';

export function mountWorkspacePlatformRoutes(
  app: express.Express,
  { requireWorkspace, respondNexusApiError }: MountWorkspacePlatformRoutesInput,
) {
  app.get('/api/workspace/oauth/:platform/login-url', async (req: Request, res: Response) => {
    try {
      const platform = parsePlatform(req.params.platform);
      const workspace = await requireWorkspace(req);
      const returnUrl = sanitizeReturnUrl(stringQuery(req.query.redirect_to))
        || process.env.VITE_APP_URL
        || 'http://localhost:5173';
      const redirectUri = workspaceOAuthRedirectUri(req, platform);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const state = signOAuthState({
        platform,
        workspaceId: workspace.workspaceId,
        returnUrl,
        expiresAt,
      });

      res.json({
        loginUrl: buildPlatformLoginUrl(platform, redirectUri, state),
        expiresAt,
      });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/oauth/:platform/callback', async (req: Request, res: Response) => {
    let returnUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
    let platform: Platform = 'meta';

    try {
      platform = parsePlatform(req.params.platform);
      const oauthError = stringQuery(req.query.error) || stringQuery(req.query.error_message);
      const state = stringQuery(req.query.state);
      if (!state) throw createHttpError('OAuth state ausente', 400);

      const parsedState = verifyOAuthState(state);
      if (parsedState.platform !== platform) throw createHttpError('OAuth state inválido', 400);
      if (new Date(parsedState.expiresAt) < new Date()) throw createHttpError('OAuth state expirado', 400);
      returnUrl = sanitizeReturnUrl(parsedState.returnUrl) || returnUrl;

      if (oauthError) {
        return res.redirect(withStatusParam(returnUrl, platform, false, oauthError));
      }

      const code = stringQuery(req.query.code);
      if (!code) throw createHttpError('Código OAuth ausente', 400);

      const redirectUri = workspaceOAuthRedirectUri(req, platform);
      if (platform === 'meta') {
        const savedAccounts = await completeMetaOAuth(parsedState.workspaceId, code, redirectUri);
        console.log(
          `✅ OAuth workspace Meta salvo: workspace=${parsedState.workspaceId}, accounts=${savedAccounts.length}`,
        );
      } else {
        const savedAccounts = await completeGoogleOAuth(parsedState.workspaceId, code, redirectUri);
        console.log(
          `✅ OAuth workspace Google salvo: workspace=${parsedState.workspaceId}, accounts=${savedAccounts.length}`,
        );
      }

      res.redirect(withStatusParam(returnUrl, platform, true));
    } catch (error) {
      console.error('❌ Erro no callback OAuth workspace:', error);
      const statusCode = typeof (error as { statusCode?: unknown })?.statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
      const message = statusCode >= 500
        ? 'Erro interno ao conectar plataforma'
        : error instanceof Error ? error.message : String(error);
      res.redirect(withStatusParam(returnUrl, platform, false, message));
    }
  });

  app.get('/api/workspace/platform-campaigns', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const platform = parsePlatform(stringQuery(req.query.platform));
      const accountId = stringQuery(req.query.account_id);
      if (!accountId) throw createHttpError('account_id é obrigatório', 400);

      const data = platform === 'meta'
        ? await fetchAndPersistMetaCampaigns(workspace.workspaceId, accountId)
        : await fetchAndPersistGoogleCampaigns(workspace.workspaceId, accountId);

      res.json({ data });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/platform-insights', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const platform = parsePlatform(stringQuery(req.query.platform));
      const accountId = stringQuery(req.query.account_id);
      if (!accountId) throw createHttpError('account_id é obrigatório', 400);

      const options = {
        campaignIds: parseCampaignIds(stringQuery(req.query.campaign_ids), platform),
        datePreset: stringQuery(req.query.date_preset) || 'last_7d',
        dateStart: stringQuery(req.query.date_start),
        dateEnd: stringQuery(req.query.date_end),
      };

      const payload = platform === 'meta'
        ? await fetchAndPersistMetaInsights(workspace.workspaceId, accountId, options)
        : await fetchAndPersistGoogleInsights(workspace.workspaceId, accountId, options);

      res.json(payload);
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });
}

function buildPlatformLoginUrl(platform: Platform, redirectUri: string, state: string): string {
  if (platform === 'meta') {
    const loginUrl = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
    loginUrl.searchParams.set('client_id', requiredEnv('FACEBOOK_APP_ID', 'VITE_FACEBOOK_APP_ID'));
    loginUrl.searchParams.set('redirect_uri', redirectUri);
    loginUrl.searchParams.set('state', state);
    loginUrl.searchParams.set('scope', 'ads_read,read_insights,business_management');
    loginUrl.searchParams.set('response_type', 'code');
    return loginUrl.toString();
  }

  const loginUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  loginUrl.searchParams.set('client_id', requiredEnv('GOOGLE_CLIENT_ID'));
  loginUrl.searchParams.set('redirect_uri', redirectUri);
  loginUrl.searchParams.set('response_type', 'code');
  loginUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/adwords');
  loginUrl.searchParams.set('access_type', 'offline');
  loginUrl.searchParams.set('prompt', 'consent');
  loginUrl.searchParams.set('state', state);
  return loginUrl.toString();
}

async function completeMetaOAuth(workspaceId: string, code: string, redirectUri: string): Promise<PlatformAccountRow[]> {
  const shortLivedToken = await exchangeMetaCodeForToken(code, redirectUri);
  const longLived = await exchangeMetaLongLivedToken(shortLivedToken);
  const expiresIn = Number(longLived.expires_in || 5184000);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const profile = await fetchMetaProfile(longLived.access_token);
  const connectionId = await upsertWorkspaceConnection({
    workspaceId,
    platform: 'meta',
    externalUserId: profile?.id || null,
    externalUserName: profile?.name || profile?.email || null,
    accessToken: longLived.access_token,
    refreshToken: null,
    tokenExpiresAt: expiresAt,
    metadata: {
      email: profile?.email || null,
      tokenType: longLived.token_type || 'bearer',
      scopes: ['ads_read', 'read_insights', 'business_management'],
    },
  });

  return syncMetaAccounts(workspaceId, connectionId);
}

async function completeGoogleOAuth(workspaceId: string, code: string, redirectUri: string): Promise<PlatformAccountRow[]> {
  const tokens = await exchangeGoogleCodeForTokens(code, redirectUri);
  const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString();
  const existingConnection = await getWorkspaceConnection(workspaceId, 'google', false);
  const refreshToken = tokens.refresh_token || existingConnection?.refresh_token;
  if (!refreshToken) {
    throw createHttpError('Google não retornou refresh token. Revogue o acesso e conecte novamente.', 400);
  }

  const profile = await fetchGoogleProfile(tokens.access_token);
  const connectionId = await upsertWorkspaceConnection({
    workspaceId,
    platform: 'google',
    externalUserId: profile?.id || existingConnection?.external_user_id || null,
    externalUserName: profile?.name || profile?.email || existingConnection?.external_user_name || null,
    accessToken: tokens.access_token,
    refreshToken,
    tokenExpiresAt: expiresAt,
    metadata: {
      tokenType: tokens.token_type || null,
      email: profile?.email || null,
      picture: profile?.picture || null,
      scopes: tokens.scope ? String(tokens.scope).split(' ') : ['https://www.googleapis.com/auth/adwords'],
    },
  });

  return syncGoogleAccounts(workspaceId, connectionId);
}

async function syncMetaAccounts(workspaceId: string, connectionId?: string): Promise<PlatformAccountRow[]> {
  const connection = await getWorkspaceConnection(workspaceId, 'meta');
  const accountsData = await metaGraphGet(
    'me/adaccounts',
    connection.access_token || '',
    {
      fields: 'id,name,currency,account_status,business_name,amount_spent,timezone_name',
      limit: '100',
    },
  );

  const rows = (accountsData.data || []).map((account: any) => {
    const externalAccountId = normalizeMetaAccountId(account.id);
    return {
      workspaceId,
      connectionId: connectionId || connection.id,
      platform: 'meta' as const,
      externalAccountId,
      name: account.name || account.business_name || `Meta Ads ${externalAccountId}`,
      currency: account.currency || 'BRL',
      timezone: account.timezone_name || null,
      status: String(account.account_status || 'active'),
      isActive: Number(account.account_status || 1) === 1,
      metadata: {
        graphId: account.id,
        amountSpent: account.amount_spent || null,
        businessName: account.business_name || null,
      },
    };
  });

  return upsertWorkspaceAccounts(rows);
}

async function syncGoogleAccounts(workspaceId: string, connectionId?: string): Promise<PlatformAccountRow[]> {
  const connection = await getWorkspaceConnection(workspaceId, 'google');
  const accessToken = await ensureGoogleAccessToken(connection);
  const customerIds = await listAccessibleGoogleCustomers(accessToken);
  const accountRows = await Promise.all(
    customerIds.map((customerId) => fetchGoogleCustomerAccount(accessToken, customerId)),
  );

  return upsertWorkspaceAccounts(accountRows.map((account) => ({
    workspaceId,
    connectionId: connectionId || connection.id,
    platform: 'google' as const,
    externalAccountId: account.externalAccountId,
    name: account.name,
    currency: account.currency,
    timezone: account.timezone,
    status: account.status,
    isActive: true,
    metadata: account.metadata,
  })));
}

async function upsertWorkspaceConnection(input: {
  workspaceId: string;
  platform: Platform;
  externalUserId: string | null;
  externalUserName: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const rows = await queryPostgres<{ id: string }>(`
    insert into public.ad_connections (
      workspace_id, clerk_user_id, platform, external_user_id, external_user_name,
      access_token, refresh_token, token_expires_at, scopes, status, metadata, updated_at
    )
    values ($1, null, $2, $3, $4, $5, $6, $7, $8, 'active', $9, now())
    on conflict (workspace_id, platform)
    where workspace_id is not null
    do update set
      external_user_id = excluded.external_user_id,
      external_user_name = excluded.external_user_name,
      access_token = excluded.access_token,
      refresh_token = coalesce(excluded.refresh_token, public.ad_connections.refresh_token),
      token_expires_at = excluded.token_expires_at,
      scopes = excluded.scopes,
      status = 'active',
      metadata = excluded.metadata,
      updated_at = now()
    returning id
  `, [
    input.workspaceId,
    input.platform,
    input.externalUserId,
    input.externalUserName,
    input.accessToken,
    input.refreshToken,
    input.tokenExpiresAt,
    Array.isArray(input.metadata.scopes) ? input.metadata.scopes : [],
    input.metadata,
  ]);

  const id = rows[0]?.id;
  if (!id) throw createHttpError('Falha ao salvar conexão do workspace', 500);
  return id;
}

async function upsertWorkspaceAccounts(rows: Array<{
  workspaceId: string;
  connectionId: string;
  platform: Platform;
  externalAccountId: string;
  name: string;
  currency: string | null;
  timezone: string | null;
  status: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
}>): Promise<PlatformAccountRow[]> {
  if (rows.length === 0) return [];

  const saved: PlatformAccountRow[] = [];
  for (const row of rows) {
    const accountRows = await queryPostgres<PlatformAccountRow>(`
      insert into public.ad_platform_accounts (
        workspace_id, clerk_user_id, connection_id, platform, external_account_id,
        name, currency, timezone, status, is_active, metadata, updated_at
      )
      values ($1, null, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
      on conflict (workspace_id, platform, external_account_id)
      where workspace_id is not null
      do update set
        connection_id = excluded.connection_id,
        name = excluded.name,
        currency = excluded.currency,
        timezone = excluded.timezone,
        status = excluded.status,
        is_active = excluded.is_active,
        metadata = excluded.metadata,
        updated_at = now()
      returning id, workspace_id, connection_id, platform, external_account_id, name, currency, timezone, status, is_active, metadata
    `, [
      row.workspaceId,
      row.connectionId,
      row.platform,
      row.externalAccountId,
      row.name,
      row.currency,
      row.timezone,
      row.status,
      row.isActive,
      row.metadata,
    ]);

    if (accountRows[0]) saved.push(accountRows[0]);
  }

  return saved;
}

async function fetchAndPersistMetaCampaigns(workspaceId: string, accountId: string) {
  const externalAccountId = normalizeMetaAccountId(accountId);
  const connection = await getWorkspaceConnection(workspaceId, 'meta');
  const account = await getWorkspaceAccount(workspaceId, 'meta', externalAccountId);
  const campaignsData = await metaGraphGet(
    `${externalAccountId}/campaigns`,
    connection.access_token || '',
    {
      fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time',
      limit: '100',
    },
  );

  const rows = (campaignsData.data || []).map((campaign: any) => ({
    workspaceId,
    accountDbId: account.id,
    platform: 'meta' as const,
    externalCampaignId: String(campaign.id),
    name: campaign.name || `Campanha ${campaign.id}`,
    status: campaign.effective_status || campaign.status || 'UNKNOWN',
    objective: campaign.objective || null,
    channelType: null,
    metadata: {
      dailyBudget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null,
      lifetimeBudget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : null,
      startTime: campaign.start_time || null,
      stopTime: campaign.stop_time || null,
    },
  }));

  const savedRows = await upsertWorkspaceCampaigns(rows);
  return savedRows.map((row) => ({
    id: row.external_campaign_id,
    platform: 'meta',
    externalCampaignId: row.external_campaign_id,
    name: row.name,
    status: row.status,
    objective: row.objective,
    channelType: row.channel_type,
    metadata: row.metadata,
  }));
}

async function fetchAndPersistGoogleCampaigns(workspaceId: string, accountId: string) {
  const externalAccountId = normalizeGoogleCustomerId(accountId);
  const connection = await getWorkspaceConnection(workspaceId, 'google');
  const accessToken = await ensureGoogleAccessToken(connection);
  const account = await getWorkspaceAccount(workspaceId, 'google', externalAccountId);
  const rows = await googleAdsSearch({
    accessToken,
    customerId: externalAccountId,
    query: `
      select
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type
      from campaign
      where campaign.status != 'REMOVED'
      order by campaign.name
    `,
  });

  const savedRows = await upsertWorkspaceCampaigns(rows.map((row) => ({
    workspaceId,
    accountDbId: account.id,
    platform: 'google' as const,
    externalCampaignId: String(row.campaign.id),
    name: row.campaign.name,
    status: row.campaign.status,
    objective: null,
    channelType: row.campaign.advertisingChannelType,
    metadata: { resourceName: row.campaign.resourceName || null },
  })));

  return savedRows.map((row) => ({
    id: row.external_campaign_id,
    platform: 'google',
    externalCampaignId: row.external_campaign_id,
    name: row.name,
    status: row.status,
    channelType: row.channel_type,
    metadata: row.metadata,
  }));
}

async function upsertWorkspaceCampaigns(rows: Array<{
  workspaceId: string;
  accountDbId: string;
  platform: Platform;
  externalCampaignId: string;
  name: string;
  status: string;
  objective: string | null;
  channelType: string | null;
  metadata: Record<string, unknown>;
}>) {
  const saved: Array<any> = [];
  for (const row of rows) {
    const campaignRows = await queryPostgres<any>(`
      insert into public.ad_platform_campaigns (
        workspace_id, clerk_user_id, account_id, platform, external_campaign_id,
        name, status, objective, channel_type, metadata, updated_at
      )
      values ($1, null, $2, $3, $4, $5, $6, $7, $8, $9, now())
      on conflict (account_id, platform, external_campaign_id)
      do update set
        workspace_id = excluded.workspace_id,
        name = excluded.name,
        status = excluded.status,
        objective = excluded.objective,
        channel_type = excluded.channel_type,
        metadata = excluded.metadata,
        updated_at = now()
      returning *
    `, [
      row.workspaceId,
      row.accountDbId,
      row.platform,
      row.externalCampaignId,
      row.name,
      row.status,
      row.objective,
      row.channelType,
      row.metadata,
    ]);
    if (campaignRows[0]) saved.push(campaignRows[0]);
  }
  return saved;
}

async function fetchAndPersistMetaInsights(
  workspaceId: string,
  accountId: string,
  options: { campaignIds: string[]; datePreset: string; dateStart?: string; dateEnd?: string },
) {
  const externalAccountId = normalizeMetaAccountId(accountId);
  const dateRange = getDateRange(options.datePreset, options.dateStart || null, options.dateEnd || null);
  const connection = await getWorkspaceConnection(workspaceId, 'meta');
  const account = await getWorkspaceAccount(workspaceId, 'meta', externalAccountId);
  const params: Record<string, string> = {
    fields: 'campaign_id,campaign_name,impressions,clicks,ctr,cpc,cpm,spend,reach,frequency,actions,cost_per_action_type',
    level: 'campaign',
    time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
  };

  if (options.campaignIds.length > 0) {
    params.filtering = JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: options.campaignIds }]);
  }

  const insightsData = await metaGraphGet(`${externalAccountId}/insights`, connection.access_token || '', params);
  const objectiveMap = await fetchMetaCampaignObjectives(connection.access_token || '', insightsData.data || []);
  const insights = (insightsData.data || []).map((row: any) => normalizeMetaInsight(row, objectiveMap));
  const platformInsights: InsightRow[] = insights.map((insight: any) => {
    const conversions = insight.leads + insight.purchases + insight.messaging;
    return {
      platform: 'meta',
      accountId: externalAccountId,
      campaignId: insight.campaignId,
      campaignName: insight.campaignName,
      dateStart: dateRange.start,
      dateEnd: dateRange.end,
      spend: insight.spend,
      impressions: insight.impressions,
      clicks: insight.clicks,
      ctr: insight.ctr,
      cpc: insight.cpc,
      cpm: insight.cpm,
      conversions,
      costPerConversion: conversions > 0 ? insight.spend / conversions : null,
      conversionValue: null,
      roas: null,
      raw: insight.raw,
    };
  });
  const dailyData = await fetchMetaDailyData(connection.access_token || '', externalAccountId, dateRange);
  const totals = calculateGenericTotals(platformInsights);
  await persistWorkspaceInsights(workspaceId, account.id, 'meta', platformInsights, dateRange);

  return {
    data: platformInsights,
    dailyData,
    objectiveData: calculateMetaObjectiveData(insights),
    totals,
    platformTotals: { meta: totals, google: undefined },
    datePreset: options.datePreset,
    dateRange,
  };
}

async function fetchAndPersistGoogleInsights(
  workspaceId: string,
  accountId: string,
  options: { campaignIds: string[]; datePreset: string; dateStart?: string; dateEnd?: string },
) {
  const externalAccountId = normalizeGoogleCustomerId(accountId);
  const dateRange = getDateRange(options.datePreset, options.dateStart || null, options.dateEnd || null);
  const connection = await getWorkspaceConnection(workspaceId, 'google');
  const accessToken = await ensureGoogleAccessToken(connection);
  const account = await getWorkspaceAccount(workspaceId, 'google', externalAccountId);
  const campaignFilter = options.campaignIds.length > 0
    ? `and campaign.id in (${options.campaignIds.join(',')})`
    : '';
  const rows = await googleAdsSearch({
    accessToken,
    customerId: externalAccountId,
    query: `
      select
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
      where segments.date between '${dateRange.start}' and '${dateRange.end}'
        and campaign.status != 'REMOVED'
        ${campaignFilter}
    `,
  });

  const insights = rows.map((row) => normalizeGoogleInsight(row, externalAccountId, dateRange));
  const dailyData = await fetchGoogleDailyData(accessToken, externalAccountId, dateRange);
  const totals = calculateGenericTotals(insights);
  await persistWorkspaceInsights(workspaceId, account.id, 'google', insights, dateRange);

  return {
    data: insights,
    totals,
    dailyData,
    platformTotals: { meta: undefined, google: totals },
    datePreset: options.datePreset,
    dateRange,
  };
}

async function persistWorkspaceInsights(
  workspaceId: string,
  accountDbId: string,
  platform: Platform,
  insights: InsightRow[],
  dateRange: DateRange,
) {
  const campaigns = await queryPostgres<{ id: string; external_campaign_id: string }>(`
    select id, external_campaign_id
    from public.ad_platform_campaigns
    where workspace_id = $1 and account_id = $2 and platform = $3
  `, [workspaceId, accountDbId, platform]);
  const campaignMap = new Map(campaigns.map((campaign) => [campaign.external_campaign_id, campaign.id]));

  await queryPostgres(`
    delete from public.ad_insights_snapshots
    where workspace_id = $1 and account_id = $2 and platform = $3 and date_start = $4 and date_end = $5
  `, [workspaceId, accountDbId, platform, dateRange.start, dateRange.end]);

  for (const insight of insights) {
    await queryPostgres(`
      insert into public.ad_insights_snapshots (
        workspace_id, clerk_user_id, account_id, campaign_id, platform, date_start, date_end,
        spend, impressions, clicks, ctr, cpc, cpm, conversions, cost_per_conversion,
        conversion_value, roas, raw
      )
      values ($1, null, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      workspaceId,
      accountDbId,
      insight.campaignId ? campaignMap.get(insight.campaignId) || null : null,
      platform,
      dateRange.start,
      dateRange.end,
      insight.spend,
      insight.impressions,
      insight.clicks,
      insight.ctr,
      insight.cpc,
      insight.cpm,
      insight.conversions,
      insight.costPerConversion,
      insight.conversionValue,
      insight.roas,
      insight.raw || {},
    ]);
  }
}

async function getWorkspaceConnection(
  workspaceId: string,
  platform: Platform,
  requireTokens = true,
): Promise<AdConnectionRow | null> {
  const rows = await queryPostgres<AdConnectionRow>(`
    select id, workspace_id, platform, external_user_id, external_user_name, access_token, refresh_token, token_expires_at
    from public.ad_connections
    where workspace_id = $1 and platform = $2 and status = 'active'
    limit 1
  `, [workspaceId, platform]);
  const connection = rows[0] || null;
  if (!connection && requireTokens) throw createHttpError(`${platformLabel(platform)} não está conectado`, 400);
  if (requireTokens && !connection?.access_token && platform === 'meta') {
    throw createHttpError('Token Meta ausente. Reconecte a plataforma.', 400);
  }
  if (requireTokens && platform === 'google' && !connection?.refresh_token) {
    throw createHttpError('Refresh token Google ausente. Reconecte a plataforma.', 400);
  }
  return connection;
}

async function getWorkspaceAccount(workspaceId: string, platform: Platform, externalAccountId: string) {
  const rows = await queryPostgres<PlatformAccountRow>(`
    select id, workspace_id, connection_id, platform, external_account_id, name, currency, timezone, status, is_active, metadata
    from public.ad_platform_accounts
    where workspace_id = $1 and platform = $2 and external_account_id = $3
    limit 1
  `, [workspaceId, platform, externalAccountId]);

  const account = rows[0];
  if (!account) throw createHttpError(`${platformLabel(platform)} account não foi sincronizada. Atualize as contas primeiro.`, 400);
  return account;
}

async function exchangeMetaCodeForToken(code: string, redirectUri: string): Promise<string> {
  const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', requiredEnv('FACEBOOK_APP_ID', 'VITE_FACEBOOK_APP_ID'));
  tokenUrl.searchParams.set('client_secret', requiredEnv('FACEBOOK_APP_SECRET'));
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const response = await fetch(tokenUrl.toString());
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Falha ao obter token Meta');
  return payload.access_token;
}

async function exchangeMetaLongLivedToken(shortLivedToken: string): Promise<any> {
  const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
  tokenUrl.searchParams.set('client_id', requiredEnv('FACEBOOK_APP_ID', 'VITE_FACEBOOK_APP_ID'));
  tokenUrl.searchParams.set('client_secret', requiredEnv('FACEBOOK_APP_SECRET'));
  tokenUrl.searchParams.set('fb_exchange_token', shortLivedToken);
  const response = await fetch(tokenUrl.toString());
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Falha ao obter token Meta longo');
  return payload;
}

async function exchangeGoogleCodeForTokens(code: string, redirectUri: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'Falha ao trocar código Google');
  return payload;
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'Falha ao renovar token Google');
  return payload;
}

async function ensureGoogleAccessToken(connection: AdConnectionRow | null): Promise<string> {
  if (!connection) throw createHttpError('Google Ads não está conectado', 400);
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (connection.access_token && expiresAt > Date.now() + 60_000) return connection.access_token;
  if (!connection.refresh_token) throw createHttpError('Refresh token Google ausente. Reconecte a plataforma.', 400);

  const refreshed = await refreshGoogleAccessToken(connection.refresh_token);
  const tokenExpiresAt = new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString();
  await queryPostgres(`
    update public.ad_connections
    set access_token = $1, token_expires_at = $2, status = 'active', updated_at = now()
    where id = $3
  `, [refreshed.access_token, tokenExpiresAt, connection.id]);

  return refreshed.access_token;
}

async function fetchMetaProfile(accessToken: string): Promise<any | null> {
  const response = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me?fields=id,name,email&access_token=${accessToken}`);
  return response.ok ? response.json() : null;
}

async function fetchGoogleProfile(accessToken: string): Promise<any | null> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.ok ? response.json() : null;
}

async function metaGraphGet(path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('access_token', accessToken);
  const response = await fetch(url.toString());
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Meta API request failed');
  return payload;
}

async function googleAdsSearch(params: {
  accessToken: string;
  customerId: string;
  query: string;
  loginCustomerId?: string;
}): Promise<any[]> {
  const customerId = normalizeGoogleCustomerId(params.customerId);
  const version = process.env.GOOGLE_ADS_API_VERSION || 'v24';
  const loginCustomerId = params.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.accessToken}`,
    'developer-token': requiredEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) headers['login-customer-id'] = normalizeGoogleCustomerId(loginCustomerId);

  const response = await fetch(`https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:searchStream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: params.query }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(googleAdsErrorMessage(payload, 'Google Ads API request failed'));
  return Array.isArray(payload) ? payload.flatMap((chunk) => chunk.results || []) : [];
}

async function listAccessibleGoogleCustomers(accessToken: string): Promise<string[]> {
  const version = process.env.GOOGLE_ADS_API_VERSION || 'v24';
  const response = await fetch(`https://googleads.googleapis.com/${version}/customers:listAccessibleCustomers`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': requiredEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(googleAdsErrorMessage(payload, 'Falha ao listar clientes Google Ads'));
  return (payload.resourceNames || [])
    .map((resourceName: string) => resourceName.replace('customers/', ''))
    .filter(Boolean);
}

async function fetchGoogleCustomerAccount(accessToken: string, customerId: string) {
  const externalAccountId = normalizeGoogleCustomerId(customerId);
  try {
    const rows = await googleAdsSearch({
      accessToken,
      customerId: externalAccountId,
      query: `
        select
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.status
        from customer
        limit 1
      `,
    });
    const customer = rows[0]?.customer;
    return {
      externalAccountId,
      name: customer?.descriptiveName || `Google Ads ${externalAccountId}`,
      currency: customer?.currencyCode || 'BRL',
      timezone: customer?.timeZone || null,
      status: customer?.status || 'accessible',
      metadata: { resourceName: `customers/${externalAccountId}` },
    };
  } catch (error) {
    return {
      externalAccountId,
      name: `Google Ads ${externalAccountId}`,
      currency: 'BRL',
      timezone: null,
      status: 'accessible',
      metadata: {
        resourceName: `customers/${externalAccountId}`,
        enrichmentError: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function fetchMetaCampaignObjectives(accessToken: string, insights: any[]) {
  const campaignIds = insights.map((item) => item.campaign_id).filter(Boolean);
  if (campaignIds.length === 0) return {};
  const payload = await metaGraphGet('', accessToken, { ids: campaignIds.join(','), fields: 'objective' });
  const labels: Record<string, string> = {
    OUTCOME_TRAFFIC: 'Tráfego',
    OUTCOME_ENGAGEMENT: 'Engajamento',
    OUTCOME_LEADS: 'Cadastros/Leads',
    OUTCOME_SALES: 'Vendas',
    OUTCOME_AWARENESS: 'Reconhecimento',
    CONVERSIONS: 'Conversões',
    MESSAGES: 'Mensagens',
    LINK_CLICKS: 'Cliques no Link',
    LEAD_GENERATION: 'Geração de Leads',
    VIDEO_VIEWS: 'Visualizações de Vídeo',
    REACH: 'Alcance',
    BRAND_AWARENESS: 'Reconhecimento de Marca',
    POST_ENGAGEMENT: 'Engajamento com Post',
    PAGE_LIKES: 'Curtidas na Página',
    APP_INSTALLS: 'Instalações de App',
  };
  return Object.fromEntries(Object.entries(payload).map(([id, value]: [string, any]) => {
    const objective = value?.objective || 'UNKNOWN';
    return [id, { objective, objectiveLabel: labels[objective] || objective }];
  }));
}

function normalizeMetaInsight(row: any, objectives: Record<string, { objective: string; objectiveLabel: string }>) {
  const actions = row.actions || [];
  const costPerAction = row.cost_per_action_type || [];
  const leads = integerValue(actionValue(actions, 'lead'));
  const purchases = integerValue(actionValue(actions, 'purchase'));
  const messaging = integerValue(actionValue(actions, 'onsite_conversion.messaging_conversation_started_7d'));
  const campaignObjective = objectives[row.campaign_id] || { objective: 'UNKNOWN', objectiveLabel: 'Desconhecido' };
  return {
    campaignId: row.campaign_id,
    campaignName: row.campaign_name || 'Campanha sem nome',
    objective: campaignObjective.objective,
    objectiveLabel: campaignObjective.objectiveLabel,
    impressions: integerValue(row.impressions),
    clicks: integerValue(row.clicks),
    ctr: numberValue(row.ctr),
    cpc: numberValue(row.cpc),
    cpm: numberValue(row.cpm),
    spend: numberValue(row.spend),
    reach: integerValue(row.reach),
    frequency: numberValue(row.frequency),
    leads,
    purchases,
    messaging,
    costPerLead: nullableNumber(actionValue(costPerAction, 'lead')),
    costPerPurchase: nullableNumber(actionValue(costPerAction, 'purchase')),
    raw: row,
  };
}

async function fetchMetaDailyData(accessToken: string, accountId: string, dateRange: DateRange) {
  const payload = await metaGraphGet(`${accountId}/insights`, accessToken, {
    fields: 'impressions,clicks,spend,ctr,cpc',
    level: 'account',
    time_increment: '1',
    time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
  });

  return (payload.data || []).map((day: any) => ({
    date: day.date_start,
    dateFormatted: formatPtBrDayMonth(day.date_start),
    platform: 'meta',
    spend: numberValue(day.spend),
    impressions: integerValue(day.impressions),
    clicks: integerValue(day.clicks),
    ctr: numberValue(day.ctr),
    cpc: numberValue(day.cpc),
    conversions: 0,
  }));
}

function normalizeGoogleInsight(row: any, accountId: string, dateRange: DateRange): InsightRow {
  const spend = microsToCurrency(row.metrics?.costMicros);
  const conversionValue = numberValue(row.metrics?.conversionsValue);
  return {
    platform: 'google',
    accountId,
    campaignId: String(row.campaign?.id || ''),
    campaignName: row.campaign?.name || 'Campanha sem nome',
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
    spend,
    impressions: integerValue(row.metrics?.impressions),
    clicks: integerValue(row.metrics?.clicks),
    ctr: numberValue(row.metrics?.ctr) * 100,
    cpc: microsToCurrency(row.metrics?.averageCpc),
    cpm: microsToCurrency(row.metrics?.averageCpm),
    conversions: numberValue(row.metrics?.conversions),
    costPerConversion: row.metrics?.costPerConversion ? microsToCurrency(row.metrics.costPerConversion) : null,
    conversionValue,
    roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
    raw: row,
  };
}

async function fetchGoogleDailyData(accessToken: string, accountId: string, dateRange: DateRange) {
  const rows = await googleAdsSearch({
    accessToken,
    customerId: accountId,
    query: `
      select
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions
      from customer
      where segments.date between '${dateRange.start}' and '${dateRange.end}'
      order by segments.date
    `,
  });

  return rows.map((row) => ({
    date: row.segments.date,
    dateFormatted: formatPtBrDayMonth(row.segments.date),
    platform: 'google',
    spend: microsToCurrency(row.metrics?.costMicros),
    impressions: integerValue(row.metrics?.impressions),
    clicks: integerValue(row.metrics?.clicks),
    ctr: numberValue(row.metrics?.ctr) * 100,
    cpc: microsToCurrency(row.metrics?.averageCpc),
    conversions: numberValue(row.metrics?.conversions),
  }));
}

function calculateMetaObjectiveData(insights: any[]) {
  const objectiveMap: Record<string, any> = {};
  insights.forEach((insight) => {
    if (!objectiveMap[insight.objective]) {
      objectiveMap[insight.objective] = {
        objective: insight.objective,
        objectiveLabel: insight.objectiveLabel,
        spend: 0,
        impressions: 0,
        clicks: 0,
        campaigns: 0,
      };
    }
    objectiveMap[insight.objective].spend += insight.spend;
    objectiveMap[insight.objective].impressions += insight.impressions;
    objectiveMap[insight.objective].clicks += insight.clicks;
    objectiveMap[insight.objective].campaigns += 1;
  });
  return Object.values(objectiveMap).map((objective: any) => ({
    ...objective,
    ctr: objective.impressions > 0 ? (objective.clicks / objective.impressions) * 100 : 0,
    cpc: objective.clicks > 0 ? objective.spend / objective.clicks : 0,
  }));
}

function calculateMetaTotals(insights: any[]) {
  const totals = insights.reduce((acc, item) => ({
    impressions: acc.impressions + item.impressions,
    clicks: acc.clicks + item.clicks,
    spend: acc.spend + item.spend,
    reach: acc.reach + item.reach,
    leads: acc.leads + item.leads,
    purchases: acc.purchases + item.purchases,
    messaging: acc.messaging + item.messaging,
  }), { impressions: 0, clicks: 0, spend: 0, reach: 0, leads: 0, purchases: 0, messaging: 0 });
  const conversions = totals.leads + totals.purchases + totals.messaging;
  return {
    ...totals,
    conversions,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    costPerLead: totals.leads > 0 ? totals.spend / totals.leads : null,
    costPerConversion: conversions > 0 ? totals.spend / conversions : null,
    conversionValue: null,
    roas: null,
  };
}

function calculateGenericTotals(insights: InsightRow[]) {
  const spend = insights.reduce((sum, item) => sum + item.spend, 0);
  const impressions = insights.reduce((sum, item) => sum + item.impressions, 0);
  const clicks = insights.reduce((sum, item) => sum + item.clicks, 0);
  const conversions = insights.reduce((sum, item) => sum + item.conversions, 0);
  const conversionValue = insights.reduce((sum, item) => sum + (item.conversionValue || 0), 0);
  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    conversions,
    costPerConversion: conversions > 0 ? spend / conversions : null,
    conversionValue,
    roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
  };
}

function getDateRange(datePreset: string, dateStart: string | null, dateEnd: string | null): DateRange {
  if (dateStart && dateEnd) return { start: dateStart, end: dateEnd };
  const today = new Date();
  const startDate = new Date(today);
  if (datePreset === 'last_30d') startDate.setDate(today.getDate() - 29);
  else if (datePreset === 'last_60d') startDate.setDate(today.getDate() - 59);
  else if (datePreset === 'yesterday') {
    startDate.setDate(today.getDate() - 1);
    return { start: formatDate(startDate), end: formatDate(startDate) };
  } else if (datePreset === 'today') startDate.setDate(today.getDate());
  else startDate.setDate(today.getDate() - 6);
  return { start: formatDate(startDate), end: formatDate(today) };
}

function parseCampaignIds(campaignIds: string | undefined, platform: Platform): string[] {
  if (!campaignIds) return [];
  return campaignIds
    .split(',')
    .map((id) => platform === 'google' ? normalizeGoogleCustomerId(id) : id.trim())
    .filter(Boolean);
}

function signOAuthState(payload: {
  platform: Platform;
  workspaceId: string;
  returnUrl: string;
  expiresAt: string;
}): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', oauthStateSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyOAuthState(state: string): {
  platform: Platform;
  workspaceId: string;
  returnUrl: string;
  expiresAt: string;
} {
  const [body, signature] = state.split('.');
  if (!body || !signature) throw createHttpError('OAuth state inválido', 400);
  const expected = crypto.createHmac('sha256', oauthStateSecret()).update(body).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw createHttpError('OAuth state inválido', 400);
  }
  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  return {
    platform: parsePlatform(parsed.platform),
    workspaceId: String(parsed.workspaceId || ''),
    returnUrl: String(parsed.returnUrl || ''),
    expiresAt: String(parsed.expiresAt || ''),
  };
}

function workspaceOAuthRedirectUri(req: Request, platform: Platform): string {
  const configured = process.env.NEXUS_API_URL || process.env.VITE_NEXUS_API_URL;
  const baseUrl = configured || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl.replace(/\/+$/, '')}/api/workspace/oauth/${platform}/callback`;
}

function withStatusParam(returnUrl: string, platform: Platform, success: boolean, message?: string): string {
  const url = new URL(returnUrl);
  url.searchParams.set(success ? `${platform === 'meta' ? 'facebook' : 'google'}_connected` : `${platform === 'meta' ? 'facebook' : 'google'}_error`, success ? '1' : message || 'OAuth failed');
  return url.toString();
}

function sanitizeReturnUrl(value?: string): string | undefined {
  if (!value) return undefined;

  try {
    const candidate = new URL(value);
    const allowed = [
      process.env.VITE_APP_URL,
      process.env.FRONTEND_URL,
      'http://localhost:5173',
    ]
      .filter((url): url is string => Boolean(url))
      .map((url) => new URL(url).origin);

    return allowed.includes(candidate.origin) ? candidate.toString() : undefined;
  } catch {
    return undefined;
  }
}

function googleAdsErrorMessage(payload: unknown, fallback: string): string {
  const source = Array.isArray(payload) ? payload[0] : payload;
  const error = isRecord(source) && isRecord(source.error) ? source.error : undefined;
  const baseMessage = typeof error?.message === 'string' ? error.message : '';
  const details = Array.isArray(error?.details)
    ? error.details.flatMap((detail) => {
      if (!isRecord(detail) || !Array.isArray(detail.errors)) return [];
      return detail.errors.map((item) => {
        if (!isRecord(item)) return '';
        const code = isRecord(item.errorCode) ? JSON.stringify(item.errorCode) : '';
        const message = typeof item.message === 'string' ? item.message : '';
        return [code, message].filter(Boolean).join(' - ');
      });
    }).filter(Boolean).join(' | ')
    : '';
  return [baseMessage, details].filter(Boolean).join(' | ') || fallback;
}

function oauthStateSecret(): string {
  return requiredEnv('NEXUS_OAUTH_STATE_SECRET', 'FACEBOOK_APP_SECRET', 'GOOGLE_CLIENT_SECRET');
}

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw createHttpError(`${names.join(' ou ')} não configurado`, 500);
}

function parsePlatform(value: unknown): Platform {
  if (value === 'meta' || value === 'google') return value;
  throw createHttpError('platform deve ser meta ou google', 400);
}

function platformLabel(platform: Platform): string {
  return platform === 'meta' ? 'Meta Ads' : 'Google Ads';
}

function stringQuery(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function normalizeMetaAccountId(accountId: string): string {
  const clean = String(accountId || '').trim();
  if (!clean) return '';
  return clean.startsWith('act_') ? clean : `act_${clean.replace(/\D/g, '')}`;
}

function normalizeGoogleCustomerId(customerId: string): string {
  return customerId.replace(/\D/g, '');
}

function actionValue(actions: any[], type: string): string | number | null {
  return actions.find((action) => action.action_type === type)?.value ?? null;
}

function nullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function integerValue(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function numberValue(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function microsToCurrency(value: string | number | null | undefined): number {
  return numberValue(value) / 1_000_000;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatPtBrDayMonth(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
