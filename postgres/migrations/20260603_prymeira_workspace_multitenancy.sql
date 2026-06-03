create extension if not exists pgcrypto;

alter table if exists public.facebook_connections
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_connections
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_connections
  alter column user_id drop not null;

alter table if exists public.ad_platform_accounts
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_platform_accounts
  alter column user_id drop not null;

alter table if exists public.ad_platform_campaigns
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_platform_campaigns
  alter column user_id drop not null;

alter table if exists public.ad_insights_snapshots
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_insights_snapshots
  alter column user_id drop not null;

alter table if exists public.agency_clients
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.agency_client_accounts
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_report_settings
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_report_runs
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_portals
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_ai_profiles
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_ai_analyses
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.agency_ai_briefings
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.agency_config
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.user_settings
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

do $$
begin
  if to_regclass('public.ad_connections') is not null then
    create index if not exists idx_ad_connections_workspace_platform
      on public.ad_connections(workspace_id, platform);

    create unique index if not exists idx_ad_connections_workspace_platform_unique
      on public.ad_connections(workspace_id, platform)
      where workspace_id is not null;
  end if;
end $$;

do $$
begin
  if to_regclass('public.ad_platform_accounts') is not null then
    create index if not exists idx_ad_platform_accounts_workspace_platform
      on public.ad_platform_accounts(workspace_id, platform);

    create unique index if not exists idx_ad_platform_accounts_workspace_platform_external_unique
      on public.ad_platform_accounts(workspace_id, platform, external_account_id)
      where workspace_id is not null;
  end if;
end $$;

do $$
begin
  if to_regclass('public.ad_platform_campaigns') is not null then
    create index if not exists idx_ad_platform_campaigns_workspace_account
      on public.ad_platform_campaigns(workspace_id, account_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.ad_insights_snapshots') is not null then
    create index if not exists idx_ad_insights_snapshots_workspace_dates
      on public.ad_insights_snapshots(workspace_id, date_start, date_end);
  end if;
end $$;

do $$
begin
  if to_regclass('public.agency_clients') is not null then
    create index if not exists idx_agency_clients_workspace
      on public.agency_clients(workspace_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.client_report_runs') is not null then
    create index if not exists idx_client_report_runs_workspace_client
      on public.client_report_runs(workspace_id, client_id, created_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.client_portals') is not null then
    create index if not exists idx_client_portals_workspace_slug
      on public.client_portals(workspace_id, slug);
  end if;
end $$;
