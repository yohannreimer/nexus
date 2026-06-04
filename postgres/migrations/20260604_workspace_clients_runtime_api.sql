alter table if exists public.agency_clients
  alter column user_id drop not null;

alter table if exists public.agency_client_accounts
  alter column user_id drop not null;
