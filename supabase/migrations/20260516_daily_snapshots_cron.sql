create extension if not exists pg_cron;
create extension if not exists pg_net;

drop function if exists public.call_nexus_daily_snapshots();

create or replace function public.call_nexus_daily_snapshots()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  service_role_key text;
  scheduler_secret text;
begin
  service_role_key := current_setting('app.settings.service_role_key', true);
  scheduler_secret := current_setting('app.settings.daily_snapshots_secret', true);

  if coalesce(scheduler_secret, '') = '' then
    scheduler_secret := current_setting('app.settings.scheduled_reports_secret', true);
  end if;

  perform net.http_post(
    url := 'https://ycniehayquyznwhrqtri.supabase.co/functions/v1/daily-snapshots',
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', case
        when coalesce(service_role_key, '') <> '' then 'Bearer ' || service_role_key
        else null
      end,
      'x-scheduler-secret', nullif(scheduler_secret, '')
    )),
    body := jsonb_build_object('dryRun', false, 'daysBack', 2)
  );
end;
$$;

select cron.unschedule('nexus-daily-snapshots')
where exists (
  select 1
  from cron.job
  where jobname = 'nexus-daily-snapshots'
);

do $$
declare
  service_role_key text;
  scheduler_secret text;
begin
  service_role_key := current_setting('app.settings.service_role_key', true);
  scheduler_secret := current_setting('app.settings.daily_snapshots_secret', true);

  if coalesce(scheduler_secret, '') = '' then
    scheduler_secret := current_setting('app.settings.scheduled_reports_secret', true);
  end if;

  if coalesce(service_role_key, '') = '' and coalesce(scheduler_secret, '') = '' then
    raise notice 'nexus-daily-snapshots cron not scheduled because app.settings.service_role_key, app.settings.daily_snapshots_secret, and app.settings.scheduled_reports_secret are empty.';
    return;
  end if;

  perform cron.schedule(
    'nexus-daily-snapshots',
    '10 9 * * *',
    $cron$select public.call_nexus_daily_snapshots()$cron$
  );
end $$;
