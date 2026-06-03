# Nexus AI Agency Intelligence Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the agency intelligence layer to Nexus AI: reliable scheduled reporting, report history, client portals, internal AI analysis, global portfolio intelligence, and future commercial foundations without replacing the current working product.

**Architecture:** The current app remains the operational core for clients, account links, analysis, charts, simulation, automation, manual sends, and N8N delivery. New features are additive surfaces: `IA Analista` and `Portal do Cliente` inside each client, plus a global `Centro IA`. Client-facing delivery stays deterministic; AI is internal, optional, auditable, and never required for scheduled report sending.

**Tech Stack:** React 19, TypeScript, Vite, Node test runner with `tsx`, Supabase Postgres/RLS/Edge Functions, Supabase cron, N8N webhook delivery, Meta/Google Edge Functions, Gemini through an internal provider contract.

---

## Execution Rules

This is a master plan. Execute tasks in order. Each phase leaves the app usable and testable.

The current local folder is not a git repository. If execution happens in a git repo, commit after each task. In this folder, mark checkboxes and keep every change scoped to the listed files.

Do not remove or redesign these existing flows while executing this plan:

- `Clientes`
- `Contas de Anuncio`
- `Integracoes`
- `Relatorio Executivo`
- `Analise Completa`
- `Graficos`
- `Simulacao`
- `Automacoes`
- manual `send-webhook` flow
- N8N as the WhatsApp delivery layer

Client-facing report text remains deterministic in all scheduled and manual report flows. AI output is agency-facing until a future explicit opt-in is added.

## Phases

1. Report engine and official history.
2. Client portal.
3. `IA Analista` per client.
4. `Centro IA` global.
5. Chat with data.
6. Commercial product foundation.

Phase 1 is the required foundation. Do not start Phase 2 before scheduled/manual report runs are persisted reliably in `client_report_runs`.

## File Structure

### Existing Files To Modify

- `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceTypes.ts`: add portal, report run, AI profile, AI analysis, briefing, and public portal types.
- `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`: add Supabase mappers and API functions for report runs, portals, AI profiles, AI analyses, briefings, and public portal reads.
- `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientAnalysisModel.ts`: continue to consolidate metrics used by current analysis, charts, simulation, reports, and AI context.
- `/Users/yohannreimer/Downloads/nexus-ai-main/services/edgeFunctions.ts`: add typed wrappers for report engine and AI generation Edge Function calls.
- `/Users/yohannreimer/Downloads/nexus-ai-main/components/ReportPreview.tsx`: reuse deterministic report builder while preserving current visual simulation.
- `/Users/yohannreimer/Downloads/nexus-ai-main/components/ReportsHistoryView.tsx`: show official `client_report_runs`, status, retry, portal link, and error state.
- `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientDetailView.tsx`: add `IA Analista` and `Portal do Cliente` tabs without moving current tabs.
- `/Users/yohannreimer/Downloads/nexus-ai-main/components/Layout.tsx`: add `Centro IA` global navigation item.
- `/Users/yohannreimer/Downloads/nexus-ai-main/App.tsx`: route `Centro IA`, public portal paths, and new client tabs.
- `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/scheduled-reports/index.ts`: replace legacy scheduler logic with workspace-model report engine.
- `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/send-webhook/index.ts`: keep current manual sending and accept versioned report run payloads.
- `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/generate-report/index.ts`: use as the first AI provider implementation for internal analysis.

### New Files To Create

- `/Users/yohannreimer/Downloads/nexus-ai-main/services/reportSchedule.ts`: pure schedule, period, and idempotency helpers.
- `/Users/yohannreimer/Downloads/nexus-ai-main/services/deterministicReport.ts`: deterministic WhatsApp and HTML report builder.
- `/Users/yohannreimer/Downloads/nexus-ai-main/services/portalModel.ts`: slug, visibility, mode, and safe public portal view helpers.
- `/Users/yohannreimer/Downloads/nexus-ai-main/services/aiAnalysisModel.ts`: provider-neutral AI analysis prompt input and output normalization.
- `/Users/yohannreimer/Downloads/nexus-ai-main/services/portfolioHealth.ts`: deterministic portfolio status, alerts, opportunities, and action queue rules.
- `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientPortalTab.tsx`: portal settings inside a client.
- `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientPortalPublicView.tsx`: public client-facing portal view.
- `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientAiAnalystTab.tsx`: internal AI analysis tab.
- `/Users/yohannreimer/Downloads/nexus-ai-main/components/AgencyIntelligenceCenter.tsx`: global AI operations view.
- `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/migrations/20260515_agency_intelligence_platform.sql`: database schema and RLS additions.
- `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/_shared/reportEngine.ts`: Edge Function helper for loading clients, building runs, and sending payloads.
- `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/_shared/aiProvider.ts`: Edge Function AI provider contract.
- `/Users/yohannreimer/Downloads/nexus-ai-main/tests/reportSchedule.test.ts`: schedule helper tests.
- `/Users/yohannreimer/Downloads/nexus-ai-main/tests/deterministicReport.test.ts`: deterministic report tests.
- `/Users/yohannreimer/Downloads/nexus-ai-main/tests/portalModel.test.ts`: portal safety and mode tests.
- `/Users/yohannreimer/Downloads/nexus-ai-main/tests/aiAnalysisModel.test.ts`: AI normalization tests.
- `/Users/yohannreimer/Downloads/nexus-ai-main/tests/portfolioHealth.test.ts`: portfolio rules tests.

## Task 1: Baseline Guard

**Files:**
- Read: `/Users/yohannreimer/Downloads/nexus-ai-main/package.json`
- Read: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceTypes.ts`
- Read: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`
- Read: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientDetailView.tsx`
- Read: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/scheduled-reports/index.ts`

- [x] **Step 1: Confirm current tests pass**

Run:

```bash
npm test
```

Expected: all existing tests pass.

- [x] **Step 2: Confirm current build passes**

Run:

```bash
npm run build
```

Expected: Vite build succeeds.

- [x] **Step 3: Record existing behavior before edits**

Run:

```bash
rg -n "send-webhook|scheduled-reports|client_report_runs|client_report_settings|FullAnalysisTab|Simulacao|Graficos" App.tsx components services supabase/functions tests
```

Expected: output identifies the current report, automation, preview, and history integration points.

## Task 2: Pure Report Schedule Model

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/services/reportSchedule.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/tests/reportSchedule.test.ts`

- [x] **Step 1: Add schedule tests**

Create tests that cover:

- daily report due at `08:00` in `America/Sao_Paulo`;
- weekly report due only on selected weekday;
- monthly report with day `31` running on the last day of shorter months;
- disabled delivery returning false;
- `today`, `yesterday`, `last_7d`, `last_30d`, `last_60d`;
- stable idempotency key using client, frequency, scheduled timestamp, and period.

Use these exported names in the test:

```ts
import {
  buildReportIdempotencyKey,
  calculateReportPeriod,
  isReportDue,
} from '../services/reportSchedule';
```

- [x] **Step 2: Run the new tests before implementation**

Run:

```bash
npm test -- tests/reportSchedule.test.ts
```

Expected: fails because `/Users/yohannreimer/Downloads/nexus-ai-main/services/reportSchedule.ts` is missing.

- [x] **Step 3: Implement schedule helpers**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/services/reportSchedule.ts` with these public exports:

```ts
import type { ClientDeliveryFrequency, ClientReportPeriod } from './clientWorkspaceTypes';

export type ScheduleInput = {
  deliveryEnabled: boolean;
  deliveryFrequency: ClientDeliveryFrequency;
  sendTime: string;
  timezone: string;
  weeklyDay: number | null;
  monthlyDay: number | null;
};

export type IdempotencyInput = {
  clientId: string;
  frequency: ClientDeliveryFrequency;
  scheduledFor: string;
  periodStart: string;
  periodEnd: string;
};

export function isReportDue(settings: ScheduleInput, now?: Date): boolean;
export function calculateReportPeriod(period: ClientReportPeriod, now?: Date, timezone?: string): { start: string; end: string };
export function buildReportIdempotencyKey(input: IdempotencyInput): string;
```

Implementation rules:

- use `Intl.DateTimeFormat` with the provided timezone;
- compare `sendTime` at minute precision;
- use Sunday `0` through Saturday `6` for `weeklyDay`;
- clamp monthly day to month length;
- return ISO date strings in `YYYY-MM-DD`.

- [x] **Step 4: Verify schedule tests**

Run:

```bash
npm test -- tests/reportSchedule.test.ts
```

Expected: all schedule tests pass.

## Task 3: Deterministic Report Builder

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/services/deterministicReport.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/tests/deterministicReport.test.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ReportPreview.tsx`

- [x] **Step 1: Add deterministic report tests**

Create tests that assert:

- output includes client name, period label, investment, impressions, clicks, CTR, CPC, conversions;
- Brazilian currency and number formatting are stable;
- campaign list is sorted by spend;
- message does not include agency-facing recommendation verbs such as `pausar`, `realocar`, `escale`, or `recomendo`;
- HTML contains a report title and escaped campaign names.

Use these exported names:

```ts
import { buildDeterministicReport } from '../services/deterministicReport';
```

- [x] **Step 2: Run tests before implementation**

Run:

```bash
npm test -- tests/deterministicReport.test.ts
```

Expected: fails because `/Users/yohannreimer/Downloads/nexus-ai-main/services/deterministicReport.ts` is missing.

- [x] **Step 3: Implement deterministic builder**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/services/deterministicReport.ts` with:

```ts
export type DeterministicTotals = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
};

export type DeterministicCampaign = DeterministicTotals & {
  id?: string;
  name: string;
  platform?: 'meta' | 'google';
  accountId?: string;
};

export type DeterministicReportInput = {
  clientName: string;
  periodLabel: string;
  totals: DeterministicTotals;
  campaigns: DeterministicCampaign[];
  portalLink?: string | null;
  agencyName?: string | null;
};

export type DeterministicReportOutput = {
  whatsappMessage: string;
  html: string;
  summaryPayload: {
    totals: DeterministicTotals;
    topCampaigns: DeterministicCampaign[];
  };
};

export function buildDeterministicReport(input: DeterministicReportInput): DeterministicReportOutput;
```

Implementation rules:

- use `pt-BR` number and BRL currency formatting;
- include portal link only when present;
- escape HTML for all dynamic strings;
- do not generate internal recommendations or risk labels.

- [x] **Step 4: Verify deterministic report tests**

Run:

```bash
npm test -- tests/deterministicReport.test.ts
```

Expected: all deterministic report tests pass.

- [x] **Step 5: Wire preview to the builder**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/components/ReportPreview.tsx` so the simulated WhatsApp message and HTML report snapshot are generated through `buildDeterministicReport` when account metrics are available.

Keep:

- current page layout;
- current date filter controls;
- current send button;
- current N8N/manual webhook behavior.

- [x] **Step 6: Verify preview integration**

Run:

```bash
npm test -- tests/deterministicReport.test.ts
npm run build
```

Expected: tests and build pass.

## Task 4: Database Schema For Intelligence Layer

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/migrations/20260515_agency_intelligence_platform.sql`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceTypes.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/tests/clientWorkspaceApiMapping.test.ts`

- [x] **Step 1: Create migration**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/migrations/20260515_agency_intelligence_platform.sql` with:

```sql
alter table public.client_report_settings
  add column if not exists portal_mode text not null default 'executive',
  add column if not exists client_report_exposure text not null default 'executive_safe',
  add column if not exists internal_ai_enabled boolean not null default false,
  add column if not exists briefing_enabled boolean not null default false,
  add column if not exists report_template_settings jsonb not null default '{}';

alter table public.client_report_runs
  add column if not exists execution_type text not null default 'manual',
  add column if not exists idempotency_key text,
  add column if not exists linked_account_ids uuid[] not null default '{}',
  add column if not exists deterministic_message text,
  add column if not exists report_html text,
  add column if not exists pdf_url text,
  add column if not exists portal_snapshot_url text,
  add column if not exists webhook_target text,
  add column if not exists webhook_response jsonb not null default '{}',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists scheduled_for timestamptz,
  add column if not exists warnings jsonb not null default '[]';

create unique index if not exists idx_client_report_runs_idempotency_key
  on public.client_report_runs (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.client_portals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.agency_clients(id) on delete cascade not null unique,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'paused')),
  mode text not null default 'executive' check (mode in ('essential', 'executive', 'complete')),
  branding jsonb not null default '{}',
  visibility_settings jsonb not null default '{}',
  access_settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_ai_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.agency_clients(id) on delete cascade not null unique,
  objective text not null default 'mixed',
  tone text not null default 'consultative',
  business_rules jsonb not null default '{}',
  important_metrics jsonb not null default '{}',
  exposure_level text not null default 'normal',
  internal_ai_enabled boolean not null default false,
  briefing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_ai_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.agency_clients(id) on delete cascade not null,
  report_run_id uuid references public.client_report_runs(id) on delete set null,
  period_start date not null,
  period_end date not null,
  summary text not null default '',
  positives jsonb not null default '[]',
  attention_points jsonb not null default '[]',
  internal_alerts jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  talking_points jsonb not null default '[]',
  risk_level text not null default 'normal',
  opportunity_level text not null default 'normal',
  raw_ai_payload jsonb not null default '{}',
  provider text,
  model text,
  created_at timestamptz not null default now()
);

create table if not exists public.agency_ai_briefings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  briefing_date date not null,
  portfolio_summary jsonb not null default '{}',
  client_priorities jsonb not null default '[]',
  alerts jsonb not null default '[]',
  opportunities jsonb not null default '[]',
  generated_text text not null default '',
  provider text,
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

alter table public.client_portals enable row level security;
alter table public.client_ai_profiles enable row level security;
alter table public.client_ai_analyses enable row level security;
alter table public.agency_ai_briefings enable row level security;

create policy "Users manage own client portals" on public.client_portals
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own client ai profiles" on public.client_ai_profiles
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own client ai analyses" on public.client_ai_analyses
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own agency ai briefings" on public.agency_ai_briefings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

- [x] **Step 2: Apply migration through Supabase MCP**

Use Supabase MCP `apply_migration`:

- `project_id`: `ycniehayquyznwhrqtri`
- `name`: `agency_intelligence_platform`
- `query`: SQL from Step 1

Expected: migration succeeds.

- [x] **Step 3: Extend workspace types**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceTypes.ts` to include:

```ts
export type ClientPortalMode = 'essential' | 'executive' | 'complete';
export type ClientReportExposure = 'executive_safe' | 'consultative' | 'detailed';
export type ClientReportExecutionType = 'manual' | 'scheduled';
export type ClientReportRunStatus = 'pending' | 'processing' | 'generated' | 'sent' | 'failed' | 'sent_with_warnings';

export interface ClientPortal {
  id: string;
  userId: string;
  clientId: string;
  slug: string;
  status: 'active' | 'paused';
  mode: ClientPortalMode;
  branding: Record<string, unknown>;
  visibilitySettings: Record<string, unknown>;
  accessSettings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientAiProfile {
  id: string;
  userId: string;
  clientId: string;
  objective: 'leads' | 'sales' | 'traffic' | 'awareness' | 'mixed';
  tone: 'direct' | 'consultative' | 'premium' | 'informal';
  businessRules: Record<string, unknown>;
  importantMetrics: string[];
  exposureLevel: 'conservative' | 'normal' | 'detailed';
  internalAiEnabled: boolean;
  briefingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientAiAnalysis {
  id: string;
  userId: string;
  clientId: string;
  reportRunId: string | null;
  periodStart: string;
  periodEnd: string;
  summary: string;
  positives: unknown[];
  attentionPoints: unknown[];
  internalAlerts: unknown[];
  recommendations: unknown[];
  talkingPoints: unknown[];
  riskLevel: 'low' | 'normal' | 'attention' | 'critical';
  opportunityLevel: 'low' | 'normal' | 'high';
  rawAiPayload: Record<string, unknown>;
  provider: string | null;
  model: string | null;
  createdAt: string;
}
```

Extend `ClientReportSettings` with `portalMode`, `clientReportExposure`, `internalAiEnabled`, `briefingEnabled`, and `reportTemplateSettings`.

Extend `ClientReportRun` with `executionType`, `idempotencyKey`, `linkedAccountIds`, `deterministicMessage`, `reportHtml`, `pdfUrl`, `portalSnapshotUrl`, `webhookTarget`, `webhookResponse`, `attemptCount`, `scheduledFor`, and `warnings`.

- [x] **Step 4: Extend API mappers**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`:

- map new `client_report_settings` columns with defaults for existing rows;
- map new `client_report_runs` columns with defaults for existing rows;
- export `listClientPortals`, `upsertClientPortal`, `getClientPortalBySlug`;
- export `listClientAiProfiles`, `upsertClientAiProfile`;
- export `listClientAiAnalyses`, `createClientAiAnalysis`;
- export `listAgencyAiBriefings`, `upsertAgencyAiBriefing`.

- [x] **Step 5: Add mapper tests**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/tests/clientWorkspaceApiMapping.test.ts` so existing-row mapping asserts:

```ts
assert.equal(settings.portalMode, 'executive');
assert.equal(settings.clientReportExposure, 'executive_safe');
assert.equal(settings.internalAiEnabled, false);
assert.equal(settings.briefingEnabled, false);
assert.deepEqual(settings.reportTemplateSettings, {});
assert.equal(run.executionType, 'manual');
assert.equal(run.attemptCount, 0);
assert.deepEqual(run.warnings, []);
```

- [x] **Step 6: Verify schema type integration**

Run:

```bash
npm test -- tests/clientWorkspaceApiMapping.test.ts
npm run build
```

Expected: mapper tests and build pass.

## Task 5: New Scheduled Report Engine

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/_shared/reportEngine.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/scheduled-reports/index.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/send-webhook/index.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/edgeFunctions.ts`

- [x] **Step 1: Define report engine flow**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/_shared/reportEngine.ts` with functions named:

```ts
export async function runScheduledReports(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  nowIso: string;
  dryRun: boolean;
}): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  runIds: string[];
}>;
```

The function must:

- read due rows from `client_report_settings`;
- evaluate due state with the same rules from `/Users/yohannreimer/Downloads/nexus-ai-main/services/reportSchedule.ts`;
- load `agency_clients`;
- load active `agency_client_accounts`;
- create a `client_report_runs` row with `processing`;
- fetch Meta/Google account data using existing shared Google/Meta helpers or existing Edge Function calls;
- consolidate totals into a deterministic report payload;
- send versioned payload to N8N through the same webhook resolution rules used by `send-webhook`;
- update run to `sent`, `sent_with_warnings`, or `failed`;
- never abort the entire scheduler because one client fails.

- [x] **Step 2: Replace scheduled Edge Function entrypoint**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/scheduled-reports/index.ts` so it:

- accepts `POST`;
- accepts `{ "dryRun": true }`;
- calls `runScheduledReports`;
- returns JSON summary with `processed`, `sent`, `failed`, `skipped`, and `runIds`;
- logs failures without exposing secrets.

- [x] **Step 3: Preserve manual webhook sending**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/send-webhook/index.ts` so it accepts both current manual payloads and new versioned report run payloads:

```json
{
  "source": "nexus-ai-scheduled",
  "version": "2",
  "reportRunId": "uuid",
  "phone": "5511999999999",
  "message": "client-facing deterministic message",
  "period": { "start": "2026-05-01", "end": "2026-05-15" },
  "metrics": { "spend": 1585.39, "clicks": 1921 },
  "portalLink": "https://app.example.com/portal/loja-exemplo"
}
```

Existing manual simulation sends must continue working.

- [x] **Step 4: Add frontend Edge Function wrapper**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/services/edgeFunctions.ts`:

```ts
export async function runScheduledReportsNow(input: { dryRun: boolean }): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  runIds: string[];
}> {
  return invokeEdgeFunction('scheduled-reports', input);
}
```

Use the existing invocation pattern in the file.

- [x] **Step 5: Verify Edge Function TypeScript**

Run:

```bash
npm run build
```

Expected: app build passes.

Deploy after local verification:

```bash
supabase functions deploy scheduled-reports
supabase functions deploy send-webhook
```

Expected: both Edge Functions deploy in the active Supabase project.

Execution note, 2026-05-15:

- Local verification passed with `npm test` and `npm run build`.
- `deno` is not installed in this environment, so `deno check` was not available.
- After Supabase CLI login, `scheduled-reports` and `send-webhook` were deployed to project `ycniehayquyznwhrqtri`.
- Supabase function list confirmed both functions active at version 4.

## Task 6: Official Report History

**Files:**
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ReportsHistoryView.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/App.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`

- [x] **Step 1: Add report history API functions**

In `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`, export:

```ts
export async function listReportRunsForClient(clientId: string): Promise<ClientReportRun[]>;
export async function listRecentReportRuns(limit?: number): Promise<ClientReportRun[]>;
export async function markReportRunForRetry(runId: string): Promise<ClientReportRun>;
```

Rules:

- order newest first;
- retry changes status to `pending` and increments no counter until the Edge Function processes it;
- do not expose webhook URL in UI models.

- [x] **Step 2: Upgrade history screen**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/components/ReportsHistoryView.tsx` to show:

- client name;
- period;
- execution type;
- status;
- created timestamp;
- sent timestamp;
- warning count;
- retry button for `failed`;
- portal snapshot link when present.

- [x] **Step 3: Verify history stays accessible**

Run:

```bash
npm run build
```

Expected: build passes and `Relatorios`/history route still opens from the app shell.

Execution note, 2026-05-15:

- Added official report-run history APIs and kept webhook target/response out of UI-facing models.
- Updated history UI with status, period, execution type, timestamps, warnings, retry, and portal snapshot link.
- Retry now requeues failed scheduled runs and the scheduled report engine processes pending retries before normal due schedules.
- Local verification passed with `npm test` and `npm run build`.
- Redeployed `scheduled-reports`; Supabase function list confirmed it active at version 5.

## Task 7: Client Portal Model And Settings Tab

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/services/portalModel.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/tests/portalModel.test.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientPortalTab.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientDetailView.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`

- [x] **Step 1: Add portal model tests**

Create tests for:

- slug generation from client names with accents removed;
- mode defaults to `executive`;
- `essential` hides campaigns and detailed charts by default;
- `executive` shows KPIs, comparison, simple chart, and history;
- `complete` shows KPIs, platforms, campaigns, charts, and history;
- public payload excludes tokens, raw account ids, webhook URL, AI raw payload, and internal recommendations.

- [x] **Step 2: Implement portal model**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/services/portalModel.ts` with exports:

```ts
export function buildPortalSlug(clientName: string): string;
export function defaultPortalVisibility(mode: ClientPortalMode): Record<string, boolean>;
export function sanitizePortalPayload(input: {
  clientName: string;
  portal: ClientPortal;
  latestRun: ClientReportRun | null;
}): Record<string, unknown>;
```

- [x] **Step 3: Verify portal model tests**

Run:

```bash
npm test -- tests/portalModel.test.ts
```

Expected: portal model tests pass.

- [x] **Step 4: Build portal settings tab**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientPortalTab.tsx` with:

- slug field;
- active/paused toggle;
- mode selector: `Essencial`, `Executivo`, `Completo`;
- agency public name field;
- brand color field;
- visibility toggles for spend, campaigns, charts, history;
- copy portal link button;
- save button calling `upsertClientPortal`.

Visual requirement:

- match current dark Nexus UI;
- use compact panels, not nested cards;
- keep form controls responsive below 768px.

- [x] **Step 5: Add tab to client detail**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientDetailView.tsx`:

- add `Portal do Cliente` tab after current reporting tabs;
- do not reorder `Dados`, `Contas Vinculadas`, `Configuração`, `Relatório Executivo`, `Análise Completa`, or `Automações`;
- load portal state for selected client.

- [x] **Step 6: Verify client detail build**

Run:

```bash
npm test -- tests/portalModel.test.ts
npm run build
```

Expected: tests and build pass.

Execution note, 2026-05-15:

- Added portal model helpers with slug normalization, mode-based visibility presets, and public payload sanitization.
- Added `Portal do Cliente` tab inside the client detail view with slug, active/paused state, mode selector, agency public name, brand color, visibility toggles, copy link, and save.
- App now loads `client_portals`, passes the selected portal into the client detail view, and saves portal mode back into client report settings.
- Red/green verification: `npm test -- tests/portalModel.test.ts` first failed because `services/portalModel.ts` was missing, then passed after implementation.
- Final verification passed with `npm test -- tests/portalModel.test.ts`, full `npm test`, and `npm run build`.

## Task 8: Public Client Portal View

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientPortalPublicView.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/App.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`

- [x] **Step 1: Add public portal read API**

In `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`, export:

```ts
export async function getPublicPortalBySlug(slug: string): Promise<{
  clientName: string;
  portal: ClientPortal;
  latestRun: ClientReportRun | null;
  recentRuns: ClientReportRun[];
} | null>;
```

Rules:

- only return portals with `status = 'active'`;
- use sanitized payload shape from `portalModel.ts`;
- return no raw account linkage;
- return no token or webhook fields.

- [x] **Step 2: Add public route detection**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/App.tsx`:

- when `window.location.pathname` starts with `/portal/`, render `ClientPortalPublicView`;
- do not require agency authenticated navigation for this public route;
- support `/portal/:slug` and `/portal/:slug/reports/:date`.

- [x] **Step 3: Build portal public view**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientPortalPublicView.tsx` with:

- branded header;
- period label;
- KPI row;
- deterministic summary;
- simple chart for `executive` and `complete`;
- campaign table only for `complete`;
- report history when visibility allows;
- inactive/not found state.

- [x] **Step 4: Verify public portal build**

Run:

```bash
npm run build
```

Expected: build passes.

Manual browser check:

```text
http://localhost:5173/portal/loja-exemplo
```

Expected: portal renders without the app sidebar and without internal agency configuration.

Execution note, 2026-05-15:

- Added Supabase RPC `get_public_client_portal` as a `security definer` function that returns only active portals and safe report fields.
- Applied the RPC migration to project `ycniehayquyznwhrqtri`; `select public.get_public_client_portal('__missing__')` returned `null`.
- Added public route detection for `/portal/:slug` and `/portal/:slug/reports/:date` before authenticated app rendering.
- Added `ClientPortalPublicView` with branded header, period, KPIs, deterministic summary, chart bars, complete-mode campaign table, report history, and inactive/not-found state.
- Verification passed with `npm run build`, full `npm test`, and `curl -I http://localhost:5173/portal/__missing__` returning `HTTP/1.1 200 OK`.
- Visual Playwright check was not available because the local project does not have the `playwright` package installed.

## Task 9: AI Analysis Model And Provider Contract

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/services/aiAnalysisModel.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/tests/aiAnalysisModel.test.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/_shared/aiProvider.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/generate-report/index.ts`

- [x] **Step 1: Add AI normalization tests**

Create tests that assert:

- malformed provider JSON becomes a safe failed analysis object;
- recommendations are marked `audience: "agency"`;
- talking points are separated from automatic client-facing messages;
- risk level only returns `low`, `normal`, `attention`, or `critical`;
- opportunity level only returns `low`, `normal`, or `high`.

- [x] **Step 2: Implement frontend AI analysis model**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/services/aiAnalysisModel.ts` with exports:

```ts
export type AiAnalysisInput = {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  totals: Record<string, number>;
  campaigns: Array<Record<string, unknown>>;
  profile: ClientAiProfile;
  recentRuns: ClientReportRun[];
};

export type NormalizedAiAnalysis = {
  summary: string;
  positives: unknown[];
  attentionPoints: unknown[];
  internalAlerts: unknown[];
  recommendations: Array<Record<string, unknown> & { audience: 'agency' }>;
  talkingPoints: unknown[];
  riskLevel: 'low' | 'normal' | 'attention' | 'critical';
  opportunityLevel: 'low' | 'normal' | 'high';
};

export function normalizeAiAnalysisPayload(payload: unknown): NormalizedAiAnalysis;
```

- [x] **Step 3: Implement Edge AI provider contract**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/_shared/aiProvider.ts` with:

```ts
export type AiProviderName = 'gemini';

export type AiProviderRequest = {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, unknown>;
  profile: Record<string, unknown>;
  recentHistory: unknown[];
};

export type AiProviderResponse = {
  provider: AiProviderName;
  model: string;
  payload: unknown;
};

export async function generateInternalAnalysis(request: AiProviderRequest): Promise<AiProviderResponse>;
```

Rules:

- read Gemini API key from environment;
- request JSON-only output;
- do not include webhook URLs, tokens, or raw OAuth details in prompts;
- return provider and model.

- [x] **Step 4: Update generate-report Edge Function**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/functions/generate-report/index.ts` so it can accept an internal analysis request:

```json
{
  "type": "internal_client_analysis",
  "clientId": "uuid",
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-15"
}
```

The function should:

- load client profile;
- load relevant report runs;
- call `generateInternalAnalysis`;
- normalize or store safe structured output in `client_ai_analyses`;
- return the created analysis id.

- [x] **Step 5: Verify AI model**

Run:

```bash
npm test -- tests/aiAnalysisModel.test.ts
npm run build
```

Expected: tests and build pass.

Execution note, 2026-05-15:

- Added `normalizeAiAnalysisPayload` with safe fallback behavior, agency-only recommendations, separated talking points, and level clamping.
- Added `_shared/aiProvider.ts` for Gemini JSON-only internal analysis generation with prompt sanitization for token/webhook/OAuth fields.
- Updated `generate-report` to support `type: "internal_client_analysis"` while preserving the old report-generation path.
- Internal analysis flow now loads the owned client, AI profile, recent report runs, calls Gemini, normalizes output, stores `client_ai_analyses`, and returns `analysisId`.
- Red/green verification: `npm test -- tests/aiAnalysisModel.test.ts` first failed because `services/aiAnalysisModel.ts` was missing, then passed after implementation.
- Final verification passed with `npm test -- tests/aiAnalysisModel.test.ts`, `npm run build`, and full `npm test`.
- Deployed `generate-report`; Supabase function list confirmed it active at version 4.

## Task 10: IA Analista Client Tab

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientAiAnalystTab.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientDetailView.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/edgeFunctions.ts`

- [x] **Step 1: Add AI profile API calls**

In `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceApi.ts`, ensure these exports exist:

```ts
export async function getClientAiProfile(clientId: string): Promise<ClientAiProfile | null>;
export async function upsertClientAiProfile(input: Partial<ClientAiProfile> & { clientId: string }): Promise<ClientAiProfile>;
export async function listClientAiAnalyses(clientId: string): Promise<ClientAiAnalysis[]>;
```

- [x] **Step 2: Add generate analysis wrapper**

In `/Users/yohannreimer/Downloads/nexus-ai-main/services/edgeFunctions.ts`, add:

```ts
export async function generateClientAiAnalysis(input: {
  clientId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<{ analysisId: string }> {
  return invokeEdgeFunction('generate-report', {
    type: 'internal_client_analysis',
    ...input,
  });
}
```

- [x] **Step 3: Build IA Analista tab**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientAiAnalystTab.tsx` with:

- AI enabled toggle;
- objective selector;
- tone selector;
- CPL/budget/business rule inputs;
- period selector using existing client analysis filter patterns;
- `Gerar analise` button;
- latest analysis view with `Resumo Executivo`, `Diagnostico`, `Plano Sugerido`, and `Ajuda de Comunicacao`;
- clear agency-only labeling on recommendations.

Visual requirement:

- no visible AI content inside client-facing report preview by default;
- no nested cards;
- compact responsive layout.

- [x] **Step 4: Add tab to client detail**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/components/ClientDetailView.tsx`:

- add `IA Analista` tab near reporting tabs;
- keep existing tabs accessible;
- pass selected client, account links, runs, and settings.

- [x] **Step 5: Verify IA tab build**

Run:

```bash
npm run build
```

Expected: build passes and client detail keeps current tabs plus `IA Analista`.

Execution note, 2026-05-15:

- Confirmed existing AI profile APIs were already exported from `clientWorkspaceApi.ts`.
- Added `generateClientAiAnalysis` wrapper in `edgeFunctions.ts` for the new `generate-report` internal analysis payload.
- Added `ClientAiAnalystTab` with IA toggle, objective/tone segmented controls, CPL/budget/business rules, period controls, generate button, latest analysis sections, and agency-only recommendation labeling.
- Added `IA Analista` tab to client detail without removing or reordering existing reporting/account/automation/portal tabs.
- App now passes selected client report runs into the client detail view for IA context.
- Verification passed with `npm run build` and full `npm test`.

## Task 11: Portfolio Health Rules

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/services/portfolioHealth.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/tests/portfolioHealth.test.ts`

- [x] **Step 1: Add portfolio tests**

Create tests for:

- automation off produces `automation_off`;
- no active linked accounts produces `needs_accounts`;
- failed latest report produces `attention`;
- account disconnect warning produces `critical`;
- spend without conversions for configured threshold produces alert;
- healthy client with recent sent report produces `healthy`;
- opportunity generated when conversion count improves versus previous period.

- [x] **Step 2: Implement portfolio health model**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/services/portfolioHealth.ts` with exports:

```ts
export type PortfolioClientHealth = 'healthy' | 'attention' | 'critical' | 'no_data' | 'integration_broken' | 'automation_off';

export type PortfolioAlert = {
  id: string;
  clientId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action: 'review_client' | 'resend_report' | 'reconnect_integration' | 'validate_budget' | 'generate_ai_analysis' | 'contact_client';
};

export type PortfolioOpportunity = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  action: 'increase_budget' | 'case_study' | 'upsell' | 'strategy_meeting';
};

export function evaluatePortfolioHealth(input: {
  clients: ClientWorkspaceSummary[];
  runs: ClientReportRun[];
  analyses: ClientAiAnalysis[];
}): {
  summary: Record<PortfolioClientHealth, number>;
  alerts: PortfolioAlert[];
  opportunities: PortfolioOpportunity[];
  actionQueue: PortfolioAlert[];
};
```

- [x] **Step 3: Verify portfolio rules**

Run:

```bash
npm test -- tests/portfolioHealth.test.ts
```

Expected: portfolio health tests pass.

Execution note, 2026-05-15:

- Added portfolio health tests for automation off, broken integration, failed latest report, disconnect warning, spend without conversion threshold, healthy sent report, and conversion-growth opportunity.
- Added deterministic `evaluatePortfolioHealth` with portfolio summary, alerts, opportunities, and prioritized action queue.
- Red/green verification: `npm test -- tests/portfolioHealth.test.ts` first failed because `services/portfolioHealth.ts` was missing, then passed after implementation.
- Final verification passed with full `npm test` and `npm run build`.

## Task 12: Centro IA Global View

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/components/AgencyIntelligenceCenter.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/components/Layout.tsx`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/App.tsx`

- [x] **Step 1: Add navigation route**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/components/Layout.tsx`:

- add global item `Centro IA`;
- icon should use existing icon system;
- preserve current nav order.

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/App.tsx`:

- add view type `AI_CENTER`;
- render `AgencyIntelligenceCenter`.

- [x] **Step 2: Build Centro IA surface**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/components/AgencyIntelligenceCenter.tsx` with sections:

- `Briefing da Manha`;
- `Saude da Carteira`;
- `Alertas Internos`;
- `Oportunidades`;
- `Fila de Acoes`.

Rules:

- deterministic alerts appear even if AI provider is unavailable;
- AI summary is shown as enhancement when an `agency_ai_briefings` row exists;
- failed reports link to `ReportsHistoryView`;
- clients link to their detail page.

- [x] **Step 3: Verify Centro IA build**

Run:

```bash
npm test -- tests/portfolioHealth.test.ts
npm run build
```

Expected: tests and build pass.

Execution note, 2026-05-15:

- Added `Centro IA` to the main navigation and `AI_CENTER` route in the app.
- Added `AgencyIntelligenceCenter` with Briefing da Manha, Saude da Carteira, Alertas Internos, Oportunidades, and Fila de Acoes.
- The view uses deterministic `evaluatePortfolioHealth` alerts even when there is no AI briefing row; agency AI briefings enhance the briefing text when present.
- Client rows route to client detail and failed-report actions route to the report history.
- App now loads agency briefings and client analyses during workspace refresh.
- Verification passed with `npm test -- tests/portfolioHealth.test.ts`, `npm run build`, and full `npm test`.

## Task 13: Scheduler Cron And Manual Run Controls

**Files:**
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/migrations/20241126_setup_cron_job.sql`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/migrations/20260515_scheduled_reports_cron.sql`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/components/ReportsHistoryView.tsx`

- [x] **Step 1: Add cron migration**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/migrations/20260515_scheduled_reports_cron.sql` that schedules the current `scheduled-reports` Edge Function every minute using Supabase cron. Use the project Edge Function URL and service role secret pattern already used in `/Users/yohannreimer/Downloads/nexus-ai-main/supabase/migrations/20241126_setup_cron_job.sql`.

- [x] **Step 2: Add manual run button for admins**

Modify `/Users/yohannreimer/Downloads/nexus-ai-main/components/ReportsHistoryView.tsx`:

- add `Rodar agora` action;
- call `runScheduledReportsNow({ dryRun: false })`;
- show result summary;
- keep the action visually secondary.

- [x] **Step 3: Verify cron/manual build**

Run:

```bash
npm run build
```

Expected: build passes.

Execution note, 2026-05-15:

- Added `20260515_scheduled_reports_cron.sql` for minute-based pg_cron execution of `scheduled-reports`.
- Later verification found an old `send-scheduled-reports` cron job still firing unauthenticated requests. Applied `scheduled_reports_cron_auth_guard` to remove the legacy job and replace it with `nexus-scheduled-reports`.
- Supabase custom database settings were not writable from the available CLI/MCP role, so the production cron function stores the scheduler secret in the database function body while the same value is stored as the `SCHEDULED_REPORTS_SECRET` Edge Function secret. The local migration remains generic and does not include the secret value.
- Updated `scheduled-reports` so authenticated app users can trigger a manual run, while service role and scheduler secret still work for cron.
- Added secondary `Rodar agora` action in report history with result summary.
- Deployed `scheduled-reports`; Supabase function list confirmed it active at version 9 with `verify_jwt=false` because the function performs its own scheduler-secret/authenticated-user authorization.
- Verified cron path with a `dryRun` HTTP call returning `{"processed":0,"sent":0,"failed":0,"skipped":0,"runIds":[]}` and Edge Function logs showing `POST | 200` for version 9.
- Verification passed with full `npm test` and `npm run build`.

## Task 14: Chat With Data Foundation

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/services/aiChatContext.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/tests/aiChatContext.test.ts`

- [x] **Step 1: Add context packing tests**

Create tests that assert chat context:

- includes client name, profile, latest report run, latest AI analysis, and recent metrics;
- excludes webhook URL, tokens, raw OAuth data, and raw provider payload;
- caps history to the most recent 10 report runs and 5 AI analyses.

- [x] **Step 2: Implement context packer**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/services/aiChatContext.ts` with:

```ts
export function buildClientChatContext(input: {
  client: AgencyClient;
  profile: ClientAiProfile | null;
  reportRuns: ClientReportRun[];
  analyses: ClientAiAnalysis[];
}): Record<string, unknown>;
```

- [x] **Step 3: Verify chat foundation**

Run:

```bash
npm test -- tests/aiChatContext.test.ts
npm run build
```

Expected: tests and build pass.

This task creates the safe context layer only. UI chat is a separate product task after Phases 1 through 4 are stable.

Execution note, 2026-05-15:

- Added chat context tests for included client/profile/latest report/latest analysis/recent metrics, sensitive-field exclusion, and history caps.
- Added `buildClientChatContext` with sanitized report/analysis history capped to 10 runs and 5 analyses.
- Red/green verification: `npm test -- tests/aiChatContext.test.ts` first failed because `services/aiChatContext.ts` was missing, then passed after implementation.
- Verification passed with `npm test -- tests/aiChatContext.test.ts` and `npm run build`.

## Task 15: Commercial Product Foundation

**Files:**
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/services/planLimits.ts`
- Create: `/Users/yohannreimer/Downloads/nexus-ai-main/tests/planLimits.test.ts`
- Modify: `/Users/yohannreimer/Downloads/nexus-ai-main/services/clientWorkspaceTypes.ts`

- [x] **Step 1: Add plan limit tests**

Create tests for:

- starter plan max clients;
- pro plan max clients;
- agency plan unlimited flag;
- portal enabled flag;
- AI enabled flag;
- report automation enabled flag.

- [x] **Step 2: Implement plan limits**

Create `/Users/yohannreimer/Downloads/nexus-ai-main/services/planLimits.ts` with:

```ts
export type NexusPlan = 'starter' | 'pro' | 'agency';

export type NexusPlanLimits = {
  maxClients: number | null;
  portalEnabled: boolean;
  aiEnabled: boolean;
  reportAutomationEnabled: boolean;
  whiteLabelEnabled: boolean;
};

export function getPlanLimits(plan: NexusPlan): NexusPlanLimits;
```

- [x] **Step 3: Verify plan limit tests**

Run:

```bash
npm test -- tests/planLimits.test.ts
npm run build
```

Expected: tests and build pass.

This task adds enforceable product boundaries without adding billing checkout.

### Task 15 Execution Notes

- Added `NexusPlan` and `NexusPlanLimits` domain types.
- Added `getPlanLimits` for `starter`, `pro`, and `agency` product boundaries.
- Red/green verification: `npm test -- tests/planLimits.test.ts` first failed because `services/planLimits.ts` was missing, then passed after implementation.
- Verification passed with `npm test -- tests/planLimits.test.ts` and `npm run build`.

## Task 16: End-To-End Verification

**Files:**
- Verify: full repository

- [x] **Step 1: Run all automated tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [x] **Step 2: Build production bundle**

Run:

```bash
npm run build
```

Expected: Vite build succeeds.

- [x] **Step 3: Start local app**

Run:

```bash
npm run dev
```

Expected: app starts on the available Vite port.

- [ ] **Step 4: Manual smoke test**

In the browser, verify:

- login/dev access opens current product;
- `Clientes` still loads;
- client detail current tabs still work;
- `Analise Completa` keeps shared filters for overview, platform, account, campaigns, charts, and simulation;
- `Automacoes` saves schedule settings;
- `Portal do Cliente` saves slug and mode;
- public `/portal/:slug` renders client-facing content only;
- `IA Analista` can save profile and generate agency-facing analysis;
- `Centro IA` shows portfolio health;
- manual send still calls `send-webhook`;
- scheduled report dry run returns a summary;
- no client-facing report contains internal AI recommendations.

- [x] **Step 5: Supabase advisors**

Run Supabase MCP advisors for project `ycniehayquyznwhrqtri`:

- security advisor;
- performance advisor.

Expected: review and address new issues related to RLS, missing indexes, or public portal access before market release.

### Task 16 Execution Notes

- Full automated test suite passed with `npm test` (`59` tests passing).
- Production bundle passed with `npm run build`; Vite reported existing chunk-size/dynamic-import warnings only.
- Local app is running at `http://localhost:5173/` from `/Users/yohannreimer/Downloads/nexus-ai-main`; port inspection confirmed PID `54489` is this project.
- Browser automation reached the login screen, so authenticated UI smoke remains a manual checkpoint in the user's logged-in browser.
- Supabase security advisors reported existing warnings: `pg_net` extension in public schema, intentionally public `get_public_client_portal(portal_slug text)` security definer RPC, and leaked password protection disabled in Auth settings.
- Supabase performance advisors reported only unused-index info items, expected for a fresh/low-traffic project.
- Edge Function list confirms `scheduled-reports` active at version 9 with `verify_jwt=false`; direct dry-run and cron-trigger logs show HTTP `200`.

## Acceptance Criteria

- Current product flows remain available and visually consistent.
- `scheduled-reports` uses `agency_clients`, `agency_client_accounts`, `client_report_settings`, and `client_report_runs`.
- N8N receives versioned payloads with `reportRunId`.
- `client_report_runs` is the official history for manual and scheduled sends.
- Client portal has modes `Essencial`, `Executivo`, and `Completo`.
- Public portal never exposes tokens, webhook URLs, raw account linkage, or internal AI recommendations.
- `IA Analista` stores agency-facing analysis in `client_ai_analyses`.
- Client-facing report messages remain deterministic by default.
- `Centro IA` works from deterministic portfolio rules even when AI generation fails.
- All new pure logic has Node tests.
- `npm test` and `npm run build` pass at the end of each phase.
