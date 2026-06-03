create table if not exists public.ad_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
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
  updated_at timestamptz default now(),
  unique (user_id, platform)
);

create table if not exists public.ad_platform_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  connection_id uuid references public.ad_connections(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  external_account_id text not null,
  name text not null,
  currency text default 'BRL',
  timezone text,
  status text default 'active',
  is_active boolean default true,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, platform, external_account_id)
);

create table if not exists public.ad_platform_campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  external_campaign_id text not null,
  name text not null,
  status text default 'UNKNOWN',
  objective text,
  channel_type text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (account_id, platform, external_campaign_id)
);

create table if not exists public.ad_insights_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
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

create table if not exists public.client_ad_accounts (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  is_active boolean default true,
  selected_campaign_external_ids text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (client_id, account_id)
);

create index if not exists idx_ad_connections_user_platform on public.ad_connections(user_id, platform);
create index if not exists idx_ad_platform_accounts_user_platform on public.ad_platform_accounts(user_id, platform);
create index if not exists idx_ad_platform_campaigns_account on public.ad_platform_campaigns(account_id);
create index if not exists idx_ad_insights_account_dates on public.ad_insights_snapshots(account_id, date_start, date_end);
create index if not exists idx_client_ad_accounts_client on public.client_ad_accounts(client_id);

alter table public.ad_connections enable row level security;
alter table public.ad_platform_accounts enable row level security;
alter table public.ad_platform_campaigns enable row level security;
alter table public.ad_insights_snapshots enable row level security;
alter table public.client_ad_accounts enable row level security;

drop policy if exists "Users manage own ad connections" on public.ad_connections;
create policy "Users manage own ad connections" on public.ad_connections
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own platform accounts" on public.ad_platform_accounts;
create policy "Users manage own platform accounts" on public.ad_platform_accounts
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own platform campaigns" on public.ad_platform_campaigns;
create policy "Users manage own platform campaigns" on public.ad_platform_campaigns
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own insight snapshots" on public.ad_insights_snapshots;
create policy "Users manage own insight snapshots" on public.ad_insights_snapshots
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage client platform accounts" on public.client_ad_accounts;
create policy "Users manage client platform accounts" on public.client_ad_accounts
  for all using (
    exists (
      select 1
      from public.clients c
      where c.id = client_ad_accounts.client_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_ad_accounts.client_id
        and c.user_id = (select auth.uid())
    )
  );

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

drop trigger if exists update_client_ad_accounts_updated_at on public.client_ad_accounts;
create trigger update_client_ad_accounts_updated_at
  before update on public.client_ad_accounts
  for each row execute function public.update_updated_at_column();
