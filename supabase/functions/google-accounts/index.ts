import { googleAdsSearch, listAccessibleCustomers, normalizeCustomerId } from '../_shared/googleAds.ts';
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
    const { supabase, user } = await authenticatedSupabase(req);
    const connection = await getGoogleConnection(supabase, user.id);
    const accessToken = await ensureGoogleAccessToken(supabase, connection);

    const customerIds = await listAccessibleCustomers(accessToken);
    const accountRows = await Promise.all(
      customerIds.map((customerId) => fetchCustomerAccount(accessToken, customerId)),
    );

    const rows = accountRows.map((account) => ({
      user_id: user.id,
      connection_id: connection.id,
      platform: 'google',
      external_account_id: account.externalAccountId,
      name: account.name,
      currency: account.currency,
      timezone: account.timezone,
      status: account.status,
      metadata: account.metadata,
      updated_at: new Date().toISOString(),
    }));

    let savedRows: any[] = [];
    if (rows.length > 0) {
      const { data, error } = await supabase
        .from('ad_platform_accounts')
        .upsert(rows, { onConflict: 'user_id,platform,external_account_id' })
        .select('*');
      if (error) throw error;
      savedRows = data || [];
    }

    return json({
      data: savedRows.map((row) => ({
        id: row.id,
        platform: 'google',
        externalAccountId: row.external_account_id,
        name: row.name,
        currency: row.currency,
        timezone: row.timezone,
        status: row.status,
        isConfigured: false,
        selectedCampaignIds: [],
        metadata: row.metadata,
      })),
    });
  } catch (error) {
    console.error('google-accounts error:', error);
    return json({ error: errorMessage(error) }, 400);
  }
});

async function fetchCustomerAccount(accessToken: string, customerId: string) {
  const externalAccountId = normalizeCustomerId(customerId);

  try {
    const rows = await googleAdsSearch({
      accessToken,
      customerId: externalAccountId,
      query: `
        select
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.status
        from customer
        limit 1
      `,
    });

    const customer = rows[0]?.customer;
    return {
      externalAccountId,
      name: customer?.descriptiveName || `Google Ads ${externalAccountId}`,
      currency: customer?.currencyCode || 'BRL',
      timezone: customer?.timeZone || null,
      status: customer?.status || 'accessible',
      metadata: { resourceName: `customers/${externalAccountId}` },
    };
  } catch (error) {
    console.warn(`Could not enrich Google Ads customer ${externalAccountId}:`, error);
    return {
      externalAccountId,
      name: `Google Ads ${externalAccountId}`,
      currency: 'BRL',
      timezone: null,
      status: 'accessible',
      metadata: { resourceName: `customers/${externalAccountId}`, enrichmentError: errorMessage(error) },
    };
  }
}
