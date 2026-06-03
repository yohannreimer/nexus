alter table public.client_report_settings
  add column if not exists delivery_frequency text not null default 'daily',
  add column if not exists weekly_day integer,
  add column if not exists monthly_day integer;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.client_report_settings'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%default_period%';

  if constraint_name is not null then
    execute format('alter table public.client_report_settings drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.client_report_settings
  add constraint client_report_settings_default_period_check
  check (default_period in ('today', 'yesterday', 'last_7d', 'last_30d', 'last_60d', 'custom'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.client_report_settings'::regclass
      and conname = 'client_report_settings_delivery_frequency_check'
  ) then
    alter table public.client_report_settings
      add constraint client_report_settings_delivery_frequency_check
      check (delivery_frequency in ('daily', 'weekly', 'monthly'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.client_report_settings'::regclass
      and conname = 'client_report_settings_weekly_day_check'
  ) then
    alter table public.client_report_settings
      add constraint client_report_settings_weekly_day_check
      check (weekly_day is null or weekly_day between 0 and 6);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.client_report_settings'::regclass
      and conname = 'client_report_settings_monthly_day_check'
  ) then
    alter table public.client_report_settings
      add constraint client_report_settings_monthly_day_check
      check (monthly_day is null or monthly_day between 1 and 31);
  end if;
end $$;
