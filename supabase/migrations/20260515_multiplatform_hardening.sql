create index if not exists idx_ad_insights_snapshots_campaign_id
  on public.ad_insights_snapshots(campaign_id);

create index if not exists idx_ad_insights_snapshots_user_id
  on public.ad_insights_snapshots(user_id);

create index if not exists idx_ad_platform_accounts_connection_id
  on public.ad_platform_accounts(connection_id);

create index if not exists idx_ad_platform_campaigns_user_id
  on public.ad_platform_campaigns(user_id);

create index if not exists idx_client_ad_accounts_account_id
  on public.client_ad_accounts(account_id);

create table if not exists public.ad_oauth_states (
  state text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  code_verifier text,
  redirect_to text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_ad_oauth_states_user_platform
  on public.ad_oauth_states(user_id, platform);

create index if not exists idx_ad_oauth_states_expires_at
  on public.ad_oauth_states(expires_at);

alter table public.ad_oauth_states enable row level security;

drop policy if exists "Users manage own oauth states" on public.ad_oauth_states;
create policy "Users manage own oauth states" on public.ad_oauth_states
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
