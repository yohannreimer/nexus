import type express from 'express';
import type { Request, Response } from 'express';
import { queryPostgres } from './postgres';
import type { ServerWorkspaceContext } from './prymeiraAccess';

type MountWorkspaceDataRoutesInput = {
  requireWorkspace: (req: Request) => Promise<ServerWorkspaceContext>;
  respondNexusApiError: (res: Response, error: unknown) => unknown;
};

type Platform = 'meta' | 'google';

const CLIENT_REPORT_RUN_SAFE_SELECT = `
  id, user_id, client_id, period_start, period_end, status, report_mode,
  execution_type, idempotency_key, linked_account_ids, deterministic_message,
  report_html, pdf_url, portal_snapshot_url, webhook_target, webhook_response,
  attempt_count, scheduled_for, warnings, platforms_included, summary_payload,
  error_message, created_at, sent_at
`;

export function mountWorkspaceDataRoutes(
  app: express.Express,
  { requireWorkspace, respondNexusApiError }: MountWorkspaceDataRoutesInput,
) {
  app.get('/api/public/client-portals/:slug', async (req: Request, res: Response) => {
    try {
      const portalRows = await queryPostgres<any>(`
        select p.*, c.name as client_name
        from public.client_portals p
        join public.agency_clients c on c.id = p.client_id
        where p.slug = $1 and p.status = 'active'
        limit 1
      `, [req.params.slug]);

      const portal = portalRows[0];
      if (!portal) {
        res.json({ data: null });
        return;
      }

      const runs = await queryPostgres<any>(`
        select ${CLIENT_REPORT_RUN_SAFE_SELECT}
        from public.client_report_runs
        where client_id = $1 and status in ('generated', 'sent', 'sent_with_warnings')
        order by created_at desc
        limit 12
      `, [portal.client_id]);

      const recentRuns = runs.map(mapPublicReportRun);
      res.json({
        data: {
          clientName: portal.client_name || 'Cliente',
          portal: {
            slug: portal.slug,
            status: portal.status,
            mode: portal.mode,
            branding: sanitizeRecord(portal.branding),
            visibility: {
              ...defaultPortalVisibility(portal.mode),
              ...booleanRecord(portal.visibility_settings),
            },
          },
          latestRun: recentRuns[0] || null,
          recentRuns,
        },
      });
    } catch (error) {
      console.error('❌ Erro no portal público Nexus:', error);
      res.status(500).json({ error: 'Erro ao carregar portal público' });
    }
  });

  app.get('/api/workspace/agency-settings', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const rows = await queryPostgres<Record<string, unknown>>(`
        select name, logo, primary_color, secondary_color, email, phone, website,
          address, cnpj, default_send_time, webhook_url, report_footer
        from public.agency_settings
        where workspace_id = $1
        limit 1
      `, [workspace.workspaceId]);

      res.json({ data: rows[0] || null });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.put('/api/workspace/agency-settings', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const body = req.body || {};
      const rows = await queryPostgres(`
        insert into public.agency_settings (
          workspace_id, clerk_user_id, name, logo, primary_color, secondary_color,
          email, phone, website, address, cnpj, default_send_time, webhook_url,
          report_footer, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
        on conflict (workspace_id)
        do update set
          clerk_user_id = excluded.clerk_user_id,
          name = excluded.name,
          logo = excluded.logo,
          primary_color = excluded.primary_color,
          secondary_color = excluded.secondary_color,
          email = excluded.email,
          phone = excluded.phone,
          website = excluded.website,
          address = excluded.address,
          cnpj = excluded.cnpj,
          default_send_time = excluded.default_send_time,
          webhook_url = excluded.webhook_url,
          report_footer = excluded.report_footer,
          updated_at = now()
        returning name, logo, primary_color, secondary_color, email, phone,
          website, address, cnpj, default_send_time, webhook_url, report_footer
      `, [
        workspace.workspaceId,
        null,
        stringValue(body.name),
        stringValue(body.logo),
        stringValue(body.primaryColor, '#6366f1'),
        stringValue(body.secondaryColor, '#8b5cf6'),
        stringValue(body.email),
        stringValue(body.phone),
        stringValue(body.website),
        stringValue(body.address),
        stringValue(body.cnpj),
        stringValue(body.defaultSendTime, '08:00'),
        stringValue(body.webhookUrl),
        stringValue(body.reportFooter, 'Relatório gerado automaticamente por {{agency_name}}'),
      ]);

      res.json({ data: rows[0] });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/client-account-links', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const rows = await queryPostgres(`
        select
          l.id, l.user_id, l.client_id, l.account_id, l.platform, l.is_active,
          l.created_at, l.updated_at,
          jsonb_build_object(
            'id', a.id,
            'platform', a.platform,
            'external_account_id', a.external_account_id,
            'name', a.name,
            'currency', a.currency,
            'timezone', a.timezone,
            'status', a.status,
            'is_active', a.is_active,
            'metadata', a.metadata
          ) as account
        from public.agency_client_accounts l
        left join public.ad_platform_accounts a on a.id = l.account_id
        where l.workspace_id = $1 and l.is_active = true
        order by l.created_at desc
      `, [workspace.workspaceId]);

      res.json({ data: rows });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.post('/api/workspace/client-account-links', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const clientId = stringValue(req.body?.clientId);
      const accountId = stringValue(req.body?.accountId);
      const platform = parsePlatform(req.body?.platform);
      if (!clientId || !accountId) throw createHttpError('clientId e accountId são obrigatórios', 400);

      const accountRows = await queryPostgres(`
        select id, platform, external_account_id, name, currency, timezone, status, is_active, metadata
        from public.ad_platform_accounts
        where workspace_id = $1 and id = $2 and platform = $3
        limit 1
      `, [workspace.workspaceId, accountId, platform]);
      if (!accountRows[0]) throw createHttpError('Conta de anúncio não encontrada no workspace', 404);

      const rows = await queryPostgres<Record<string, unknown>>(`
        insert into public.agency_client_accounts (
          user_id, workspace_id, clerk_user_id, client_id, account_id, platform, is_active, updated_at
        )
        values (null, $1, $2, $3, $4, $5, true, now())
        on conflict (account_id) where is_active = true do nothing
        returning id, user_id, client_id, account_id, platform, is_active, created_at, updated_at
      `, [workspace.workspaceId, null, clientId, accountId, platform]);

      if (!rows[0]) throw createHttpError('Esta conta já está vinculada a outro cliente.', 409);
      res.status(201).json({ data: { ...rows[0], account: accountRows[0] } });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.patch('/api/workspace/client-account-links/:id/unlink', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      await queryPostgres(`
        update public.agency_client_accounts
        set is_active = false, updated_at = now()
        where workspace_id = $1 and id = $2
      `, [workspace.workspaceId, req.params.id]);
      res.json({ ok: true });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/client-report-settings', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const rows = await queryPostgres(`
        select *
        from public.client_report_settings
        where workspace_id = $1
        order by send_time asc
      `, [workspace.workspaceId]);
      res.json({ data: rows });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.put('/api/workspace/client-report-settings/:clientId', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const existingRows = await queryPostgres(`
        select *
        from public.client_report_settings
        where workspace_id = $1 and client_id = $2
        limit 1
      `, [workspace.workspaceId, req.params.clientId]);
      const merged = mergeReportSettings(existingRows[0] || null, req.body || {});
      const rows = await queryPostgres(`
        insert into public.client_report_settings (
          user_id, workspace_id, clerk_user_id, client_id, default_period, send_time,
          timezone, delivery_enabled, delivery_frequency, weekly_day, monthly_day,
          delivery_target, webhook_url, default_report_mode, portal_mode,
          client_report_exposure, internal_ai_enabled, briefing_enabled,
          report_template_settings, updated_at
        )
        values (
          null, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, now()
        )
        on conflict (client_id)
        do update set
          workspace_id = excluded.workspace_id,
          clerk_user_id = excluded.clerk_user_id,
          default_period = excluded.default_period,
          send_time = excluded.send_time,
          timezone = excluded.timezone,
          delivery_enabled = excluded.delivery_enabled,
          delivery_frequency = excluded.delivery_frequency,
          weekly_day = excluded.weekly_day,
          monthly_day = excluded.monthly_day,
          delivery_target = excluded.delivery_target,
          webhook_url = excluded.webhook_url,
          default_report_mode = excluded.default_report_mode,
          portal_mode = excluded.portal_mode,
          client_report_exposure = excluded.client_report_exposure,
          internal_ai_enabled = excluded.internal_ai_enabled,
          briefing_enabled = excluded.briefing_enabled,
          report_template_settings = excluded.report_template_settings,
          updated_at = now()
        returning *
      `, [
        workspace.workspaceId,
        null,
        req.params.clientId,
        merged.default_period,
        merged.send_time,
        merged.timezone,
        merged.delivery_enabled,
        merged.delivery_frequency,
        merged.weekly_day,
        merged.monthly_day,
        merged.delivery_target,
        merged.webhook_url,
        merged.default_report_mode,
        merged.portal_mode,
        merged.client_report_exposure,
        merged.internal_ai_enabled,
        merged.briefing_enabled,
        merged.report_template_settings,
      ]);
      res.json({ data: rows[0] });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/client-report-runs', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const clientId = optionalString(req.query.client_id);
      const limit = clampInteger(optionalString(req.query.limit), 1, 200, 100);
      const rows = clientId
        ? await queryPostgres(`
            select ${CLIENT_REPORT_RUN_SAFE_SELECT}
            from public.client_report_runs
            where workspace_id = $1 and client_id = $2
            order by created_at desc
            limit $3
          `, [workspace.workspaceId, clientId, limit])
        : await queryPostgres(`
            select ${CLIENT_REPORT_RUN_SAFE_SELECT}
            from public.client_report_runs
            where workspace_id = $1
            order by created_at desc
            limit $2
          `, [workspace.workspaceId, limit]);
      res.json({ data: rows });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.patch('/api/workspace/client-report-runs/:id/retry', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const rows = await queryPostgres(`
        update public.client_report_runs
        set status = 'pending', error_message = null, sent_at = null
        where workspace_id = $1 and id = $2 and status = 'failed' and execution_type = 'scheduled'
        returning ${CLIENT_REPORT_RUN_SAFE_SELECT}
      `, [workspace.workspaceId, req.params.id]);
      if (!rows[0]) throw createHttpError('Relatório não encontrado para reenvio', 404);
      res.json({ data: rows[0] });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/client-daily-snapshots', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const days = clampInteger(optionalString(req.query.days), 1, 90, 15);
      const rows = await queryPostgres(`
        select
          l.client_id as "clientId",
          s.date_start::text as date,
          coalesce(sum(s.spend), 0)::float as spend,
          coalesce(sum(s.impressions), 0)::float as impressions,
          coalesce(sum(s.clicks), 0)::float as clicks,
          coalesce(sum(s.conversions), 0)::float as conversions,
          count(distinct s.account_id)::int as "accountCount",
          count(distinct s.campaign_id)::int as "campaignCount"
        from public.agency_client_accounts l
        join public.ad_insights_snapshots s on s.account_id = l.account_id
        where l.workspace_id = $1
          and l.is_active = true
          and s.date_start = s.date_end
          and s.date_start >= (current_date - ($2::int - 1))
        group by l.client_id, s.date_start
        order by s.date_start asc
      `, [workspace.workspaceId, days]);
      res.json({ data: rows });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/client-portals', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const rows = await queryPostgres(`
        select *
        from public.client_portals
        where workspace_id = $1
        order by created_at desc
      `, [workspace.workspaceId]);
      res.json({ data: rows });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.put('/api/workspace/client-portals/:clientId', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const body = req.body || {};
      const rows = await queryPostgres(`
        insert into public.client_portals (
          user_id, workspace_id, clerk_user_id, client_id, slug, status, mode,
          branding, visibility_settings, access_settings, updated_at
        )
        values (null, $1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        on conflict (client_id)
        do update set
          workspace_id = excluded.workspace_id,
          clerk_user_id = excluded.clerk_user_id,
          slug = excluded.slug,
          status = excluded.status,
          mode = excluded.mode,
          branding = excluded.branding,
          visibility_settings = excluded.visibility_settings,
          access_settings = excluded.access_settings,
          updated_at = now()
        returning *
      `, [
        workspace.workspaceId,
        null,
        req.params.clientId,
        stringValue(body.slug),
        body.status === 'paused' ? 'paused' : 'active',
        ['essential', 'executive', 'complete'].includes(body.mode) ? body.mode : 'executive',
        recordValue(body.branding),
        recordValue(body.visibilitySettings),
        recordValue(body.accessSettings),
      ]);
      res.json({ data: rows[0] });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/client-ai-profiles', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const clientId = optionalString(req.query.client_id);
      const rows = clientId
        ? await queryPostgres(`
            select * from public.client_ai_profiles
            where workspace_id = $1 and client_id = $2
            limit 1
          `, [workspace.workspaceId, clientId])
        : await queryPostgres(`
            select * from public.client_ai_profiles
            where workspace_id = $1
            order by created_at desc
          `, [workspace.workspaceId]);
      res.json({ data: clientId ? rows[0] || null : rows });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.put('/api/workspace/client-ai-profiles/:clientId', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const body = req.body || {};
      const rows = await queryPostgres(`
        insert into public.client_ai_profiles (
          user_id, workspace_id, clerk_user_id, client_id, objective, tone,
          business_rules, important_metrics, exposure_level, internal_ai_enabled,
          briefing_enabled, updated_at
        )
        values (null, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        on conflict (client_id)
        do update set
          workspace_id = excluded.workspace_id,
          clerk_user_id = excluded.clerk_user_id,
          objective = excluded.objective,
          tone = excluded.tone,
          business_rules = excluded.business_rules,
          important_metrics = excluded.important_metrics,
          exposure_level = excluded.exposure_level,
          internal_ai_enabled = excluded.internal_ai_enabled,
          briefing_enabled = excluded.briefing_enabled,
          updated_at = now()
        returning *
      `, [
        workspace.workspaceId,
        null,
        req.params.clientId,
        stringValue(body.objective, 'mixed'),
        stringValue(body.tone, 'consultative'),
        recordValue(body.businessRules),
        Array.isArray(body.importantMetrics) ? body.importantMetrics : [],
        stringValue(body.exposureLevel, 'normal'),
        Boolean(body.internalAiEnabled),
        Boolean(body.briefingEnabled),
      ]);
      res.json({ data: rows[0] });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/client-ai-analyses', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const clientId = optionalString(req.query.client_id);
      if (!clientId) throw createHttpError('client_id é obrigatório', 400);
      const rows = await queryPostgres(`
        select *
        from public.client_ai_analyses
        where workspace_id = $1 and client_id = $2
        order by created_at desc
      `, [workspace.workspaceId, clientId]);
      res.json({ data: rows });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.post('/api/workspace/client-ai-analyses', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const body = req.body || {};
      const rows = await queryPostgres(`
        insert into public.client_ai_analyses (
          user_id, workspace_id, clerk_user_id, client_id, report_run_id,
          period_start, period_end, summary, positives, attention_points,
          internal_alerts, recommendations, talking_points, risk_level,
          opportunity_level, raw_ai_payload, provider, model
        )
        values (
          null, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17
        )
        returning *
      `, [
        workspace.workspaceId,
        null,
        stringValue(body.clientId),
        nullableString(body.reportRunId),
        stringValue(body.periodStart),
        stringValue(body.periodEnd),
        stringValue(body.summary),
        arrayValue(body.positives),
        arrayValue(body.attentionPoints),
        arrayValue(body.internalAlerts),
        arrayValue(body.recommendations),
        arrayValue(body.talkingPoints),
        stringValue(body.riskLevel, 'normal'),
        stringValue(body.opportunityLevel, 'normal'),
        recordValue(body.rawAiPayload),
        nullableString(body.provider),
        nullableString(body.model),
      ]);
      res.status(201).json({ data: rows[0] });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.get('/api/workspace/agency-ai-briefings', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const rows = await queryPostgres(`
        select *
        from public.agency_ai_briefings
        where workspace_id = $1
        order by briefing_date desc
      `, [workspace.workspaceId]);
      res.json({ data: rows });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });

  app.put('/api/workspace/agency-ai-briefings/:briefingDate', async (req: Request, res: Response) => {
    try {
      const workspace = await requireWorkspace(req);
      const body = req.body || {};
      const rows = await queryPostgres(`
        insert into public.agency_ai_briefings (
          user_id, workspace_id, clerk_user_id, briefing_date, portfolio_summary,
          client_priorities, alerts, opportunities, generated_text, provider, model
        )
        values (null, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        on conflict (workspace_id, briefing_date)
        where workspace_id is not null
        do update set
          clerk_user_id = excluded.clerk_user_id,
          portfolio_summary = excluded.portfolio_summary,
          client_priorities = excluded.client_priorities,
          alerts = excluded.alerts,
          opportunities = excluded.opportunities,
          generated_text = excluded.generated_text,
          provider = excluded.provider,
          model = excluded.model
        returning *
      `, [
        workspace.workspaceId,
        null,
        req.params.briefingDate,
        recordValue(body.portfolioSummary),
        arrayValue(body.clientPriorities),
        arrayValue(body.alerts),
        arrayValue(body.opportunities),
        stringValue(body.generatedText),
        nullableString(body.provider),
        nullableString(body.model),
      ]);
      res.json({ data: rows[0] });
    } catch (error) {
      respondNexusApiError(res, error);
    }
  });
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parsePlatform(value: unknown): Platform {
  if (value === 'meta' || value === 'google') return value;
  throw createHttpError('platform inválida', 400);
}

function clampInteger(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function mergeReportSettings(existing: any | null, input: Record<string, unknown>) {
  const deliveryFrequency = stringValue(input.deliveryFrequency, existing?.delivery_frequency || 'daily');
  return {
    default_period: stringValue(input.defaultPeriod, existing?.default_period || 'last_30d'),
    send_time: stringValue(input.sendTime, existing?.send_time || '08:00'),
    timezone: stringValue(input.timezone, existing?.timezone || 'America/Sao_Paulo'),
    delivery_enabled: input.deliveryEnabled !== undefined ? Boolean(input.deliveryEnabled) : Boolean(existing?.delivery_enabled),
    delivery_frequency: deliveryFrequency,
    weekly_day: deliveryFrequency === 'weekly'
      ? input.weeklyDay !== undefined ? input.weeklyDay : existing?.weekly_day ?? 1
      : null,
    monthly_day: deliveryFrequency === 'monthly'
      ? input.monthlyDay !== undefined ? input.monthlyDay : existing?.monthly_day ?? 1
      : null,
    delivery_target: input.deliveryTarget !== undefined ? nullableString(input.deliveryTarget) : existing?.delivery_target ?? null,
    webhook_url: input.webhookUrl !== undefined ? nullableString(input.webhookUrl) : existing?.webhook_url ?? null,
    default_report_mode: stringValue(input.defaultReportMode, existing?.default_report_mode || 'executive'),
    portal_mode: stringValue(input.portalMode, existing?.portal_mode || 'executive'),
    client_report_exposure: stringValue(input.clientReportExposure, existing?.client_report_exposure || 'executive_safe'),
    internal_ai_enabled: input.internalAiEnabled !== undefined ? Boolean(input.internalAiEnabled) : Boolean(existing?.internal_ai_enabled),
    briefing_enabled: input.briefingEnabled !== undefined ? Boolean(input.briefingEnabled) : Boolean(existing?.briefing_enabled),
    report_template_settings: input.reportTemplateSettings !== undefined
      ? recordValue(input.reportTemplateSettings)
      : existing?.report_template_settings || {},
  };
}

function createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function mapPublicReportRun(row: any): Record<string, unknown> {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    reportMode: row.report_mode,
    deterministicMessage: row.deterministic_message,
    reportHtml: row.report_html,
    pdfUrl: row.pdf_url,
    portalSnapshotUrl: row.portal_snapshot_url,
    platformsIncluded: row.platforms_included || [],
    summary: sanitizeUnknown(row.summary_payload || {}),
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

function defaultPortalVisibility(mode: string): Record<string, boolean> {
  const base = {
    kpis: true,
    comparison: false,
    simpleChart: false,
    history: true,
    platformBreakdown: false,
    campaigns: false,
    detailedCharts: false,
  };

  if (mode === 'complete') {
    return {
      ...base,
      comparison: true,
      simpleChart: true,
      platformBreakdown: true,
      campaigns: true,
      detailedCharts: true,
    };
  }

  if (mode === 'executive') {
    return {
      ...base,
      comparison: true,
      simpleChart: true,
    };
  }

  return base;
}

function booleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, boolean>>((result, [key, item]) => {
    if (typeof item === 'boolean') result[key] = item;
    return result;
  }, {});
}

function sanitizeRecord(value: unknown): Record<string, unknown> {
  const sanitized = sanitizeUnknown(value);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : {};
}

function sanitizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeUnknown);
  if (!value || typeof value !== 'object') return value;

  const blocked = new Set([
    'accessToken',
    'refreshToken',
    'token',
    'webhookUrl',
    'webhookTarget',
    'webhookResponse',
    'externalAccountId',
    'external_account_id',
    'rawAccountId',
    'raw_account_id',
    'accountId',
    'account_id',
    'linkedAccountIds',
    'linked_account_ids',
    'rawAiPayload',
    'raw_ai_payload',
    'internalRecommendations',
    'internal_recommendations',
    'recommendations',
  ]);

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, item]) => {
    if (blocked.has(key)) return result;
    result[key] = sanitizeUnknown(item);
    return result;
  }, {});
}
