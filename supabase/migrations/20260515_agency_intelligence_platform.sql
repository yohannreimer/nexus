alter table public.client_report_settings
  add column if not exists portal_mode text not null default 'executive',
  add column if not exists client_report_exposure text not null default 'executive_safe',
  add column if not exists internal_ai_enabled boolean not null default false,
  add column if not exists briefing_enabled boolean not null default false,
  add column if not exists report_template_settings jsonb not null default '{}';

alter table public.client_report_runs
  add column if not exists execution_type text not null default 'manual',
  add column if not exists idempotency_key text,
  add column if not exists linked_account_ids uuid[] not null default '{}',
  add column if not exists deterministic_message text,
  add column if not exists report_html text,
  add column if not exists pdf_url text,
  add column if not exists portal_snapshot_url text,
  add column if not exists webhook_target text,
  add column if not exists webhook_response jsonb not null default '{}',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists scheduled_for timestamptz,
  add column if not exists warnings jsonb not null default '[]';

alter table public.client_report_runs
  drop constraint if exists client_report_runs_status_check;

alter table public.client_report_runs
  add constraint client_report_runs_status_check
  check (status in ('pending', 'processing', 'generated', 'sent', 'failed', 'sent_with_warnings'));

create unique index if not exists idx_client_report_runs_idempotency_key
  on public.client_report_runs (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.client_portals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
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
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.agency_clients(id) on delete cascade not null unique,
  objective text not null default 'mixed',
  tone text not null default 'consultative',
  business_rules jsonb not null default '{}',
  important_metrics jsonb not null default '{}',
  exposure_level text not null default 'normal',
  internal_ai_enabled boolean not null default false,
  briefing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_ai_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
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
  user_id uuid references auth.users(id) on delete cascade not null,
  briefing_date date not null,
  portfolio_summary jsonb not null default '{}',
  client_priorities jsonb not null default '[]',
  alerts jsonb not null default '[]',
  opportunities jsonb not null default '[]',
  generated_text text not null default '',
  provider text,
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

alter table public.client_portals enable row level security;
alter table public.client_ai_profiles enable row level security;
alter table public.client_ai_analyses enable row level security;
alter table public.agency_ai_briefings enable row level security;

drop policy if exists "Users manage own client portals" on public.client_portals;
create policy "Users manage own client portals" on public.client_portals
  for all using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_portals.client_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_portals.client_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own client ai profiles" on public.client_ai_profiles;
create policy "Users manage own client ai profiles" on public.client_ai_profiles
  for all using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_ai_profiles.client_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_ai_profiles.client_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own client ai analyses" on public.client_ai_analyses;
create policy "Users manage own client ai analyses" on public.client_ai_analyses
  for all using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_ai_analyses.client_id
        and c.user_id = (select auth.uid())
    )
    and (
      report_run_id is null
      or exists (
        select 1
        from public.client_report_runs r
        where r.id = client_ai_analyses.report_run_id
          and r.client_id = client_ai_analyses.client_id
          and r.user_id = (select auth.uid())
      )
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_ai_analyses.client_id
        and c.user_id = (select auth.uid())
    )
    and (
      report_run_id is null
      or exists (
        select 1
        from public.client_report_runs r
        where r.id = client_ai_analyses.report_run_id
          and r.client_id = client_ai_analyses.client_id
          and r.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage own agency ai briefings" on public.agency_ai_briefings;
create policy "Users manage own agency ai briefings" on public.agency_ai_briefings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
