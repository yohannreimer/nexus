# Meta Ads Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Meta Ads work alongside Google Ads in the Supabase-backed multi-platform reporting flow.

**Architecture:** Move Facebook OAuth to the same server-side state pattern used by Google OAuth. Store Meta tokens in `ad_connections`, sync ad accounts/campaigns into normalized platform tables, and expose metrics through the existing `Platform*` frontend API.

**Tech Stack:** React/Vite, Supabase Auth, Supabase Edge Functions, Meta Graph API v23.0, Postgres platform tables.

---

### Task 1: Server-Side Meta OAuth

**Files:**
- Modify: `supabase/functions/facebook-oauth/index.ts`
- Modify: `App.tsx`

- [ ] Generate an authenticated OAuth URL with `ad_oauth_states`.
- [ ] On callback, validate state, exchange the code, exchange for a long-lived token, fetch `/me`, and upsert `ad_connections`.
- [ ] Keep a legacy `facebook_connections` upsert for existing code paths during migration.
- [ ] Redirect to the frontend with `facebook_connected=1` or `facebook_error=...`.

### Task 2: Normalized Meta Functions

**Files:**
- Modify: `supabase/functions/facebook-accounts/index.ts`
- Modify: `supabase/functions/facebook-campaigns/index.ts`
- Modify: `supabase/functions/facebook-insights/index.ts`

- [ ] Read Meta tokens from `ad_connections`.
- [ ] Sync accounts into `ad_platform_accounts`.
- [ ] Sync campaigns into `ad_platform_campaigns`.
- [ ] Persist insight snapshots in `ad_insights_snapshots`.
- [ ] Return response shapes compatible with `services/platformApi.ts`.

### Task 3: Frontend Reconnection

**Files:**
- Modify: `services/platformApi.ts`
- Modify: `components/Dashboard.tsx`
- Modify: `App.tsx`

- [ ] Make `getPlatformLoginUrl('meta')` use the authenticated Edge Function call.
- [ ] Make default account loading return all connected platforms using `Promise.allSettled`.
- [ ] Re-enable Meta connect buttons.
- [ ] Handle `facebook_connected` and `facebook_error` query params.

### Task 4: Verification and Deployment

**Files:**
- Deploy: `facebook-oauth`, `facebook-accounts`, `facebook-campaigns`, `facebook-insights`

- [ ] Run `npx tsc --noEmit --pretty false -p tsconfig.json`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Deploy the updated Edge Functions through the Supabase MCP.
- [ ] List Edge Functions and inspect recent logs after deployment.
