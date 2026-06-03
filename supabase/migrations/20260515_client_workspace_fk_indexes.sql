create index if not exists idx_agency_clients_user_id
  on public.agency_clients (user_id);

create index if not exists idx_agency_client_accounts_user_id
  on public.agency_client_accounts (user_id);

create index if not exists idx_agency_client_accounts_client_id
  on public.agency_client_accounts (client_id);

create index if not exists idx_client_report_settings_user_id
  on public.client_report_settings (user_id);

create index if not exists idx_client_report_runs_user_id
  on public.client_report_runs (user_id);

create index if not exists idx_client_report_runs_client_id
  on public.client_report_runs (client_id);
