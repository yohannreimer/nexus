create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-scheduled-reports')
where exists (
  select 1
  from cron.job
  where jobname = 'send-scheduled-reports'
);

drop function if exists public.call_scheduled_reports();

create or replace function public.call_nexus_scheduled_reports()
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
  scheduler_secret := current_setting('app.settings.scheduled_reports_secret', true);

  perform net.http_post(
    url := 'https://ycniehayquyznwhrqtri.supabase.co/functions/v1/scheduled-reports',
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', case
        when coalesce(service_role_key, '') <> '' then 'Bearer ' || service_role_key
        else null
      end,
      'x-scheduler-secret', nullif(scheduler_secret, '')
    )),
    body := jsonb_build_object('dryRun', false)
  );
end;
$$;

select cron.unschedule('nexus-scheduled-reports')
where exists (
  select 1
  from cron.job
  where jobname = 'nexus-scheduled-reports'
);

do $$
declare
  service_role_key text;
  scheduler_secret text;
begin
  service_role_key := current_setting('app.settings.service_role_key', true);
  scheduler_secret := current_setting('app.settings.scheduled_reports_secret', true);

  if coalesce(service_role_key, '') = '' and coalesce(scheduler_secret, '') = '' then
    raise notice 'nexus-scheduled-reports cron not scheduled because app.settings.service_role_key and app.settings.scheduled_reports_secret are empty.';
    return;
  end if;

  perform cron.schedule(
    'nexus-scheduled-reports',
    '* * * * *',
    $cron$select public.call_nexus_scheduled_reports()$cron$
  );
end $$;
