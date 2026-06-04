create table if not exists public.agency_settings (
  workspace_id uuid primary key,
  clerk_user_id text,
  name text not null default '',
  logo text not null default '',
  primary_color text not null default '#6366f1',
  secondary_color text not null default '#8b5cf6',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  address text not null default '',
  cnpj text not null default '',
  default_send_time text not null default '08:00',
  webhook_url text not null default '',
  report_footer text not null default 'Relatório gerado automaticamente por {{agency_name}}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_agency_settings_updated_at on public.agency_settings;
create trigger update_agency_settings_updated_at
  before update on public.agency_settings
  for each row execute function public.update_updated_at_column();
