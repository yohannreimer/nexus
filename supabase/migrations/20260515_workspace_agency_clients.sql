create table if not exists public.agency_clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
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
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.agency_clients(id) on delete cascade not null,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_agency_client_accounts_active_account
  on public.agency_client_accounts(account_id)
  where is_active = true;

create or replace function public.enforce_agency_client_account_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  client_owner uuid;
  account_owner uuid;
  account_platform text;
begin
  select user_id into client_owner
  from public.agency_clients
  where id = new.client_id;

  select user_id, platform into account_owner, account_platform
  from public.ad_platform_accounts
  where id = new.account_id;

  if client_owner is null then
    raise exception 'Client does not exist or is not accessible';
  end if;

  if account_owner is null then
    raise exception 'Ad account does not exist or is not accessible';
  end if;

  if new.user_id <> client_owner or new.user_id <> account_owner then
    raise exception 'Client, account, and link must belong to the same user';
  end if;

  if new.platform <> account_platform then
    raise exception 'Link platform must match ad account platform';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_client_report_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  client_owner uuid;
begin
  select user_id into client_owner
  from public.agency_clients
  where id = new.client_id;

  if client_owner is null then
    raise exception 'Client does not exist or is not accessible';
  end if;

  if new.user_id <> client_owner then
    raise exception 'Report record must belong to the same user as the client';
  end if;

  return new;
end;
$$;

create table if not exists public.client_report_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.agency_clients(id) on delete cascade not null,
  default_period text not null default 'yesterday' check (default_period in ('today', 'yesterday', 'last_7d', 'last_30d', 'custom')),
  send_time text not null default '08:00',
  timezone text not null default 'America/Sao_Paulo',
  delivery_enabled boolean not null default false,
  delivery_target text,
  webhook_url text,
  default_report_mode text not null default 'executive' check (default_report_mode in ('executive', 'analytical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);

create table if not exists public.client_report_runs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.agency_clients(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'generated' check (status in ('generated', 'sent', 'failed')),
  report_mode text not null default 'executive' check (report_mode in ('executive', 'analytical')),
  platforms_included text[] not null default '{}',
  summary_payload jsonb not null default '{}',
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.agency_clients enable row level security;
alter table public.agency_client_accounts enable row level security;
alter table public.client_report_settings enable row level security;
alter table public.client_report_runs enable row level security;

drop policy if exists "Users select own agency clients" on public.agency_clients;
create policy "Users select own agency clients" on public.agency_clients
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own agency clients" on public.agency_clients;
create policy "Users insert own agency clients" on public.agency_clients
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own agency clients" on public.agency_clients;
create policy "Users update own agency clients" on public.agency_clients
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own agency clients" on public.agency_clients;
create policy "Users delete own agency clients" on public.agency_clients
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users select own agency client accounts" on public.agency_client_accounts;
create policy "Users select own agency client accounts" on public.agency_client_accounts
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own agency client accounts" on public.agency_client_accounts;
create policy "Users insert own agency client accounts" on public.agency_client_accounts
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = agency_client_accounts.client_id
        and c.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.ad_platform_accounts a
      where a.id = agency_client_accounts.account_id
        and a.user_id = (select auth.uid())
        and a.platform = agency_client_accounts.platform
    )
  );

drop policy if exists "Users update own agency client accounts" on public.agency_client_accounts;
create policy "Users update own agency client accounts" on public.agency_client_accounts
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = agency_client_accounts.client_id
        and c.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.ad_platform_accounts a
      where a.id = agency_client_accounts.account_id
        and a.user_id = (select auth.uid())
        and a.platform = agency_client_accounts.platform
    )
  );

drop policy if exists "Users delete own agency client accounts" on public.agency_client_accounts;
create policy "Users delete own agency client accounts" on public.agency_client_accounts
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users select own client report settings" on public.client_report_settings;
create policy "Users select own client report settings" on public.client_report_settings
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own client report settings" on public.client_report_settings;
create policy "Users insert own client report settings" on public.client_report_settings
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_report_settings.client_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users update own client report settings" on public.client_report_settings;
create policy "Users update own client report settings" on public.client_report_settings
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_report_settings.client_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users delete own client report settings" on public.client_report_settings;
create policy "Users delete own client report settings" on public.client_report_settings
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users select own client report runs" on public.client_report_runs;
create policy "Users select own client report runs" on public.client_report_runs
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own client report runs" on public.client_report_runs;
create policy "Users insert own client report runs" on public.client_report_runs
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_report_runs.client_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users update own client report runs" on public.client_report_runs;
create policy "Users update own client report runs" on public.client_report_runs
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.agency_clients c
      where c.id = client_report_runs.client_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users delete own client report runs" on public.client_report_runs;
create policy "Users delete own client report runs" on public.client_report_runs
  for delete using ((select auth.uid()) = user_id);

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

drop trigger if exists enforce_agency_client_account_integrity on public.agency_client_accounts;
create trigger enforce_agency_client_account_integrity
  before insert or update on public.agency_client_accounts
  for each row execute function public.enforce_agency_client_account_integrity();

drop trigger if exists enforce_client_report_settings_owner on public.client_report_settings;
create trigger enforce_client_report_settings_owner
  before insert or update on public.client_report_settings
  for each row execute function public.enforce_client_report_owner();

drop trigger if exists enforce_client_report_runs_owner on public.client_report_runs;
create trigger enforce_client_report_runs_owner
  before insert or update on public.client_report_runs
  for each row execute function public.enforce_client_report_owner();
