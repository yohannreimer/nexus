create index if not exists idx_client_portals_user_id
  on public.client_portals (user_id);

create index if not exists idx_client_ai_profiles_user_id
  on public.client_ai_profiles (user_id);

create index if not exists idx_client_ai_analyses_user_id
  on public.client_ai_analyses (user_id);

create index if not exists idx_client_ai_analyses_client_id
  on public.client_ai_analyses (client_id);

create index if not exists idx_client_ai_analyses_report_run_id
  on public.client_ai_analyses (report_run_id)
  where report_run_id is not null;
