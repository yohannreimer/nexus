create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ad_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  platform text not null check (platform in ('meta', 'google')),
  external_user_id text,
  external_user_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] default '{}',
  status text default 'active' check (status in ('active', 'expired', 'revoked', 'error')),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ad_platform_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  connection_id uuid references public.ad_connections(id) on delete cascade,
  platform text not null check (platform in ('meta', 'google')),
  external_account_id text not null,
  name text not null,
  currency text default 'BRL',
  timezone text,
  status text default 'active',
  is_active boolean default true,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ad_platform_campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  external_campaign_id text not null,
  name text not null,
  status text default 'UNKNOWN',
  objective text,
  channel_type text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ad_insights_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  campaign_id uuid references public.ad_platform_campaigns(id) on delete set null,
  platform text not null check (platform in ('meta', 'google')),
  date_start date not null,
  date_end date not null,
  spend numeric default 0,
  impressions bigint default 0,
  clicks bigint default 0,
  ctr numeric default 0,
  cpc numeric default 0,
  cpm numeric default 0,
  conversions numeric default 0,
  cost_per_conversion numeric,
  conversion_value numeric,
  roas numeric,
  raw jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.agency_clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  primary_whatsapp text,
  internal_owner text,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_client_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  client_id uuid references public.agency_clients(id) on delete cascade not null,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_report_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  client_id uuid references public.agency_clients(id) on delete cascade not null,
  default_period text not null default 'yesterday' check (default_period in ('today', 'yesterday', 'last_7d', 'last_30d', 'custom')),
  send_time text not null default '08:00',
  timezone text not null default 'America/Sao_Paulo',
  delivery_enabled boolean not null default false,
  delivery_frequency text default 'daily' check (delivery_frequency in ('daily', 'weekly', 'monthly')),
  weekly_day integer,
  monthly_day integer,
  delivery_target text,
  webhook_url text,
  default_report_mode text not null default 'executive' check (default_report_mode in ('executive', 'analytical')),
  portal_mode text not null default 'executive',
  client_report_exposure text not null default 'executive_safe',
  internal_ai_enabled boolean not null default false,
  briefing_enabled boolean not null default false,
  report_template_settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);

create table if not exists public.client_report_runs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  client_id uuid references public.agency_clients(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'generated' check (status in ('pending', 'processing', 'generated', 'sent', 'failed', 'sent_with_warnings')),
  report_mode text not null default 'executive' check (report_mode in ('executive', 'analytical')),
  execution_type text not null default 'manual',
  idempotency_key text,
  linked_account_ids uuid[] not null default '{}',
  deterministic_message text,
  report_html text,
  pdf_url text,
  portal_snapshot_url text,
  webhook_target text,
  webhook_response jsonb not null default '{}',
  attempt_count integer not null default 0,
  scheduled_for timestamptz,
  warnings jsonb not null default '[]',
  platforms_included text[] not null default '{}',
  summary_payload jsonb not null default '{}',
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.client_portals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  client_id uuid references public.agency_clients(id) on delete cascade not null unique,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'paused')),
  mode text not null default 'executive' check (mode in ('essential', 'executive', 'complete')),
  branding jsonb not null default '{}',
  visibility_settings jsonb not null default '{}',
  access_settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_ai_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  client_id uuid references public.agency_clients(id) on delete cascade not null unique,
  objective text not null default 'mixed',
  tone text not null default 'consultative',
  business_rules jsonb not null default '{}',
  important_metrics jsonb not null default '[]',
  exposure_level text not null default 'normal',
  internal_ai_enabled boolean not null default false,
  briefing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_ai_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  client_id uuid references public.agency_clients(id) on delete cascade not null,
  report_run_id uuid references public.client_report_runs(id) on delete set null,
  period_start date not null,
  period_end date not null,
  summary text not null default '',
  positives jsonb not null default '[]',
  attention_points jsonb not null default '[]',
  internal_alerts jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  talking_points jsonb not null default '[]',
  risk_level text not null default 'normal',
  opportunity_level text not null default 'normal',
  raw_ai_payload jsonb not null default '{}',
  provider text,
  model text,
  created_at timestamptz not null default now()
);

create table if not exists public.agency_ai_briefings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  workspace_id uuid,
  clerk_user_id text,
  briefing_date date not null,
  portfolio_summary jsonb not null default '{}',
  client_priorities jsonb not null default '[]',
  alerts jsonb not null default '[]',
  opportunities jsonb not null default '[]',
  generated_text text not null default '',
  provider text,
  model text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ad_connections_workspace_platform_unique
  on public.ad_connections(workspace_id, platform)
  where workspace_id is not null;

create unique index if not exists idx_ad_connections_user_platform_unique
  on public.ad_connections(user_id, platform)
  where user_id is not null;

create unique index if not exists idx_ad_platform_accounts_workspace_platform_external_unique
  on public.ad_platform_accounts(workspace_id, platform, external_account_id)
  where workspace_id is not null;

create unique index if not exists idx_ad_platform_accounts_user_platform_external_unique
  on public.ad_platform_accounts(user_id, platform, external_account_id)
  where user_id is not null;

create unique index if not exists idx_ad_platform_campaigns_account_platform_external_unique
  on public.ad_platform_campaigns(account_id, platform, external_campaign_id);

create unique index if not exists idx_agency_client_accounts_active_account
  on public.agency_client_accounts(account_id)
  where is_active = true;

create unique index if not exists idx_client_report_runs_idempotency_key
  on public.client_report_runs(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists idx_agency_ai_briefings_workspace_date_unique
  on public.agency_ai_briefings(workspace_id, briefing_date)
  where workspace_id is not null;

create unique index if not exists idx_agency_ai_briefings_user_date_unique
  on public.agency_ai_briefings(user_id, briefing_date)
  where user_id is not null;

create index if not exists idx_ad_platform_accounts_workspace_platform
  on public.ad_platform_accounts(workspace_id, platform);

create index if not exists idx_ad_platform_campaigns_workspace_account
  on public.ad_platform_campaigns(workspace_id, account_id);

create index if not exists idx_ad_insights_snapshots_workspace_dates
  on public.ad_insights_snapshots(workspace_id, date_start, date_end);

create index if not exists idx_agency_clients_workspace
  on public.agency_clients(workspace_id);

create index if not exists idx_client_report_runs_workspace_client
  on public.client_report_runs(workspace_id, client_id, created_at desc);

create index if not exists idx_client_portals_workspace_slug
  on public.client_portals(workspace_id, slug);

drop trigger if exists update_ad_connections_updated_at on public.ad_connections;
create trigger update_ad_connections_updated_at
  before update on public.ad_connections
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_ad_platform_accounts_updated_at on public.ad_platform_accounts;
create trigger update_ad_platform_accounts_updated_at
  before update on public.ad_platform_accounts
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_ad_platform_campaigns_updated_at on public.ad_platform_campaigns;
create trigger update_ad_platform_campaigns_updated_at
  before update on public.ad_platform_campaigns
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_agency_clients_updated_at on public.agency_clients;
create trigger update_agency_clients_updated_at
  before update on public.agency_clients
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_agency_client_accounts_updated_at on public.agency_client_accounts;
create trigger update_agency_client_accounts_updated_at
  before update on public.agency_client_accounts
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_client_report_settings_updated_at on public.client_report_settings;
create trigger update_client_report_settings_updated_at
  before update on public.client_report_settings
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_client_portals_updated_at on public.client_portals;
create trigger update_client_portals_updated_at
  before update on public.client_portals
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_client_ai_profiles_updated_at on public.client_ai_profiles;
create trigger update_client_ai_profiles_updated_at
  before update on public.client_ai_profiles
  for each row execute function public.update_updated_at_column();
