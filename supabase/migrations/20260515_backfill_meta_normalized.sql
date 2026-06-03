insert into public.ad_connections (
  user_id,
  platform,
  external_user_id,
  external_user_name,
  access_token,
  token_expires_at,
  scopes,
  status,
  metadata,
  created_at,
  updated_at
)
select
  fc.user_id,
  'meta',
  fc.facebook_user_id,
  coalesce(fc.facebook_name, fc.facebook_user_name, fc.user_name),
  fc.access_token,
  fc.token_expires_at,
  array['ads_read', 'read_insights', 'business_management'],
  case when coalesce(fc.is_active, true) then 'active' else 'revoked' end,
  jsonb_build_object('legacyConnectionId', fc.id, 'email', fc.facebook_email),
  coalesce(fc.created_at, fc.connected_at, now()),
  coalesce(fc.updated_at, now())
from public.facebook_connections fc
on conflict (user_id, platform) do update set
  external_user_id = excluded.external_user_id,
  external_user_name = excluded.external_user_name,
  access_token = excluded.access_token,
  token_expires_at = excluded.token_expires_at,
  scopes = excluded.scopes,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.ad_platform_accounts (
  user_id,
  connection_id,
  platform,
  external_account_id,
  name,
  currency,
  timezone,
  status,
  is_active,
  metadata,
  created_at,
  updated_at
)
select
  aa.user_id,
  ac.id,
  'meta',
  coalesce(nullif(aa.ad_account_id, ''), nullif(aa.facebook_account_id, '')),
  aa.name,
  coalesce(aa.currency, 'BRL'),
  aa.timezone,
  coalesce(aa.status, 'active'),
  coalesce(aa.is_active, true),
  jsonb_build_object(
    'legacyAccountId', aa.id,
    'facebookAccountId', aa.facebook_account_id,
    'whatsappTarget', aa.whatsapp_target,
    'selectedCampaignIds', aa.selected_campaign_ids
  ),
  coalesce(aa.created_at, now()),
  coalesce(aa.updated_at, now())
from public.ad_accounts aa
join public.ad_connections ac
  on ac.user_id = aa.user_id
 and ac.platform = 'meta'
where coalesce(nullif(aa.ad_account_id, ''), nullif(aa.facebook_account_id, '')) is not null
on conflict (user_id, platform, external_account_id) do update set
  name = excluded.name,
  currency = excluded.currency,
  timezone = excluded.timezone,
  status = excluded.status,
  is_active = excluded.is_active,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.client_ad_accounts (
  client_id,
  account_id,
  platform,
  is_active,
  selected_campaign_external_ids,
  created_at,
  updated_at
)
select
  c.id,
  apa.id,
  'meta',
  coalesce(c.is_active, true),
  coalesce(c.selected_campaign_ids, '{}'),
  coalesce(c.created_at, now()),
  coalesce(c.updated_at, now())
from public.clients c
join public.ad_platform_accounts apa
  on apa.user_id = c.user_id
 and apa.platform = 'meta'
 and apa.external_account_id = c.ad_account_id
on conflict (client_id, account_id) do update set
  is_active = excluded.is_active,
  selected_campaign_external_ids = excluded.selected_campaign_external_ids,
  updated_at = now();
