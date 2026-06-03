# Google Ads Multi-Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Ads support through a provider-neutral paid media layer while keeping the current Meta Ads flow working.

**Architecture:** Add normalized platform types, Supabase tables, Google Ads Edge Functions, and generic frontend services. Keep existing Facebook-specific tables/functions during migration, then route new UI and reports through shared `platform` entities.

**Tech Stack:** React 19, Vite, TypeScript, Supabase Postgres/RLS, Supabase Edge Functions on Deno, Google Ads API REST/GAQL, existing webhook/WhatsApp pipeline.

---

## Execution Notes

This workspace is not currently a Git repository. `git status` fails with `fatal: not a git repository`. Replace commit steps with a local checkpoint until Git is initialized:

```bash
npm run build
npm test
```

When the workspace is placed inside Git, commit after each task using the suggested message at the end of the task.

## File Structure

Create:

- `services/platformTypes.ts` - provider-neutral frontend/domain types and metric helpers.
- `services/platformMetrics.ts` - pure aggregation and normalization helpers used by dashboard/report code.
- `tests/platformMetrics.test.ts` - unit tests for aggregation and Google Ads micros conversion.
- `supabase/migrations/20260515_multiplatform_foundation.sql` - normalized platform schema and RLS.
- `supabase/functions/google-oauth/index.ts` - Google OAuth URL generation and callback token storage.
- `supabase/functions/google-accounts/index.ts` - list accessible Google Ads customers and upsert normalized accounts.
- `supabase/functions/google-campaigns/index.ts` - list Google Ads campaigns and upsert normalized campaigns.
- `supabase/functions/google-insights/index.ts` - fetch Google Ads metrics with GAQL and return normalized insights.
- `supabase/functions/_shared/googleAds.ts` - token refresh, Google Ads headers, GAQL request helpers.
- `supabase/functions/ad-accounts/index.ts` - generic account list wrapper.
- `supabase/functions/ad-campaigns/index.ts` - generic campaign list wrapper.
- `supabase/functions/ad-insights/index.ts` - generic insights wrapper.
- `components/PlatformConnectModal.tsx` - platform picker plus Meta/Google connection states.
- `components/PlatformBadge.tsx` - compact platform badge for dashboard/report rows.
- `services/platformApi.ts` - frontend generic API over the new `ad-*` Edge Functions.

Modify:

- `package.json` - add test script using Node test runner with `tsx`.
- `types.ts` - keep current exports but add platform-neutral aliases for new components.
- `services/api.ts` - preserve existing Meta functions and delegate new generic calls to `platformApi.ts`.
- `services/edgeFunctions.ts` - keep old Facebook functions, add generic wrappers only if still referenced.
- `App.tsx` - support `platform` OAuth payloads and load normalized accounts.
- `components/Dashboard.tsx` - add platform filters, platform badges, and combined account list.
- `components/ConnectModal.tsx` - keep as Meta-only compatibility or replace usages with `PlatformConnectModal.tsx`.
- `components/ClientCharts.tsx` - call normalized insights and show platform/all filters.
- `components/ReportPreview.tsx` - generate Meta-only, Google-only, and combined report previews.
- `supabase/functions/generate-report/index.ts` - accept normalized platform insights.
- `supabase/functions/scheduled-reports/index.ts` - load `client_ad_accounts` and combine platform metrics.
- `.env.example` - document Google Ads public and server-side setup values without secrets.

## Task 1: Add Test Harness and Platform Types

**Files:**

- Modify: `package.json`
- Modify: `types.ts`
- Create: `services/platformTypes.ts`
- Create: `services/platformMetrics.ts`
- Create: `tests/platformMetrics.test.ts`

- [ ] **Step 1: Add a test script**

Add this script to `package.json`:

```json
{
  "scripts": {
    "test": "node --import tsx --test \"tests/**/*.test.ts\""
  }
}
```

Keep all existing scripts unchanged.

- [ ] **Step 2: Create provider-neutral types**

Create `services/platformTypes.ts`:

```ts
export type AdPlatform = 'meta' | 'google';

export interface PlatformConnection {
  id: string;
  platform: AdPlatform;
  externalUserId?: string;
  externalUserName?: string;
  status: 'active' | 'expired' | 'revoked' | 'error';
  tokenExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformAccount {
  id: string;
  platform: AdPlatform;
  externalAccountId: string;
  name: string;
  currency: string;
  timezone?: string | null;
  status: string;
  isConfigured: boolean;
  whatsappTarget?: string;
  selectedCampaignIds: string[];
  lastReportSent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PlatformCampaign {
  id: string;
  platform: AdPlatform;
  externalCampaignId: string;
  name: string;
  status: string;
  objective?: string | null;
  channelType?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PlatformInsight {
  platform: AdPlatform;
  accountId: string;
  campaignId?: string;
  campaignName?: string;
  dateStart?: string;
  dateEnd?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number | null;
  conversionValue: number | null;
  roas: number | null;
  raw?: unknown;
}

export interface PlatformInsightsResponse {
  data: PlatformInsight[];
  totals: PlatformInsightTotals;
  dailyData: Array<{
    date: string;
    dateFormatted: string;
    platform: AdPlatform;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    conversions: number;
  }>;
  platformTotals: Record<AdPlatform, PlatformInsightTotals | undefined>;
  datePreset?: string;
  dateRange: { start: string; end: string } | null;
}

export interface PlatformInsightTotals {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number | null;
  conversionValue: number | null;
  roas: number | null;
}
```

- [ ] **Step 3: Add metric helpers**

Create `services/platformMetrics.ts`:

```ts
import { AdPlatform, PlatformInsight, PlatformInsightTotals } from './platformTypes';

export function microsToCurrency(value: string | number | null | undefined): number {
  const numeric = typeof value === 'string' ? Number(value) : value ?? 0;
  if (!Number.isFinite(numeric)) return 0;
  return numeric / 1_000_000;
}

export function calculateTotals(insights: PlatformInsight[]): PlatformInsightTotals {
  const spend = insights.reduce((sum, item) => sum + item.spend, 0);
  const impressions = insights.reduce((sum, item) => sum + item.impressions, 0);
  const clicks = insights.reduce((sum, item) => sum + item.clicks, 0);
  const conversions = insights.reduce((sum, item) => sum + item.conversions, 0);
  const conversionValue = insights.reduce((sum, item) => sum + (item.conversionValue ?? 0), 0);

  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    conversions,
    costPerConversion: conversions > 0 ? spend / conversions : null,
    conversionValue,
    roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
  };
}

export function groupTotalsByPlatform(insights: PlatformInsight[]): Record<AdPlatform, PlatformInsightTotals | undefined> {
  return {
    meta: calculateTotals(insights.filter((item) => item.platform === 'meta')),
    google: calculateTotals(insights.filter((item) => item.platform === 'google')),
  };
}
```

- [ ] **Step 4: Add focused tests**

Create `tests/platformMetrics.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTotals, groupTotalsByPlatform, microsToCurrency } from '../services/platformMetrics';
import { PlatformInsight } from '../services/platformTypes';

test('microsToCurrency converts Google Ads micros to currency units', () => {
  assert.equal(microsToCurrency('12345678'), 12.345678);
  assert.equal(microsToCurrency(5000000), 5);
  assert.equal(microsToCurrency(null), 0);
});

test('calculateTotals derives blended paid media metrics', () => {
  const rows: PlatformInsight[] = [
    {
      platform: 'meta',
      accountId: 'act_1',
      spend: 100,
      impressions: 10000,
      clicks: 250,
      ctr: 2.5,
      cpc: 0.4,
      cpm: 10,
      conversions: 10,
      costPerConversion: 10,
      conversionValue: 300,
      roas: 3,
    },
    {
      platform: 'google',
      accountId: '1234567890',
      spend: 50,
      impressions: 5000,
      clicks: 100,
      ctr: 2,
      cpc: 0.5,
      cpm: 10,
      conversions: 5,
      costPerConversion: 10,
      conversionValue: 100,
      roas: 2,
    },
  ];

  const totals = calculateTotals(rows);
  assert.equal(totals.spend, 150);
  assert.equal(totals.impressions, 15000);
  assert.equal(totals.clicks, 350);
  assert.equal(totals.conversions, 15);
  assert.equal(totals.ctr, (350 / 15000) * 100);
  assert.equal(totals.costPerConversion, 10);
  assert.equal(totals.roas, 400 / 150);
});

test('groupTotalsByPlatform separates Meta and Google totals', () => {
  const rows: PlatformInsight[] = [
    baseInsight('meta', 100),
    baseInsight('google', 40),
    baseInsight('google', 60),
  ];

  const grouped = groupTotalsByPlatform(rows);
  assert.equal(grouped.meta?.spend, 100);
  assert.equal(grouped.google?.spend, 100);
});

function baseInsight(platform: 'meta' | 'google', spend: number): PlatformInsight {
  return {
    platform,
    accountId: platform === 'meta' ? 'act_1' : '1234567890',
    spend,
    impressions: 1000,
    clicks: 50,
    ctr: 5,
    cpc: spend / 50,
    cpm: spend,
    conversions: 2,
    costPerConversion: spend / 2,
    conversionValue: spend * 3,
    roas: 3,
  };
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test
```

Expected: all 3 tests pass.

- [ ] **Step 6: Checkpoint**

Run:

```bash
npm run build
```

Expected: Vite build completes successfully. If Git is available, commit with:

```bash
git add package.json types.ts services/platformTypes.ts services/platformMetrics.ts tests/platformMetrics.test.ts
git commit -m "feat: add platform metrics foundation"
```

## Task 2: Add Supabase Multi-Platform Schema

**Files:**

- Create: `supabase/migrations/20260515_multiplatform_foundation.sql`
- Apply through MCP to project `ycniehayquyznwhrqtri`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260515_multiplatform_foundation.sql`:

```sql
create table if not exists public.ad_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  external_user_id text,
  external_user_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] default '{}',
  status text default 'active' check (status in ('active', 'expired', 'revoked', 'error')),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, platform)
);

create table if not exists public.ad_platform_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  connection_id uuid references public.ad_connections(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  external_account_id text not null,
  name text not null,
  currency text default 'BRL',
  timezone text,
  status text default 'active',
  is_active boolean default true,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, platform, external_account_id)
);

create table if not exists public.ad_platform_campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  external_campaign_id text not null,
  name text not null,
  status text default 'UNKNOWN',
  objective text,
  channel_type text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (account_id, platform, external_campaign_id)
);

create table if not exists public.ad_insights_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  campaign_id uuid references public.ad_platform_campaigns(id) on delete set null,
  platform text not null check (platform in ('meta', 'google')),
  date_start date not null,
  date_end date not null,
  spend numeric default 0,
  impressions bigint default 0,
  clicks bigint default 0,
  ctr numeric default 0,
  cpc numeric default 0,
  cpm numeric default 0,
  conversions numeric default 0,
  cost_per_conversion numeric,
  conversion_value numeric,
  roas numeric,
  raw jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.client_ad_accounts (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  account_id uuid references public.ad_platform_accounts(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google')),
  is_active boolean default true,
  selected_campaign_external_ids text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (client_id, account_id)
);

create index if not exists idx_ad_connections_user_platform on public.ad_connections(user_id, platform);
create index if not exists idx_ad_platform_accounts_user_platform on public.ad_platform_accounts(user_id, platform);
create index if not exists idx_ad_platform_campaigns_account on public.ad_platform_campaigns(account_id);
create index if not exists idx_ad_insights_account_dates on public.ad_insights_snapshots(account_id, date_start, date_end);
create index if not exists idx_client_ad_accounts_client on public.client_ad_accounts(client_id);

alter table public.ad_connections enable row level security;
alter table public.ad_platform_accounts enable row level security;
alter table public.ad_platform_campaigns enable row level security;
alter table public.ad_insights_snapshots enable row level security;
alter table public.client_ad_accounts enable row level security;

drop policy if exists "Users manage own ad connections" on public.ad_connections;
create policy "Users manage own ad connections" on public.ad_connections
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own platform accounts" on public.ad_platform_accounts;
create policy "Users manage own platform accounts" on public.ad_platform_accounts
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own platform campaigns" on public.ad_platform_campaigns;
create policy "Users manage own platform campaigns" on public.ad_platform_campaigns
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own insight snapshots" on public.ad_insights_snapshots;
create policy "Users manage own insight snapshots" on public.ad_insights_snapshots
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage client platform accounts" on public.client_ad_accounts;
create policy "Users manage client platform accounts" on public.client_ad_accounts
  for all using (
    exists (
      select 1
      from public.clients c
      where c.id = client_ad_accounts.client_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_ad_accounts.client_id
        and c.user_id = (select auth.uid())
    )
  );

create trigger update_ad_connections_updated_at
  before update on public.ad_connections
  for each row execute function public.update_updated_at_column();

create trigger update_ad_platform_accounts_updated_at
  before update on public.ad_platform_accounts
  for each row execute function public.update_updated_at_column();

create trigger update_ad_platform_campaigns_updated_at
  before update on public.ad_platform_campaigns
  for each row execute function public.update_updated_at_column();

create trigger update_client_ad_accounts_updated_at
  before update on public.client_ad_accounts
  for each row execute function public.update_updated_at_column();
```

- [ ] **Step 2: Apply migration to Supabase**

Use the Supabase MCP `apply_migration` tool:

```text
project_id: ycniehayquyznwhrqtri
name: multiplatform_foundation
query: contents of supabase/migrations/20260515_multiplatform_foundation.sql
```

Expected: migration succeeds.

- [ ] **Step 3: Verify schema**

Use the Supabase MCP `list_tables` tool for schema `public` and confirm these tables exist:

```text
ad_connections
ad_platform_accounts
ad_platform_campaigns
ad_insights_snapshots
client_ad_accounts
```

- [ ] **Step 4: Run advisors**

Use Supabase MCP advisors:

```text
get_advisors(project_id: ycniehayquyznwhrqtri, type: security)
get_advisors(project_id: ycniehayquyznwhrqtri, type: performance)
```

Expected: no new missing-RLS warnings for the five new tables. Existing `pg_net` extension warning can remain because Supabase reported `pg_net` does not support `SET SCHEMA`.

- [ ] **Step 5: Checkpoint**

Run:

```bash
npm test
npm run build
```

If Git is available:

```bash
git add supabase/migrations/20260515_multiplatform_foundation.sql
git commit -m "feat: add multi-platform Supabase schema"
```

## Task 3: Build Google Ads Shared Edge Helper

**Files:**

- Create: `supabase/functions/_shared/googleAds.ts`

- [ ] **Step 1: Create shared Google Ads helper**

Create `supabase/functions/_shared/googleAds.ts`:

```ts
export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function normalizeCustomerId(customerId: string): string {
  return customerId.replace(/\D/g, '');
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const json = await response.json();
  if (!response.ok) throw new Error(json.error_description || json.error || 'Failed to exchange Google OAuth code');
  return json;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });

  const json = await response.json();
  if (!response.ok) throw new Error(json.error_description || json.error || 'Failed to refresh Google access token');
  return json;
}

export function googleAdsHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': requiredEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) headers['login-customer-id'] = normalizeCustomerId(loginCustomerId);
  return headers;
}

export async function googleAdsSearch(params: {
  accessToken: string;
  customerId: string;
  query: string;
  loginCustomerId?: string;
}): Promise<any[]> {
  const customerId = normalizeCustomerId(params.customerId);
  const response = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: googleAdsHeaders(params.accessToken, params.loginCustomerId || Deno.env.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID') || undefined),
    body: JSON.stringify({ query: params.query }),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json.error?.message || 'Google Ads API request failed';
    throw new Error(message);
  }

  return Array.isArray(json) ? json.flatMap((chunk) => chunk.results || []) : [];
}
```

- [ ] **Step 2: Document required secrets**

Add to `.env.example`:

```dotenv
# --- Google Ads Edge Function Secrets ---
# Configure these in Supabase Edge Function secrets, not in the browser bundle.
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_ADS_DEVELOPER_TOKEN="your-google-ads-developer-token"
GOOGLE_ADS_LOGIN_CUSTOMER_ID="your-manager-customer-id-without-dashes"
```

- [ ] **Step 3: Checkpoint**

Run:

```bash
npm run build
```

If Git is available:

```bash
git add supabase/functions/_shared/googleAds.ts .env.example
git commit -m "feat: add Google Ads Edge helper"
```

## Task 4: Implement Google OAuth Edge Function

**Files:**

- Create: `supabase/functions/google-oauth/index.ts`
- Create: `supabase/functions/google-oauth/deno.json`

- [ ] **Step 1: Create Google OAuth function**

Create `supabase/functions/google-oauth/index.ts`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { exchangeCodeForTokens, requiredEnv } from '../_shared/googleAds.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '';
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth`;

    if (!code) {
      const loginUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      loginUrl.searchParams.set('client_id', requiredEnv('GOOGLE_CLIENT_ID'));
      loginUrl.searchParams.set('redirect_uri', redirectUri);
      loginUrl.searchParams.set('response_type', 'code');
      loginUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords');
      loginUrl.searchParams.set('access_type', 'offline');
      loginUrl.searchParams.set('prompt', 'consent');
      loginUrl.searchParams.set('state', crypto.randomUUID());
      return json({ loginUrl: loginUrl.toString() });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
      return Response.redirect(`${frontendUrl}?google_error=${encodeURIComponent('Please sign in before connecting Google Ads')}`, 302);
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid Supabase session');

    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase.from('ad_connections').upsert({
      user_id: user.id,
      platform: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      scopes: tokens.scope ? tokens.scope.split(' ') : ['https://www.googleapis.com/auth/adwords'],
      status: 'active',
      metadata: { tokenType: tokens.token_type, state },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

    if (upsertError) throw upsertError;

    return json({ success: true, platform: 'google' });
  } catch (error) {
    console.error('google-oauth error:', error);
    return json({ error: error.message }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Add deno config**

Create `supabase/functions/google-oauth/deno.json`:

```json
{
  "imports": {}
}
```

- [ ] **Step 3: Deploy function**

Use Supabase MCP `deploy_edge_function`:

```text
project_id: ycniehayquyznwhrqtri
name: google-oauth
entrypoint_path: index.ts
verify_jwt: true
files:
  - index.ts
  - deno.json
  - ../_shared/googleAds.ts as _shared/googleAds.ts if MCP requires relative dependency upload
```

Expected: function status `ACTIVE`.

- [ ] **Step 4: Verify missing-secret error is friendly**

Call the function from the browser/app only after Supabase secrets are configured. Before secrets, expected JSON error includes `GOOGLE_CLIENT_ID is not configured`.

- [ ] **Step 5: Checkpoint**

Run:

```bash
npm run build
```

If Git is available:

```bash
git add supabase/functions/google-oauth
git commit -m "feat: add Google Ads OAuth function"
```

## Task 5: Implement Google Accounts, Campaigns, and Insights Functions

**Files:**

- Create: `supabase/functions/google-accounts/index.ts`
- Create: `supabase/functions/google-accounts/deno.json`
- Create: `supabase/functions/google-campaigns/index.ts`
- Create: `supabase/functions/google-campaigns/deno.json`
- Create: `supabase/functions/google-insights/index.ts`
- Create: `supabase/functions/google-insights/deno.json`

- [ ] **Step 1: Implement `google-accounts`**

Create `supabase/functions/google-accounts/index.ts`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { googleAdsHeaders, normalizeCustomerId, refreshAccessToken } from '../_shared/googleAds.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { supabase, user } = await authenticatedSupabase(req);
    const connection = await getGoogleConnection(supabase, user.id);
    const token = await ensureAccessToken(supabase, connection);

    const response = await fetch('https://googleads.googleapis.com/v18/customers:listAccessibleCustomers', {
      headers: googleAdsHeaders(token, Deno.env.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID') || undefined),
    });
    const jsonResponse = await response.json();
    if (!response.ok) throw new Error(jsonResponse.error?.message || 'Failed to list Google Ads accounts');

    const resourceNames: string[] = jsonResponse.resourceNames || [];
    const rows = resourceNames.map((resourceName) => {
      const customerId = normalizeCustomerId(resourceName.replace('customers/', ''));
      return {
        user_id: user.id,
        connection_id: connection.id,
        platform: 'google',
        external_account_id: customerId,
        name: `Google Ads ${customerId}`,
        currency: 'BRL',
        status: 'accessible',
        metadata: { resourceName },
        updated_at: new Date().toISOString(),
      };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from('ad_platform_accounts').upsert(rows, {
        onConflict: 'user_id,platform,external_account_id',
      });
      if (error) throw error;
    }

    return json({ data: rows.map((row) => ({
      id: row.external_account_id,
      platform: 'google',
      externalAccountId: row.external_account_id,
      name: row.name,
      currency: row.currency,
      status: row.status,
      isConfigured: false,
      selectedCampaignIds: [],
      metadata: row.metadata,
    })) });
  } catch (error) {
    console.error('google-accounts error:', error);
    return json({ error: error.message }, 400);
  }
});

async function authenticatedSupabase(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid or expired token');
  return { supabase, user };
}

async function getGoogleConnection(supabase: any, userId: string) {
  const { data, error } = await supabase.from('ad_connections').select('*').eq('user_id', userId).eq('platform', 'google').single();
  if (error || !data) throw new Error('Google Ads is not connected');
  if (!data.refresh_token) throw new Error('Google refresh token is missing. Reconnect Google Ads.');
  return data;
}

async function ensureAccessToken(supabase: any, connection: any) {
  if (connection.access_token && connection.token_expires_at && new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return connection.access_token;
  }
  const refreshed = await refreshAccessToken(connection.refresh_token);
  await supabase.from('ad_connections').update({
    access_token: refreshed.access_token,
    token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', connection.id);
  return refreshed.access_token;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

- [ ] **Step 2: Implement `google-campaigns`**

Create `supabase/functions/google-campaigns/index.ts` using this GAQL:

```sql
select
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type
from campaign
where campaign.status != 'REMOVED'
order by campaign.name
```

The function must:

1. Read `account_id` from query params.
2. Authenticate Supabase user.
3. Refresh Google access token if needed.
4. Call `googleAdsSearch`.
5. Upsert rows into `ad_platform_campaigns`.
6. Return:

```ts
{
  data: Array<{
    id: string;
    platform: 'google';
    externalCampaignId: string;
    name: string;
    status: string;
    channelType: string;
  }>
}
```

- [ ] **Step 3: Implement `google-insights`**

Create `supabase/functions/google-insights/index.ts` using this GAQL:

```sql
select
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.average_cpc,
  metrics.average_cpm,
  metrics.conversions,
  metrics.cost_per_conversion,
  metrics.conversions_value
from campaign
where segments.date between 'YYYY-MM-DD' and 'YYYY-MM-DD'
  and campaign.status != 'REMOVED'
```

When selected campaign IDs exist, add:

```sql
and campaign.id in (123,456)
```

Normalize each row:

```ts
{
  platform: 'google',
  accountId,
  campaignId: String(row.campaign.id),
  campaignName: row.campaign.name,
  spend: Number(row.metrics.costMicros || 0) / 1000000,
  impressions: Number(row.metrics.impressions || 0),
  clicks: Number(row.metrics.clicks || 0),
  ctr: Number(row.metrics.ctr || 0) * 100,
  cpc: Number(row.metrics.averageCpc || 0) / 1000000,
  cpm: Number(row.metrics.averageCpm || 0) / 1000000,
  conversions: Number(row.metrics.conversions || 0),
  costPerConversion: row.metrics.costPerConversion ? Number(row.metrics.costPerConversion) / 1000000 : null,
  conversionValue: row.metrics.conversionsValue ? Number(row.metrics.conversionsValue) : null,
  roas: spend > 0 && conversionValue ? conversionValue / spend : null,
  raw: row
}
```

Return a `PlatformInsightsResponse` with `data`, `totals`, `dailyData`, `platformTotals`, and `dateRange`.

- [ ] **Step 4: Add `deno.json` files**

For each new function directory, add:

```json
{
  "imports": {}
}
```

- [ ] **Step 5: Deploy functions**

Use Supabase MCP `deploy_edge_function` for:

```text
google-accounts, verify_jwt: true
google-campaigns, verify_jwt: true
google-insights, verify_jwt: true
```

Expected: all functions `ACTIVE`.

- [ ] **Step 6: Checkpoint**

Run:

```bash
npm run build
```

If Git is available:

```bash
git add supabase/functions/google-accounts supabase/functions/google-campaigns supabase/functions/google-insights
git commit -m "feat: add Google Ads data functions"
```

## Task 6: Add Generic Frontend Platform API

**Files:**

- Create: `services/platformApi.ts`
- Modify: `services/api.ts`
- Modify: `services/edgeFunctions.ts`

- [ ] **Step 1: Create generic platform API**

Create `services/platformApi.ts`:

```ts
import { supabase, isSupabaseConfigured } from './supabase';
import { AdPlatform, PlatformAccount, PlatformCampaign, PlatformInsightsResponse } from './platformTypes';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callPlatformFunction<T>(
  functionName: string,
  options: { method?: 'GET' | 'POST'; params?: Record<string, string>; body?: object } = {}
): Promise<T> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase não está configurado');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Usuário não autenticado');

  let url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  if (options.params) url += `?${new URLSearchParams(options.params).toString()}`;

  const response = await fetch(url, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    ...(options.body && { body: JSON.stringify(options.body) }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `Erro na função ${functionName}`);
  return json;
}

export async function getPlatformLoginUrl(platform: AdPlatform): Promise<{ loginUrl: string }> {
  if (platform === 'meta') {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/facebook-oauth`);
    return response.json();
  }
  return callPlatformFunction<{ loginUrl: string }>('google-oauth', { method: 'GET' });
}

export async function fetchPlatformAccounts(platform?: AdPlatform): Promise<PlatformAccount[]> {
  if (platform === 'google') {
    const result = await callPlatformFunction<{ data: PlatformAccount[] }>('google-accounts');
    return result.data;
  }
  if (platform === 'meta') {
    const result = await callPlatformFunction<{ data: PlatformAccount[] }>('facebook-accounts');
    return result.data.map((account: any) => ({
      id: account.id,
      platform: 'meta',
      externalAccountId: account.id,
      name: account.name,
      currency: account.currency,
      status: String(account.accountStatus),
      isConfigured: account.isConfigured,
      whatsappTarget: account.whatsappTarget,
      selectedCampaignIds: account.selectedCampaignIds || [],
      lastReportSent: account.lastReportSent,
    }));
  }

  const [meta, google] = await Promise.allSettled([
    fetchPlatformAccounts('meta'),
    fetchPlatformAccounts('google'),
  ]);
  return [
    ...(meta.status === 'fulfilled' ? meta.value : []),
    ...(google.status === 'fulfilled' ? google.value : []),
  ];
}

export async function fetchPlatformCampaigns(platform: AdPlatform, accountId: string): Promise<PlatformCampaign[]> {
  const functionName = platform === 'google' ? 'google-campaigns' : 'facebook-campaigns';
  const result = await callPlatformFunction<{ data: any[] }>(functionName, { method: 'GET', params: { account_id: accountId } });
  return result.data.map((campaign: any) => ({
    id: campaign.id || campaign.externalCampaignId,
    platform,
    externalCampaignId: campaign.externalCampaignId || campaign.id,
    name: campaign.name,
    status: campaign.status,
    objective: campaign.objective,
    channelType: campaign.channelType,
    metadata: campaign,
  }));
}

export async function fetchPlatformInsights(
  platform: AdPlatform,
  accountId: string,
  options: { campaignIds?: string[]; datePreset?: string; dateStart?: string; dateEnd?: string } = {}
): Promise<PlatformInsightsResponse> {
  const params: Record<string, string> = { account_id: accountId };
  if (options.campaignIds?.length) params.campaign_ids = options.campaignIds.join(',');
  if (options.datePreset) params.date_preset = options.datePreset;
  if (options.dateStart && options.dateEnd) {
    params.date_start = options.dateStart;
    params.date_end = options.dateEnd;
  }

  const functionName = platform === 'google' ? 'google-insights' : 'facebook-insights';
  return callPlatformFunction<PlatformInsightsResponse>(functionName, { method: 'GET', params });
}
```

- [ ] **Step 2: Add compatibility exports**

In `services/api.ts`, keep current functions unchanged and add:

```ts
export {
  getPlatformLoginUrl,
  fetchPlatformAccounts,
  fetchPlatformCampaigns,
  fetchPlatformInsights,
} from './platformApi';
```

- [ ] **Step 3: Checkpoint**

Run:

```bash
npm test
npm run build
```

If Git is available:

```bash
git add services/platformApi.ts services/api.ts services/edgeFunctions.ts
git commit -m "feat: add frontend platform API"
```

## Task 7: Add Platform Connection UI

**Files:**

- Create: `components/PlatformBadge.tsx`
- Create: `components/PlatformConnectModal.tsx`
- Modify: `App.tsx`
- Modify: `components/Dashboard.tsx`

- [ ] **Step 1: Create platform badge**

Create `components/PlatformBadge.tsx`:

```tsx
import React from 'react';
import { AdPlatform } from '../services/platformTypes';

const LABELS: Record<AdPlatform, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
};

const COLORS: Record<AdPlatform, { bg: string; text: string; border: string }> = {
  meta: { bg: 'rgba(24,119,242,0.12)', text: '#60a5fa', border: 'rgba(24,119,242,0.28)' },
  google: { bg: 'rgba(251,188,4,0.12)', text: '#fbbf24', border: 'rgba(251,188,4,0.28)' },
};

export function PlatformBadge({ platform }: { platform: AdPlatform }) {
  const color = COLORS[platform];
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}
    >
      {LABELS[platform]}
    </span>
  );
}
```

- [ ] **Step 2: Create platform connect modal**

Create `components/PlatformConnectModal.tsx`:

```tsx
import React, { useState } from 'react';
import { X, Facebook, Search, Loader2, AlertTriangle } from 'lucide-react';
import { getPlatformLoginUrl } from '../services/platformApi';
import { AdPlatform } from '../services/platformTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformConnectModal({ isOpen, onClose }: Props) {
  const [loadingPlatform, setLoadingPlatform] = useState<AdPlatform | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const connect = async (platform: AdPlatform) => {
    setError('');
    setLoadingPlatform(platform);
    try {
      const { loginUrl } = await getPlatformLoginUrl(platform);
      window.open(loginUrl, `${platform}_oauth`, 'width=640,height=760');
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar conexão');
    } finally {
      setLoadingPlatform(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-bold text-white">Conectar plataforma</h2>
        <p className="mt-1 text-sm text-slate-500">Escolha uma origem de mídia paga para importar contas, campanhas e métricas.</p>

        {error && (
          <div className="mt-4 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={() => connect('meta')} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left hover:border-blue-400/40">
            <Facebook className="h-8 w-8 text-[#1877F2]" />
            <div className="mt-4 font-bold text-white">Meta Ads</div>
            <div className="mt-1 text-xs text-slate-500">Facebook e Instagram Ads.</div>
            <div className="mt-4 text-xs font-semibold text-blue-300">{loadingPlatform === 'meta' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conectar Meta'}</div>
          </button>
          <button onClick={() => connect('google')} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left hover:border-yellow-400/40">
            <Search className="h-8 w-8 text-yellow-400" />
            <div className="mt-4 font-bold text-white">Google Ads</div>
            <div className="mt-1 text-xs text-slate-500">Search, Performance Max, Display e YouTube.</div>
            <div className="mt-4 text-xs font-semibold text-yellow-300">{loadingPlatform === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conectar Google'}</div>
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire modal in `App.tsx`**

Replace the Facebook-only modal opening state with a platform connection modal state:

```tsx
import { PlatformConnectModal } from './components/PlatformConnectModal';
```

Render:

```tsx
<PlatformConnectModal
  isOpen={connectModalOpen}
  onClose={() => setConnectModalOpen(false)}
/>
```

Keep the old `ConnectModal` mounted only if code paths still require campaign selection for Meta during this phase.

- [ ] **Step 4: Add platform badges in dashboard rows**

In `components/Dashboard.tsx`, import:

```tsx
import { PlatformBadge } from './PlatformBadge';
```

When rendering accounts, use:

```tsx
<PlatformBadge platform={(account as any).platform || 'meta'} />
```

Add a platform filter state:

```tsx
const [platformFilter, setPlatformFilter] = useState<'all' | 'meta' | 'google'>('all');
```

Apply it before status filters:

```tsx
const filteredAccounts = accounts
  .filter((acc) => platformFilter === 'all' || ((acc as any).platform || 'meta') === platformFilter)
  .filter((acc) => {
    if (filter === 'configured') return acc.isConfigured;
    if (filter === 'pending') return !acc.isConfigured;
    return true;
  });
```

- [ ] **Step 5: Checkpoint**

Run:

```bash
npm run build
```

Expected: UI compiles. Verify manually that clicking connect opens the new platform picker.

If Git is available:

```bash
git add components/PlatformBadge.tsx components/PlatformConnectModal.tsx App.tsx components/Dashboard.tsx
git commit -m "feat: add multi-platform connection UI"
```

## Task 8: Move Charts and Reports to Normalized Metrics

**Files:**

- Modify: `components/ClientCharts.tsx`
- Modify: `components/ReportPreview.tsx`
- Modify: `services/pdfGeneratorService.ts` only if PDF types require conversions

- [ ] **Step 1: Update `ClientCharts.tsx` to call platform insights**

Where it currently imports `fetchInsights` dynamically, replace with:

```ts
const { fetchPlatformInsights } = await import('../services/platformApi');
const platform = (client as any).platform || 'meta';
const accountId = (client as any).externalAccountId || client.id;
```

Then call:

```ts
insightsData = await fetchPlatformInsights(platform, accountId, params);
```

Map normalized fields:

```ts
setCampaignData(insightsData.data.map((d: any) => ({
  name: d.campaignName,
  id: d.campaignId,
  spend: d.spend,
  impressions: d.impressions,
  clicks: d.clicks,
  ctr: d.ctr,
  cpc: d.cpc,
  objective: d.channelType || d.objective || d.platform,
  objectiveLabel: d.channelType || d.objective || d.platform,
})));
```

- [ ] **Step 2: Update `ReportPreview.tsx` to call platform insights**

Replace the dynamic `fetchInsights` import with `fetchPlatformInsights` and resolve:

```ts
const platform = (client as any).platform || 'meta';
const accountId = (client as any).externalAccountId || client.adAccountId;
const insightsData = await fetchPlatformInsights(platform, accountId, params);
```

Use `conversions` instead of only `purchases`:

```ts
total_purchases: t.conversions || 0,
total_conversations: platform === 'meta' ? (t as any).messaging || 0 : 0,
```

Update WhatsApp copy:

```ts
`📊 *Relatório de Performance*
📅 ${getPL()}
📣 ${client.companyName}
🔎 Plataforma: ${platform === 'google' ? 'Google Ads' : 'Meta Ads'}

💰 Gasto: *R$ ${t.spend.toFixed(2)}*
👁 Impressões: ${t.impressions.toLocaleString()}
👆 Cliques: ${t.clicks}
📈 CTR: ${t.ctr.toFixed(2)}%
💡 CPC: R$ ${t.cpc.toFixed(2)}
🎯 Conversões: ${t.conversions || 0}

_Nexus AI · Relatórios_`
```

- [ ] **Step 3: Checkpoint**

Run:

```bash
npm run build
```

Expected: charts and report preview compile.

If Git is available:

```bash
git add components/ClientCharts.tsx components/ReportPreview.tsx services/pdfGeneratorService.ts
git commit -m "feat: normalize charts and reports by platform"
```

## Task 9: Update Report Generation and Scheduled Reports

**Files:**

- Modify: `supabase/functions/generate-report/index.ts`
- Modify: `supabase/functions/scheduled-reports/index.ts`
- Deploy both via Supabase MCP

- [ ] **Step 1: Update `generate-report` input contract**

Accept:

```ts
{
  insights: PlatformInsightsResponse;
  clientName: string;
  platforms?: Array<'meta' | 'google'>;
  templateId?: string;
  customPrompt?: string;
}
```

In the prompt, include platform totals:

```ts
const platformBreakdown = Object.entries(insights.platformTotals || {})
  .filter(([, totals]) => totals)
  .map(([platform, totals]: any) => `${platform}: gasto R$ ${totals.spend.toFixed(2)}, cliques ${totals.clicks}, conversões ${totals.conversions}`)
  .join('\\n');
```

Add this to the user prompt:

```ts
`Resumo por plataforma:
${platformBreakdown || 'Sem divisão por plataforma.'}`
```

- [ ] **Step 2: Update `scheduled-reports` to use `client_ad_accounts`**

After loading due clients, load account links:

```ts
const { data: linkedAccounts, error: linkedError } = await supabase
  .from('client_ad_accounts')
  .select('*, account:ad_platform_accounts(*)')
  .eq('client_id', client.id)
  .eq('is_active', true);
```

For each linked account:

- `platform === 'meta'`: reuse the Meta fetch logic currently in the function.
- `platform === 'google'`: call a local helper `fetchGoogleInsights` using the same GAQL logic from `google-insights`.

Combine rows:

```ts
const allInsights = [...metaInsights, ...googleInsights];
const totals = calculateTotals(allInsights);
```

Render one message per client with platform sections.

- [ ] **Step 3: Preserve old behavior while no linked accounts exist**

If `linkedAccounts.length === 0`, fall back to existing `clients.ad_account_id` Meta behavior. This keeps currently configured clients working.

- [ ] **Step 4: Deploy functions**

Use Supabase MCP `deploy_edge_function`:

```text
generate-report, verify_jwt: true
scheduled-reports, verify_jwt: false
```

Expected: both functions `ACTIVE`.

- [ ] **Step 5: Verify cron still works**

Use Supabase MCP `get_logs` for `edge-function`.

Expected: recent `scheduled-reports` invocation returns HTTP 200.

- [ ] **Step 6: Checkpoint**

Run:

```bash
npm run build
```

If Git is available:

```bash
git add supabase/functions/generate-report/index.ts supabase/functions/scheduled-reports/index.ts
git commit -m "feat: support multi-platform scheduled reports"
```

## Task 10: Backfill Meta into Normalized Tables

**Files:**

- Create: `supabase/migrations/20260515_backfill_meta_platform_records.sql`

- [ ] **Step 1: Create backfill migration**

Create `supabase/migrations/20260515_backfill_meta_platform_records.sql`:

```sql
insert into public.ad_connections (
  user_id,
  platform,
  external_user_id,
  external_user_name,
  access_token,
  token_expires_at,
  status,
  metadata
)
select
  user_id,
  'meta',
  facebook_user_id,
  coalesce(facebook_name, facebook_user_name, user_name),
  access_token,
  token_expires_at,
  case when token_expires_at is not null and token_expires_at < now() then 'expired' else 'active' end,
  jsonb_build_object('source', 'facebook_connections', 'legacy_id', id)
from public.facebook_connections
on conflict (user_id, platform) do update set
  external_user_id = excluded.external_user_id,
  external_user_name = excluded.external_user_name,
  access_token = excluded.access_token,
  token_expires_at = excluded.token_expires_at,
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
  metadata
)
select
  a.user_id,
  c.id,
  'meta',
  coalesce(a.facebook_account_id, a.ad_account_id),
  a.name,
  coalesce(a.currency, 'BRL'),
  a.timezone,
  a.status,
  coalesce(a.is_active, true),
  jsonb_build_object('source', 'ad_accounts', 'legacy_id', a.id)
from public.ad_accounts a
join public.ad_connections c on c.user_id = a.user_id and c.platform = 'meta'
where a.user_id is not null
  and coalesce(a.facebook_account_id, a.ad_account_id) is not null
on conflict (user_id, platform, external_account_id) do update set
  name = excluded.name,
  currency = excluded.currency,
  timezone = excluded.timezone,
  status = excluded.status,
  is_active = excluded.is_active,
  metadata = excluded.metadata,
  updated_at = now();
```

- [ ] **Step 2: Apply with Supabase MCP**

Use `apply_migration`:

```text
project_id: ycniehayquyznwhrqtri
name: backfill_meta_platform_records
query: contents of supabase/migrations/20260515_backfill_meta_platform_records.sql
```

- [ ] **Step 3: Verify counts**

Use Supabase MCP `execute_sql`:

```sql
select platform, count(*) from public.ad_connections group by platform;
select platform, count(*) from public.ad_platform_accounts group by platform;
```

Expected: rows exist for `meta` if legacy Facebook rows existed.

- [ ] **Step 4: Checkpoint**

Run:

```bash
npm run build
```

If Git is available:

```bash
git add supabase/migrations/20260515_backfill_meta_platform_records.sql
git commit -m "feat: backfill Meta into platform tables"
```

## Task 11: Final Verification

**Files:**

- No new files required.

- [ ] **Step 1: Run local verification**

Run:

```bash
npm test
npm run build
```

Expected: tests pass and Vite build completes.

- [ ] **Step 2: Verify Supabase deployment**

Use Supabase MCP:

```text
list_tables(project_id: ycniehayquyznwhrqtri, schemas: ["public"], verbose: false)
list_edge_functions(project_id: ycniehayquyznwhrqtri)
list_migrations(project_id: ycniehayquyznwhrqtri)
get_logs(project_id: ycniehayquyznwhrqtri, service: "edge-function")
get_advisors(project_id: ycniehayquyznwhrqtri, type: "security")
get_advisors(project_id: ycniehayquyznwhrqtri, type: "performance")
```

Expected:

- New platform tables exist.
- Google functions are `ACTIVE`.
- Existing Meta functions remain `ACTIVE`.
- `scheduled-reports` returns HTTP 200 in recent logs.
- No new critical security warnings for new tables.

- [ ] **Step 3: Manual user flow**

Run:

```bash
npm run dev
```

Then verify:

- User can still sign in.
- Meta connection button still works or opens the Meta flow.
- Google connection card appears.
- Google card shows a clear backend setup error if Google Ads secrets are missing.
- Dashboard renders with Meta mock/current accounts.
- Build does not show runtime blank screen in the browser console.

## Operational Setup Checklist

Before testing real Google Ads data, configure:

- Google Cloud OAuth Web Client.
- Authorized redirect URI:

```text
https://ycniehayquyznwhrqtri.supabase.co/functions/v1/google-oauth
```

- Google Ads API enabled.
- Google Ads developer token approved or test-ready.
- Supabase Edge Function secrets:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_ADS_DEVELOPER_TOKEN
GOOGLE_ADS_LOGIN_CUSTOMER_ID
FRONTEND_URL
```

## Self-Review

Spec coverage:

- Google OAuth: Task 4.
- Google accounts/campaigns/insights: Task 5.
- Normalized metrics: Tasks 1, 6, and 8.
- Shared dashboard and platform filters: Task 7 and Task 8.
- Multi-platform reports and automation: Task 9.
- Supabase schema and RLS: Task 2.
- Meta compatibility and backfill: Task 10.
- Verification: Task 11.

Placeholder scan:

- The plan contains no unresolved markers and no incomplete implementation slots.
- The plan gives exact queries, return shapes, normalization formulas, and verification commands for the larger Google Ads functions.

Type consistency:

- `AdPlatform`, `PlatformAccount`, `PlatformCampaign`, `PlatformInsight`, and `PlatformInsightsResponse` are defined in Task 1 and reused consistently.
- Frontend platform API returns the same structures consumed by Dashboard, Charts, and Reports.
