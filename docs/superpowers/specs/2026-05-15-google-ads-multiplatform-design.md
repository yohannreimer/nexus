# Google Ads Multi-Platform Design

## Goal

Turn Nexus AI from a Meta Ads-only reporting app into a multi-platform paid media reporting system that supports Meta Ads and Google Ads through a shared data model, shared dashboard, shared report generation, and shared WhatsApp automation.

## Product Scope

The first multi-platform release includes:

- Connecting Google Ads with OAuth.
- Listing Google Ads customer accounts available to the authenticated user.
- Listing Google Ads campaigns for selected accounts.
- Fetching Google Ads metrics for configurable date ranges.
- Normalizing Meta Ads and Google Ads metrics into one shared format.
- Showing account and campaign performance by platform and in combined views.
- Generating reports for Meta-only, Google-only, or combined Meta + Google clients.
- Sending automated reports through the existing webhook/WhatsApp pipeline.

The release does not include ad editing, budget changes, bid management, keyword management, creative management, or write operations in either ad platform.

## Recommended Approach

Use a proper multi-platform layer instead of bolting Google Ads next to the existing Facebook-specific model.

Meta Ads and Google Ads should have separate provider connectors, but the product should consume normalized entities:

- Connections
- Accounts
- Campaigns
- Insights
- Reports
- Client automation settings

This avoids duplicating the dashboard and report pipeline for every ad network. It also prepares the app for TikTok Ads, LinkedIn Ads, or other platforms later.

## Current App Context

The existing app is heavily Meta-first:

- `services/api.ts` knows about Facebook login, ad accounts, campaigns, and insights.
- `services/edgeFunctions.ts` calls `facebook-oauth`, `facebook-accounts`, `facebook-campaigns`, and `facebook-insights`.
- `types.ts` defines `AdAccount`, `FacebookAdAccount`, `FacebookCampaign`, and `FacebookInsight`.
- `components/ConnectModal.tsx` is a Facebook-specific connection flow.
- `components/Dashboard.tsx` presents the portfolio as Facebook-managed ad accounts.
- Supabase currently has Facebook-specific tables and Edge Functions.

The multi-platform work should preserve compatibility while gradually moving the app to provider-neutral names.

## Data Model

Add new provider-neutral tables. Keep existing tables during migration so current Meta flows do not break.

### `ad_connections`

Stores one OAuth/API connection per user and platform.

Fields:

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `platform text check in ('meta', 'google')`
- `external_user_id text`
- `external_user_name text`
- `access_token text`
- `refresh_token text`
- `token_expires_at timestamptz`
- `scopes text[]`
- `status text default 'active'`
- `metadata jsonb default '{}'`
- `created_at timestamptz`
- `updated_at timestamptz`

Rules:

- Unique active connection per `user_id` and `platform` for now.
- Store Google `refresh_token` because Google access tokens are short lived.
- Store Meta long-lived token in the same table as `access_token`.

### `ad_platform_accounts`

Stores normalized ad accounts/customer accounts.

Fields:

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `connection_id uuid references ad_connections(id)`
- `platform text check in ('meta', 'google')`
- `external_account_id text`
- `name text`
- `currency text`
- `timezone text`
- `status text`
- `is_active boolean default true`
- `metadata jsonb default '{}'`
- `created_at timestamptz`
- `updated_at timestamptz`

Rules:

- Unique by `user_id`, `platform`, and `external_account_id`.
- Meta IDs may look like `act_123` or `123`; normalize consistently at the connector boundary.
- Google Ads customer IDs should be stored without dashes.

### `ad_platform_campaigns`

Stores normalized campaign metadata.

Fields:

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `account_id uuid references ad_platform_accounts(id)`
- `platform text check in ('meta', 'google')`
- `external_campaign_id text`
- `name text`
- `status text`
- `objective text`
- `channel_type text`
- `metadata jsonb default '{}'`
- `created_at timestamptz`
- `updated_at timestamptz`

Rules:

- Unique by `account_id`, `platform`, and `external_campaign_id`.
- Google campaign advertising channel type maps to `channel_type`.
- Meta objective maps to `objective`.

### `ad_insights_snapshots`

Stores normalized reporting metric snapshots.

Fields:

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `account_id uuid references ad_platform_accounts(id)`
- `campaign_id uuid references ad_platform_campaigns(id)`
- `platform text check in ('meta', 'google')`
- `date_start date`
- `date_end date`
- `spend numeric default 0`
- `impressions bigint default 0`
- `clicks bigint default 0`
- `ctr numeric default 0`
- `cpc numeric default 0`
- `cpm numeric default 0`
- `conversions numeric default 0`
- `cost_per_conversion numeric`
- `conversion_value numeric`
- `roas numeric`
- `raw jsonb default '{}'`
- `created_at timestamptz`

Rules:

- Use this table as cache/history, not as the only source of truth.
- Fresh dashboard requests can call the provider API directly, then optionally write snapshots.
- Automated reports can use live fetch first and snapshots as fallback.

### Client Mapping

Keep `clients` but add a join table:

`client_ad_accounts`

Fields:

- `id uuid primary key`
- `client_id uuid references clients(id)`
- `account_id uuid references ad_platform_accounts(id)`
- `platform text check in ('meta', 'google')`
- `is_active boolean default true`
- `selected_campaign_external_ids text[] default '{}'`
- `created_at timestamptz`
- `updated_at timestamptz`

This lets one client have Meta only, Google only, or both.

## Google Ads Requirements

The Google Ads connector needs the following Supabase Edge Function secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` when using an MCC/manager account
- `FRONTEND_URL`

OAuth requirements:

- Request Google Ads API scope.
- Use `access_type=offline` and `prompt=consent` when needed to receive a refresh token.
- Store the refresh token securely in Supabase.
- Refresh access tokens in Edge Functions before Google Ads API calls.

Google Ads data fetching:

- Use customer account listing to find accessible accounts.
- Use GAQL to fetch campaigns.
- Use GAQL to fetch metrics by campaign and date range.
- Normalize micros values, especially `metrics.cost_micros`, into standard decimal currency units.

## Edge Functions

### Provider Functions

Create Google-specific functions:

- `google-oauth`
- `google-accounts`
- `google-campaigns`
- `google-insights`

Keep Meta functions active, then add generic wrappers later:

- `ad-accounts`
- `ad-campaigns`
- `ad-insights`

The generic wrappers can dispatch by `platform` and give the frontend a single integration surface.

### Product Functions

Update these functions to consume normalized data:

- `generate-report`
- `send-webhook`
- `scheduled-reports`

`scheduled-reports` should:

1. Find clients due at the current time.
2. Load active `client_ad_accounts`.
3. Fetch insights for each platform/account.
4. Normalize and combine metrics.
5. Generate one report per client.
6. Send through webhook/WhatsApp.
7. Write `report_logs` and optionally `ad_insights_snapshots`.

## Frontend Design

### Connection Flow

Replace the Facebook-only connection entry with a platform picker:

- Meta Ads card
- Google Ads card

Each card shows:

- Connection status
- Last sync
- Number of accounts imported
- Required setup status

For Google Ads, show an explicit setup note if developer token or client secrets are missing on the backend.

### Dashboard

Dashboard should support:

- All platforms combined
- Meta only
- Google only
- Per-client view
- Per-account view

Normalize primary KPIs:

- Spend
- Impressions
- Clicks
- CTR
- CPC
- CPM
- Conversions
- Cost per conversion
- Conversion value
- ROAS when available

Use platform badges so mixed views remain clear.

### Reports

Report generation should support:

- Meta-only report.
- Google-only report.
- Combined report.

Combined report structure:

- Executive summary
- Total media investment
- Results by platform
- Top campaigns across both platforms
- Platform-specific observations
- Recommended next actions

Templates should get normalized variables plus platform-specific optional variables.

## Migration Strategy

Use phased migration to avoid breaking the working Supabase setup.

### Phase 1: Schema Foundation

Add provider-neutral tables and RLS policies. Do not remove existing Facebook-specific tables.

### Phase 2: Google Connector

Build Google OAuth, account listing, campaign listing, and insights fetching.

### Phase 3: Frontend Platform Picker

Replace Facebook-only connection UI with platform cards while keeping existing Meta flow working.

### Phase 4: Normalized Dashboard

Move dashboard data loading to provider-neutral services.

### Phase 5: Multi-Platform Reports

Update report generation and scheduled reports to support one or multiple platforms per client.

### Phase 6: Meta Migration

Optionally migrate existing Meta connection/account records into the normalized tables.

## Error Handling

Google-specific errors should be user-friendly:

- Missing backend secrets.
- Google OAuth denied.
- No accessible Google Ads accounts.
- Developer token unavailable or not approved.
- MCC/login customer mismatch.
- Refresh token expired or revoked.
- GAQL query errors.

The UI should distinguish setup errors from user authorization errors.

## Security

- Never expose Google client secret or developer token to the browser.
- Store refresh tokens only in Supabase.
- Keep OAuth and Google Ads API calls inside Edge Functions.
- Use RLS so users only see their own connections, accounts, campaigns, insights, clients, and logs.
- Avoid exposing token-bearing functions without JWT, except OAuth callbacks that require public redirects.

## Testing

Test layers:

- SQL migration validation through Supabase MCP.
- Edge Function deployment validation.
- Google OAuth URL generation.
- Google OAuth callback with mocked token exchange.
- Google Ads account parsing with mocked API responses.
- GAQL metrics normalization.
- Dashboard rendering with Meta-only, Google-only, and combined mock data.
- Scheduled report for a client with both platforms.

## Open Operational Setup

Before production Google Ads works, the project needs:

- A Google Cloud OAuth client.
- Google Ads API enabled.
- Google Ads developer token.
- OAuth redirect URI configured for the Supabase Edge Function.
- Supabase Edge Function secrets set for Google Ads.

## Approved Direction

User approved option 2: build the multi-platform layer properly, with Meta Ads and Google Ads as provider connectors behind a shared reporting and automation model.
