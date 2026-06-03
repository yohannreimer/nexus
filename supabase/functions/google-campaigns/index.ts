import { googleAdsSearch, normalizeCustomerId } from '../_shared/googleAds.ts';
import {
  authenticatedSupabase,
  corsHeaders,
  ensureGoogleAccessToken,
  errorMessage,
  getGoogleConnection,
  json,
} from '../_shared/googleConnection.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const accountId = normalizeCustomerId(url.searchParams.get('account_id') || '');
    if (!accountId) throw new Error('Missing account_id parameter');

    const { supabase, user } = await authenticatedSupabase(req);
    const connection = await getGoogleConnection(supabase, user.id);
    const accessToken = await ensureGoogleAccessToken(supabase, connection);
    const account = await getSavedAccount(supabase, user.id, accountId);

    const rows = await googleAdsSearch({
      accessToken,
      customerId: accountId,
      query: `
        select
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type
        from campaign
        where campaign.status != 'REMOVED'
        order by campaign.name
      `,
    });

    const campaignRows = rows.map((row) => ({
      user_id: user.id,
      account_id: account.id,
      platform: 'google',
      external_campaign_id: String(row.campaign.id),
      name: row.campaign.name,
      status: row.campaign.status,
      channel_type: row.campaign.advertisingChannelType,
      metadata: { resourceName: row.campaign.resourceName || null },
      updated_at: new Date().toISOString(),
    }));

    let savedRows: any[] = [];
    if (campaignRows.length > 0) {
      const { data, error } = await supabase
        .from('ad_platform_campaigns')
        .upsert(campaignRows, { onConflict: 'account_id,platform,external_campaign_id' })
        .select('*');
      if (error) throw error;
      savedRows = data || [];
    }

    return json({
      data: savedRows.map((row) => ({
        id: row.id,
        platform: 'google',
        externalCampaignId: row.external_campaign_id,
        name: row.name,
        status: row.status,
        channelType: row.channel_type,
        metadata: row.metadata,
      })),
    });
  } catch (error) {
    console.error('google-campaigns error:', error);
    return json({ error: errorMessage(error) }, 400);
  }
});

async function getSavedAccount(supabase: any, userId: string, accountId: string) {
  const { data, error } = await supabase
    .from('ad_platform_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'google')
    .eq('external_account_id', accountId)
    .single();

  if (error || !data) {
    throw new Error('Google Ads account is not synced. Refresh accounts first.');
  }

  return data;
}
