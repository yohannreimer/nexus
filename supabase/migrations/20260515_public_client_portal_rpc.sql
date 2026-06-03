create or replace function public.get_public_client_portal(portal_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  portal_row public.client_portals%rowtype;
  client_row public.agency_clients%rowtype;
  latest_run jsonb;
  recent_runs jsonb;
begin
  select *
    into portal_row
    from public.client_portals
    where slug = portal_slug
      and status = 'active'
    limit 1;

  if not found then
    return null;
  end if;

  select *
    into client_row
    from public.agency_clients
    where id = portal_row.client_id
      and status <> 'archived'
    limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'id', r.id,
    'clientId', r.client_id,
    'periodStart', r.period_start,
    'periodEnd', r.period_end,
    'status', r.status,
    'reportMode', r.report_mode,
    'executionType', coalesce(r.execution_type, 'manual'),
    'deterministicMessage', r.deterministic_message,
    'reportHtml', r.report_html,
    'pdfUrl', r.pdf_url,
    'portalSnapshotUrl', r.portal_snapshot_url,
    'warnings', coalesce(r.warnings, '[]'::jsonb),
    'platformsIncluded', coalesce(to_jsonb(r.platforms_included), '[]'::jsonb),
    'summaryPayload', coalesce(r.summary_payload, '{}'::jsonb),
    'createdAt', r.created_at,
    'sentAt', r.sent_at
  )
    into latest_run
    from public.client_report_runs r
    where r.client_id = portal_row.client_id
      and r.status in ('generated', 'sent', 'sent_with_warnings')
    order by r.sent_at desc nulls last, r.created_at desc
    limit 1;

  select coalesce(jsonb_agg(run_row order by run_created_at desc), '[]'::jsonb)
    into recent_runs
    from (
      select
        r.created_at as run_created_at,
        jsonb_build_object(
          'id', r.id,
          'clientId', r.client_id,
          'periodStart', r.period_start,
          'periodEnd', r.period_end,
          'status', r.status,
          'reportMode', r.report_mode,
          'executionType', coalesce(r.execution_type, 'manual'),
          'deterministicMessage', r.deterministic_message,
          'reportHtml', r.report_html,
          'pdfUrl', r.pdf_url,
          'portalSnapshotUrl', r.portal_snapshot_url,
          'warnings', coalesce(r.warnings, '[]'::jsonb),
          'platformsIncluded', coalesce(to_jsonb(r.platforms_included), '[]'::jsonb),
          'summaryPayload', coalesce(r.summary_payload, '{}'::jsonb),
          'createdAt', r.created_at,
          'sentAt', r.sent_at
        ) as run_row
      from public.client_report_runs r
      where r.client_id = portal_row.client_id
        and r.status in ('generated', 'sent', 'sent_with_warnings')
      order by r.sent_at desc nulls last, r.created_at desc
      limit 12
    ) safe_runs;

  return jsonb_build_object(
    'clientName', client_row.name,
    'portal', jsonb_build_object(
      'slug', portal_row.slug,
      'status', portal_row.status,
      'mode', portal_row.mode,
      'branding', coalesce(portal_row.branding, '{}'::jsonb),
      'visibilitySettings', coalesce(portal_row.visibility_settings, '{}'::jsonb)
    ),
    'latestRun', latest_run,
    'recentRuns', coalesce(recent_runs, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_public_client_portal(text) from public;
grant execute on function public.get_public_client_portal(text) to anon, authenticated;
