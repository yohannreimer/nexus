# Agency Client Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust agency client workspace where clients group Meta and Google ad accounts, expose clean internal tabs, and support unified executive and analytical reporting.

**Architecture:** Add a new client workspace layer on top of the existing `ad_platform_accounts` inventory instead of overloading the legacy `clients` table. Keep Meta/Google integrations intact, then add service functions and React views that progressively replace the account-first dashboard with a client-first workflow.

**Tech Stack:** React 19, Vite, TypeScript, Supabase/Postgres, Supabase Edge Functions already deployed for platform data, Node test runner with `tsx`.

---

## File Structure

### Database

- Create `supabase/migrations/20260515_workspace_agency_clients.sql`
  - Adds `agency_clients`
  - Adds `agency_client_accounts`
  - Adds `client_report_settings`
  - Adds `client_report_runs`
  - Adds RLS policies scoped by `auth.uid()`
  - Adds a partial unique index so one active ad account belongs to one active client

### Types And Services

- Create `services/clientWorkspaceTypes.ts`
  - TypeScript interfaces for client workspace rows and UI view models
- Create `services/clientWorkspaceMetrics.ts`
  - Pure aggregation helpers for unified reporting
- Create `services/clientWorkspaceApi.ts`
  - Supabase CRUD and account-linking functions
- Modify `types.ts`
  - Re-export client workspace types

### Tests

- Create `tests/clientWorkspaceMetrics.test.ts`
  - Verifies blended totals across Meta/Google accounts
- Create `tests/clientWorkspaceApiMapping.test.ts`
  - Verifies account ownership and view-model mapping helpers without hitting Supabase

### UI Components

- Modify `components/Layout.tsx`
  - Turn sidebar into real navigation
  - Replace `Faturamento` with hidden/removed entry
  - Add `Clientes`, `Contas de Anúncio`, `Relatórios`, `Integrações`, `Configurações`
- Create `components/ClientsView.tsx`
  - Main client list
- Create `components/ClientDetailView.tsx`
  - Client workspace with internal tabs
- Create `components/LinkedAccountsTab.tsx`
  - Link/unlink/move accounts inside a client
- Create `components/FullAnalysisTab.tsx`
  - Analysis subtabs, including `Gráficos` and `Simulação`
- Create `components/IntegrationsView.tsx`
  - Connection-only screen for Meta/Google
- Create `components/AdAccountsInventoryView.tsx`
  - All imported accounts and ownership state
- Create `components/ReportsHistoryView.tsx`
  - Report run history screen
- Modify `components/Dashboard.tsx`
  - Keep temporarily as legacy fallback or shrink usage after routes move to new views
- Modify `App.tsx`
  - Add view state for new navigation and client detail
  - Wire services into new views

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260515_workspace_agency_clients.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260515_workspace_agency_clients.sql` with:

```sql
create table if not exists public.agency_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  primary_whatsapp text,
  internal_owner text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_client_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.agency_clients(id) on delete cascade,
  account_id uuid not null references public.ad_platform_accounts(id) on delete cascade,
  platform text not null check (platform in ('meta', 'google')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agency_client_accounts_one_active_client_per_account
  on public.agency_client_accounts(account_id)
  where is_active = true;

create table if not exists public.client_report_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.agency_clients(id) on delete cascade,
  default_period text not null default 'yesterday' check (default_period in ('today', 'yesterday', 'last_7d', 'last_30d', 'custom')),
  send_time text not null default '08:00',
  timezone text not null default 'America/Sao_Paulo',
  delivery_enabled boolean not null default false,
  delivery_target text,
  webhook_url text,
  default_report_mode text not null default 'executive' check (default_report_mode in ('executive', 'analytical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id)
);

create table if not exists public.client_report_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.agency_clients(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'generated' check (status in ('generated', 'sent', 'failed')),
  report_mode text not null default 'executive' check (report_mode in ('executive', 'analytical')),
  platforms_included text[] not null default '{}'::text[],
  summary_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.agency_clients enable row level security;
alter table public.agency_client_accounts enable row level security;
alter table public.client_report_settings enable row level security;
alter table public.client_report_runs enable row level security;

create policy "agency_clients_select_own" on public.agency_clients
  for select using (auth.uid() = user_id);
create policy "agency_clients_insert_own" on public.agency_clients
  for insert with check (auth.uid() = user_id);
create policy "agency_clients_update_own" on public.agency_clients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agency_clients_delete_own" on public.agency_clients
  for delete using (auth.uid() = user_id);

create policy "agency_client_accounts_select_own" on public.agency_client_accounts
  for select using (auth.uid() = user_id);
create policy "agency_client_accounts_insert_own" on public.agency_client_accounts
  for insert with check (auth.uid() = user_id);
create policy "agency_client_accounts_update_own" on public.agency_client_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agency_client_accounts_delete_own" on public.agency_client_accounts
  for delete using (auth.uid() = user_id);

create policy "client_report_settings_select_own" on public.client_report_settings
  for select using (auth.uid() = user_id);
create policy "client_report_settings_insert_own" on public.client_report_settings
  for insert with check (auth.uid() = user_id);
create policy "client_report_settings_update_own" on public.client_report_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "client_report_settings_delete_own" on public.client_report_settings
  for delete using (auth.uid() = user_id);

create policy "client_report_runs_select_own" on public.client_report_runs
  for select using (auth.uid() = user_id);
create policy "client_report_runs_insert_own" on public.client_report_runs
  for insert with check (auth.uid() = user_id);
create policy "client_report_runs_update_own" on public.client_report_runs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "client_report_runs_delete_own" on public.client_report_runs
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration to Supabase**

Run through MCP `apply_migration`:

```text
project_id: ycniehayquyznwhrqtri
name: agency_client_workspace
query: contents of supabase/migrations/20260515_workspace_agency_clients.sql
```

Expected: migration applies without SQL errors.

- [ ] **Step 3: Verify tables exist**

Run:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'agency_clients',
    'agency_client_accounts',
    'client_report_settings',
    'client_report_runs'
  )
order by table_name;
```

Expected: four rows.

---

## Task 2: Client Workspace Types

**Files:**
- Create: `services/clientWorkspaceTypes.ts`
- Modify: `types.ts`

- [ ] **Step 1: Create the types file**

Create `services/clientWorkspaceTypes.ts`:

```ts
import type { AdPlatform, PlatformAccount, PlatformInsightTotals } from './platformTypes';

export type AgencyClientStatus = 'active' | 'paused' | 'archived';
export type ClientReportPeriod = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'custom';
export type ClientReportMode = 'executive' | 'analytical';
export type ClientReportRunStatus = 'generated' | 'sent' | 'failed';

export interface AgencyClient {
  id: string;
  userId: string;
  name: string;
  status: AgencyClientStatus;
  primaryWhatsapp: string | null;
  internalOwner: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyClientAccountLink {
  id: string;
  userId: string;
  clientId: string;
  accountId: string;
  platform: AdPlatform;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  account?: PlatformAccount;
}

export interface ClientReportSettings {
  id: string;
  userId: string;
  clientId: string;
  defaultPeriod: ClientReportPeriod;
  sendTime: string;
  timezone: string;
  deliveryEnabled: boolean;
  deliveryTarget: string | null;
  webhookUrl: string | null;
  defaultReportMode: ClientReportMode;
  createdAt: string;
  updatedAt: string;
}

export interface ClientReportRun {
  id: string;
  userId: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  status: ClientReportRunStatus;
  reportMode: ClientReportMode;
  platformsIncluded: AdPlatform[];
  summaryPayload: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface ClientWorkspaceSummary {
  client: AgencyClient;
  settings: ClientReportSettings | null;
  linkedAccounts: AgencyClientAccountLink[];
  accountCount: number;
  metaAccountCount: number;
  googleAccountCount: number;
  nextSendLabel: string;
  health: 'ok' | 'needs_accounts' | 'automation_off' | 'attention';
  totals?: PlatformInsightTotals;
}

export interface AvailableAccount extends PlatformAccount {
  linkedClientId: string | null;
  linkedClientName: string | null;
}
```

- [ ] **Step 2: Re-export types**

Modify the export block in `types.ts`:

```ts
export type {
  AgencyClient,
  AgencyClientAccountLink,
  AgencyClientStatus,
  AvailableAccount,
  ClientReportMode,
  ClientReportPeriod,
  ClientReportRun,
  ClientReportRunStatus,
  ClientReportSettings,
  ClientWorkspaceSummary,
} from './services/clientWorkspaceTypes';
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npx tsc --noEmit --pretty false -p tsconfig.json
```

Expected: no TypeScript errors.

---

## Task 3: Unified Client Metrics

**Files:**
- Create: `services/clientWorkspaceMetrics.ts`
- Create: `tests/clientWorkspaceMetrics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/clientWorkspaceMetrics.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClientPlatformBreakdown, calculateClientTotals } from '../services/clientWorkspaceMetrics';
import type { PlatformInsight } from '../services/platformTypes';

test('calculateClientTotals blends Meta and Google metrics from linked accounts', () => {
  const rows: PlatformInsight[] = [
    insight('meta', 'act_1', 100, 10000, 200, 10, 300),
    insight('google', '123', 50, 5000, 100, 5, 150),
  ];

  const totals = calculateClientTotals(rows);

  assert.equal(totals.spend, 150);
  assert.equal(totals.impressions, 15000);
  assert.equal(totals.clicks, 300);
  assert.equal(totals.conversions, 15);
  assert.equal(totals.ctr, 2);
  assert.equal(totals.cpc, 0.5);
  assert.equal(totals.cpm, 10);
  assert.equal(totals.conversionValue, 450);
  assert.equal(totals.roas, 3);
});

test('buildClientPlatformBreakdown returns totals per platform', () => {
  const rows: PlatformInsight[] = [
    insight('meta', 'act_1', 100, 10000, 200, 10, 300),
    insight('google', '123', 50, 5000, 100, 5, 150),
    insight('google', '456', 20, 1000, 20, 1, 20),
  ];

  const breakdown = buildClientPlatformBreakdown(rows);

  assert.equal(breakdown.meta?.spend, 100);
  assert.equal(breakdown.google?.spend, 70);
  assert.equal(breakdown.google?.clicks, 120);
});

function insight(
  platform: 'meta' | 'google',
  accountId: string,
  spend: number,
  impressions: number,
  clicks: number,
  conversions: number,
  conversionValue: number,
): PlatformInsight {
  return {
    platform,
    accountId,
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    conversions,
    costPerConversion: conversions > 0 ? spend / conversions : null,
    conversionValue,
    roas: spend > 0 ? conversionValue / spend : null,
  };
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- tests/clientWorkspaceMetrics.test.ts
```

Expected: FAIL because `services/clientWorkspaceMetrics.ts` does not exist.

- [ ] **Step 3: Implement metrics helpers**

Create `services/clientWorkspaceMetrics.ts`:

```ts
import { calculateTotals, groupTotalsByPlatform } from './platformMetrics';
import type { PlatformInsight, PlatformInsightTotals } from './platformTypes';

export function calculateClientTotals(rows: PlatformInsight[]): PlatformInsightTotals {
  return calculateTotals(rows);
}

export function buildClientPlatformBreakdown(
  rows: PlatformInsight[],
): Partial<Record<'meta' | 'google', PlatformInsightTotals>> {
  return groupTotalsByPlatform(rows);
}
```

- [ ] **Step 4: Run the tests**

Run:

```bash
npm test
```

Expected: all tests pass.

---

## Task 4: Client Workspace API Mapping And CRUD

**Files:**
- Create: `services/clientWorkspaceApi.ts`
- Create: `tests/clientWorkspaceApiMapping.test.ts`

- [ ] **Step 1: Write mapping tests**

Create `tests/clientWorkspaceApiMapping.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAvailableAccounts, buildClientSummaryHealth } from '../services/clientWorkspaceApi';
import type { AgencyClient, AgencyClientAccountLink, ClientReportSettings } from '../services/clientWorkspaceTypes';
import type { PlatformAccount } from '../services/platformTypes';

test('buildAvailableAccounts marks account ownership by client', () => {
  const accounts: PlatformAccount[] = [
    account('a1', 'meta', 'Conta 1'),
    account('a2', 'google', 'Conta 2'),
  ];
  const clients = [client('c1', 'Cliente A')];
  const links: AgencyClientAccountLink[] = [link('l1', 'c1', 'a1', 'meta')];

  const result = buildAvailableAccounts(accounts, clients, links);

  assert.equal(result[0].linkedClientId, 'c1');
  assert.equal(result[0].linkedClientName, 'Cliente A');
  assert.equal(result[1].linkedClientId, null);
  assert.equal(result[1].linkedClientName, null);
});

test('buildClientSummaryHealth identifies missing accounts before automation state', () => {
  assert.equal(buildClientSummaryHealth([], enabledSettings()), 'needs_accounts');
  assert.equal(buildClientSummaryHealth([link('l1', 'c1', 'a1', 'meta')], null), 'automation_off');
  assert.equal(buildClientSummaryHealth([link('l1', 'c1', 'a1', 'meta')], enabledSettings()), 'ok');
});

function account(id: string, platform: 'meta' | 'google', name: string): PlatformAccount {
  return {
    id,
    platform,
    externalAccountId: id,
    name,
    currency: 'BRL',
    status: 'active',
    isConfigured: false,
    selectedCampaignIds: [],
  };
}

function client(id: string, name: string): AgencyClient {
  return {
    id,
    userId: 'u1',
    name,
    status: 'active',
    primaryWhatsapp: null,
    internalOwner: null,
    notes: null,
    metadata: {},
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function link(id: string, clientId: string, accountId: string, platform: 'meta' | 'google'): AgencyClientAccountLink {
  return {
    id,
    userId: 'u1',
    clientId,
    accountId,
    platform,
    isActive: true,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}

function enabledSettings(): ClientReportSettings {
  return {
    id: 's1',
    userId: 'u1',
    clientId: 'c1',
    defaultPeriod: 'yesterday',
    sendTime: '08:00',
    timezone: 'America/Sao_Paulo',
    deliveryEnabled: true,
    deliveryTarget: '5511999999999',
    webhookUrl: null,
    defaultReportMode: 'executive',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}
```

- [ ] **Step 2: Implement API and mapping helpers**

Create `services/clientWorkspaceApi.ts`:

```ts
import { isSupabaseConfigured, supabase } from './supabase';
import type { PlatformAccount } from './platformTypes';
import type {
  AgencyClient,
  AgencyClientAccountLink,
  AvailableAccount,
  ClientReportSettings,
  ClientWorkspaceSummary,
} from './clientWorkspaceTypes';

type DbClient = {
  id: string;
  user_id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  primary_whatsapp: string | null;
  internal_owner: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type DbLink = {
  id: string;
  user_id: string;
  client_id: string;
  account_id: string;
  platform: 'meta' | 'google';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DbSettings = {
  id: string;
  user_id: string;
  client_id: string;
  default_period: 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'custom';
  send_time: string;
  timezone: string;
  delivery_enabled: boolean;
  delivery_target: string | null;
  webhook_url: string | null;
  default_report_mode: 'executive' | 'analytical';
  created_at: string;
  updated_at: string;
};

export function mapAgencyClient(row: DbClient): AgencyClient {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status,
    primaryWhatsapp: row.primary_whatsapp,
    internalOwner: row.internal_owner,
    notes: row.notes,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClientAccountLink(row: DbLink): AgencyClientAccountLink {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    accountId: row.account_id,
    platform: row.platform,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClientReportSettings(row: DbSettings): ClientReportSettings {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    defaultPeriod: row.default_period,
    sendTime: row.send_time,
    timezone: row.timezone,
    deliveryEnabled: row.delivery_enabled,
    deliveryTarget: row.delivery_target,
    webhookUrl: row.webhook_url,
    defaultReportMode: row.default_report_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildAvailableAccounts(
  accounts: PlatformAccount[],
  clients: AgencyClient[],
  links: AgencyClientAccountLink[],
): AvailableAccount[] {
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const activeLinkByAccountId = new Map(
    links.filter((link) => link.isActive).map((link) => [link.accountId, link]),
  );

  return accounts.map((account) => {
    const link = activeLinkByAccountId.get(account.id);
    const client = link ? clientById.get(link.clientId) : undefined;
    return {
      ...account,
      linkedClientId: client?.id || null,
      linkedClientName: client?.name || null,
    };
  });
}

export function buildClientSummaryHealth(
  links: AgencyClientAccountLink[],
  settings: ClientReportSettings | null,
): ClientWorkspaceSummary['health'] {
  if (links.filter((link) => link.isActive).length === 0) return 'needs_accounts';
  if (!settings?.deliveryEnabled) return 'automation_off';
  return 'ok';
}

export async function listAgencyClients(): Promise<AgencyClient[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('agency_clients').select('*').order('name');
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapAgencyClient(row as DbClient));
}

export async function createAgencyClient(input: {
  name: string;
  primaryWhatsapp?: string;
  internalOwner?: string;
  notes?: string;
}): Promise<AgencyClient> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase não está configurado');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('agency_clients')
    .insert({
      user_id: user.id,
      name: input.name,
      primary_whatsapp: input.primaryWhatsapp || null,
      internal_owner: input.internalOwner || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapAgencyClient(data as DbClient);
}

export async function listClientAccountLinks(): Promise<AgencyClientAccountLink[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('agency_client_accounts')
    .select('*')
    .eq('is_active', true);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapClientAccountLink(row as DbLink));
}

export async function linkAccountToClient(clientId: string, account: PlatformAccount): Promise<AgencyClientAccountLink> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase não está configurado');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('agency_client_accounts')
    .insert({
      user_id: user.id,
      client_id: clientId,
      account_id: account.id,
      platform: account.platform,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message.includes('duplicate') ? 'Esta conta já está vinculada a outro cliente.' : error.message);
  return mapClientAccountLink(data as DbLink);
}

export async function unlinkAccountFromClient(linkId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase não está configurado');
  const { error } = await supabase
    .from('agency_client_accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', linkId);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
```

Expected: all tests pass.

---

## Task 5: Real Sidebar Navigation

**Files:**
- Modify: `components/Layout.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Update `LayoutProps`**

In `components/Layout.tsx`, replace `LayoutProps` with:

```ts
export type MainView = 'CLIENTS' | 'AD_ACCOUNTS' | 'REPORTS' | 'INTEGRATIONS' | 'SETTINGS' | 'SUPABASE_SETUP';

interface LayoutProps {
  children: React.ReactNode;
  userEmail: string;
  activeView: MainView;
  onNavigate: (view: MainView) => void;
  onLogout: () => void;
}
```

- [ ] **Step 2: Replace sidebar links with buttons**

Use this nav array in `Layout.tsx`:

```ts
const principalItems = [
  { id: 'CLIENTS' as const, label: 'Clientes', icon: SquaresFour },
  { id: 'AD_ACCOUNTS' as const, label: 'Contas de Anúncio', icon: CreditCard },
  { id: 'REPORTS' as const, label: 'Relatórios', icon: PaperPlaneTilt },
];

const systemItems = [
  { id: 'INTEGRATIONS' as const, label: 'Integrações', icon: Plugs },
  { id: 'SETTINGS' as const, label: 'Configurações', icon: Sliders },
];
```

Render each as a `<button>` that calls `onNavigate(item.id)`. Active style matches the existing purple active style. Inactive style matches the existing muted style.

- [ ] **Step 3: Update `App.tsx` view type**

Replace:

```ts
type ViewType = 'DASHBOARD' | 'PREVIEW' | 'CHARTS' | 'SETTINGS' | 'SUPABASE_SETUP';
```

with:

```ts
type ViewType =
  | 'CLIENTS'
  | 'CLIENT_DETAIL'
  | 'AD_ACCOUNTS'
  | 'REPORTS'
  | 'INTEGRATIONS'
  | 'PREVIEW'
  | 'CHARTS'
  | 'SETTINGS'
  | 'SUPABASE_SETUP';
```

Set initial state:

```ts
const [view, setView] = useState<ViewType>('CLIENTS');
```

- [ ] **Step 4: Add a navigation adapter**

In `AppContent`, add:

```ts
const handleMainNavigate = (nextView: 'CLIENTS' | 'AD_ACCOUNTS' | 'REPORTS' | 'INTEGRATIONS' | 'SETTINGS' | 'SUPABASE_SETUP') => {
  setPreviewAccount(null);
  setChartsAccount(null);
  setView(nextView);
};
```

- [ ] **Step 5: Update every `Layout` usage**

Every `Layout` call must pass:

```tsx
activeView={view === 'CLIENT_DETAIL' ? 'CLIENTS' : view === 'PREVIEW' || view === 'CHARTS' ? 'CLIENTS' : view}
onNavigate={handleMainNavigate}
```

Expected: the app compiles with real navigation props.

- [ ] **Step 6: Run typecheck**

Run:

```bash
npx tsc --noEmit --pretty false -p tsconfig.json
```

Expected: no TypeScript errors.

---

## Task 6: Integrations View

**Files:**
- Create: `components/IntegrationsView.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Create the component**

Create `components/IntegrationsView.tsx`:

```tsx
import React from 'react';
import { FacebookLogo, MagnifyingGlass, CheckCircle, WarningCircle } from '@phosphor-icons/react';

interface IntegrationsViewProps {
  metaConnected: boolean;
  googleConnected: boolean;
  onConnectMeta: () => void;
  onConnectGoogle: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  metaConnected,
  googleConnected,
  onConnectMeta,
  onConnectGoogle,
}) => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Integrações</h1>
        <p className="text-[11px] mt-1" style={{ color: '#475569' }}>
          Conecte e monitore as plataformas usadas nos relatórios.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <IntegrationCard
          title="Meta Ads"
          description="Facebook, Instagram, Leads e Mensagens."
          connected={metaConnected}
          icon={<FacebookLogo weight="fill" size={24} color="#60a5fa" />}
          accent="#60a5fa"
          onConnect={onConnectMeta}
        />
        <IntegrationCard
          title="Google Ads"
          description="Search, Performance Max, YouTube e Display."
          connected={googleConnected}
          icon={<MagnifyingGlass weight="bold" size={24} color="#86efac" />}
          accent="#86efac"
          onConnect={onConnectGoogle}
        />
      </div>
    </div>
  );
};

function IntegrationCard(props: {
  title: string;
  description: string;
  connected: boolean;
  icon: React.ReactNode;
  accent: string;
  onConnect: () => void;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {props.icon}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: props.connected ? '#86efac' : '#fbbf24' }}>
          {props.connected ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
          {props.connected ? 'Conectado' : 'Pendente'}
        </span>
      </div>
      <h2 className="mt-5 text-sm font-bold text-white">{props.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{props.description}</p>
      <button
        onClick={props.onConnect}
        className="mt-5 px-3 py-2 text-[11px] font-bold rounded-lg transition-all"
        style={{ color: props.accent, border: `1px solid ${props.accent}40`, background: `${props.accent}12` }}
      >
        {props.connected ? 'Reconectar' : 'Conectar'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Render it from `App.tsx`**

Import:

```ts
import { IntegrationsView } from './components/IntegrationsView';
```

Inside the authenticated `Layout`, render when `view === 'INTEGRATIONS'`:

```tsx
{view === 'INTEGRATIONS' && (
  <IntegrationsView
    metaConnected={facebookConnected}
    googleConnected={adAccounts.some((account) => account.platform === 'google')}
    onConnectMeta={handleConnectFacebook}
    onConnectGoogle={handleConnectGoogle}
  />
)}
```

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: build succeeds.

---

## Task 7: Accounts Inventory View

**Files:**
- Create: `components/AdAccountsInventoryView.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Create the component**

Create `components/AdAccountsInventoryView.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import type { AvailableAccount } from '../services/clientWorkspaceTypes';

interface AdAccountsInventoryViewProps {
  accounts: AvailableAccount[];
  onOpenLinkedClient: (clientId: string) => void;
}

export const AdAccountsInventoryView: React.FC<AdAccountsInventoryViewProps> = ({ accounts, onOpenLinkedClient }) => {
  const [platform, setPlatform] = useState<'all' | 'meta' | 'google'>('all');
  const filtered = useMemo(
    () => accounts.filter((account) => platform === 'all' || account.platform === platform),
    [accounts, platform],
  );

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Contas de Anúncio</h1>
          <p className="text-[11px] mt-1" style={{ color: '#475569' }}>
            Inventário de contas importadas e vínculo com clientes.
          </p>
        </div>
        <div className="flex gap-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 4 }}>
          {(['all', 'meta', 'google'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setPlatform(id)}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-md"
              style={platform === id ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: '#64748b' }}
            >
              {id === 'all' ? 'Todas' : id === 'meta' ? 'Meta' : 'Google'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((account) => (
          <div key={`${account.platform}-${account.id}`} className="rounded-xl flex items-center gap-4 px-4 py-3" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10px] font-bold uppercase w-14" style={{ color: account.platform === 'meta' ? '#93c5fd' : '#86efac' }}>
              {account.platform}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-100 truncate">{account.name}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#475569', fontFamily: 'monospace' }}>{account.externalAccountId}</div>
            </div>
            {account.linkedClientId ? (
              <button
                onClick={() => onOpenLinkedClient(account.linkedClientId as string)}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
                style={{ color: '#c4b5fd', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.22)' }}
              >
                {account.linkedClientName}
              </button>
            ) : (
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg" style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                Sem cliente
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Wire available accounts in `App.tsx`**

Import the workspace API and types:

```ts
import {
  buildAvailableAccounts,
  buildClientSummaryHealth,
  linkAccountToClient,
  listAgencyClients,
  listClientAccountLinks,
  unlinkAccountFromClient,
} from './services/clientWorkspaceApi';
import type { AgencyClient, AgencyClientAccountLink, ClientReportSettings } from './services/clientWorkspaceTypes';
```

Add state:

```ts
const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
const [workspaceClients, setWorkspaceClients] = useState<AgencyClient[]>([]);
const [clientAccountLinks, setClientAccountLinks] = useState<AgencyClientAccountLink[]>([]);
const [reportSettings, setReportSettings] = useState<ClientReportSettings[]>([]);
```

When platform accounts are fetched, keep the raw platform rows as well as the legacy `AdAccount` rows:

```ts
const accounts = await api.fetchPlatformAccounts();
setPlatformAccounts(accounts);
setAdAccounts(accounts.map(mapPlatformAccountToAdAccount));
```

Add a workspace refresh function:

```ts
const refreshWorkspace = async () => {
  const [clients, links] = await Promise.all([
    listAgencyClients(),
    listClientAccountLinks(),
  ]);
  setWorkspaceClients(clients);
  setClientAccountLinks(links);
};
```

Call `refreshWorkspace()` after the user is authenticated and after platform accounts load.

Build inventory:

```ts
const availableAccounts = buildAvailableAccounts(
  platformAccounts,
  workspaceClients,
  clientAccountLinks,
);
```

Add link handlers:

```ts
const handleLinkAccount = async (clientId: string, account: AvailableAccount) => {
  await linkAccountToClient(clientId, account);
  await refreshWorkspace();
};

const handleUnlinkAccount = async (linkId: string) => {
  await unlinkAccountFromClient(linkId);
  await refreshWorkspace();
};
```

- [ ] **Step 3: Render inventory view**

In `App.tsx`:

```tsx
{view === 'AD_ACCOUNTS' && (
  <AdAccountsInventoryView
    accounts={availableAccounts}
    onOpenLinkedClient={(clientId) => {
      setSelectedClientId(clientId);
      setView('CLIENT_DETAIL');
    }}
  />
)}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npx tsc --noEmit --pretty false -p tsconfig.json
```

Expected: no TypeScript errors.

---

## Task 8: Clients List View

**Files:**
- Create: `components/ClientsView.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Create `ClientsView`**

Create `components/ClientsView.tsx`:

```tsx
import React from 'react';
import type { ClientWorkspaceSummary } from '../services/clientWorkspaceTypes';

interface ClientsViewProps {
  clients: ClientWorkspaceSummary[];
  onCreateClient: () => void;
  onOpenClient: (clientId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ clients, onCreateClient, onOpenClient }) => {
  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-xl p-7 text-center max-w-md" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h1 className="text-xl font-bold text-white">Crie seu primeiro cliente</h1>
          <p className="mt-2 text-sm text-slate-500">Agrupe contas Meta e Google para gerar relatórios unificados.</p>
          <button onClick={onCreateClient} className="mt-5 px-4 py-2 text-xs font-bold rounded-lg" style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}>
            Criar cliente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Clientes</h1>
          <p className="text-[11px] mt-1" style={{ color: '#475569' }}>Gerencie relatórios unificados por cliente.</p>
        </div>
        <button onClick={onCreateClient} className="px-3 py-2 text-[11px] font-bold rounded-lg" style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}>
          Criar cliente
        </button>
      </div>

      <div className="grid gap-3">
        {clients.map((item) => (
          <button
            key={item.client.id}
            onClick={() => onOpenClient(item.client.id)}
            className="text-left rounded-xl p-4 transition-all"
            style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-white">{item.client.name}</div>
                <div className="text-[10px] mt-1" style={{ color: '#64748b' }}>
                  {item.accountCount} contas · Meta {item.metaAccountCount} · Google {item.googleAccountCount}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color: healthColor(item.health), background: 'rgba(255,255,255,0.04)' }}>
                {healthLabel(item.health)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

function healthLabel(health: ClientWorkspaceSummary['health']): string {
  if (health === 'ok') return 'Tudo certo';
  if (health === 'needs_accounts') return 'Sem contas';
  if (health === 'automation_off') return 'Automação off';
  return 'Atenção';
}

function healthColor(health: ClientWorkspaceSummary['health']): string {
  if (health === 'ok') return '#86efac';
  if (health === 'needs_accounts') return '#fbbf24';
  if (health === 'automation_off') return '#93c5fd';
  return '#fca5a5';
}
```

- [ ] **Step 2: Add summaries in `App.tsx`**

Build summaries from clients, links, and settings:

```ts
const clientSummaries = workspaceClients.map((client) => {
  const links = clientAccountLinks.filter((link) => link.clientId === client.id && link.isActive);
  const settings = reportSettings.find((item) => item.clientId === client.id) || null;
  return {
    client,
    settings,
    linkedAccounts: links,
    accountCount: links.length,
    metaAccountCount: links.filter((link) => link.platform === 'meta').length,
    googleAccountCount: links.filter((link) => link.platform === 'google').length,
    nextSendLabel: settings?.deliveryEnabled ? settings.sendTime : 'Não configurado',
    health: buildClientSummaryHealth(links, settings),
  };
});
```

- [ ] **Step 3: Render `ClientsView`**

In `App.tsx`:

```tsx
{view === 'CLIENTS' && (
  <ClientsView
    clients={clientSummaries}
    onCreateClient={handleCreateClient}
    onOpenClient={(clientId) => {
      setSelectedClientId(clientId);
      setView('CLIENT_DETAIL');
    }}
  />
)}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: build succeeds.

---

## Task 9: Client Detail Tabs

**Files:**
- Create: `components/ClientDetailView.tsx`
- Create: `components/LinkedAccountsTab.tsx`
- Create: `components/FullAnalysisTab.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Create `ClientDetailView`**

Create a component with tab state:

```tsx
import React, { useState } from 'react';
import type { AvailableAccount, ClientWorkspaceSummary } from '../services/clientWorkspaceTypes';
import { LinkedAccountsTab } from './LinkedAccountsTab';
import { FullAnalysisTab } from './FullAnalysisTab';

type ClientTab = 'summary' | 'executive' | 'analysis' | 'accounts' | 'automation' | 'settings';

interface ClientDetailViewProps {
  summary: ClientWorkspaceSummary;
  availableAccounts: AvailableAccount[];
  onBack: () => void;
  onLinkAccount: (account: AvailableAccount) => void;
  onUnlinkAccount: (linkId: string) => void;
  onPreviewReport: () => void;
  onOpenCharts: () => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = (props) => {
  const [tab, setTab] = useState<ClientTab>('summary');

  return (
    <div>
      <button onClick={props.onBack} className="mb-4 text-xs font-bold text-slate-500">← Voltar</button>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{props.summary.client.name}</h1>
          <p className="text-[11px] mt-1" style={{ color: '#475569' }}>
            {props.summary.accountCount} contas vinculadas · Próximo envio: {props.summary.nextSendLabel}
          </p>
        </div>
        <button onClick={props.onPreviewReport} className="px-3 py-2 text-[11px] font-bold rounded-lg" style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}>
          Gerar relatório
        </button>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 4 }}>
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className="px-3 py-1.5 text-[11px] font-semibold rounded-md whitespace-nowrap" style={tab === item.id ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: '#64748b' }}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <SummaryPanel summary={props.summary} />}
      {tab === 'executive' && <Placeholder title="Relatório Executivo" text="Prévia executiva consolidada do cliente." />}
      {tab === 'analysis' && <FullAnalysisTab onOpenCharts={props.onOpenCharts} onPreviewReport={props.onPreviewReport} />}
      {tab === 'accounts' && <LinkedAccountsTab summary={props.summary} availableAccounts={props.availableAccounts} onLinkAccount={props.onLinkAccount} onUnlinkAccount={props.onUnlinkAccount} />}
      {tab === 'automation' && <Placeholder title="Automações" text="Horário, frequência e destino de envio." />}
      {tab === 'settings' && <Placeholder title="Configurações" text="Dados cadastrais e operação do cliente." />}
    </div>
  );
};

const tabs: Array<{ id: ClientTab; label: string }> = [
  { id: 'summary', label: 'Resumo' },
  { id: 'executive', label: 'Relatório Executivo' },
  { id: 'analysis', label: 'Análise Completa' },
  { id: 'accounts', label: 'Contas Vinculadas' },
  { id: 'automation', label: 'Automações' },
  { id: 'settings', label: 'Configurações' },
];

function SummaryPanel({ summary }: { summary: ClientWorkspaceSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Metric label="Contas" value={String(summary.accountCount)} />
      <Metric label="Meta" value={String(summary.metaAccountCount)} />
      <Metric label="Google" value={String(summary.googleAccountCount)} />
      <Metric label="Próximo envio" value={summary.nextSendLabel} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>{label}</div>
      <div className="text-xl font-bold text-white mt-2">{value}</div>
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <p className="text-xs text-slate-500 mt-1">{text}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `LinkedAccountsTab`**

Create `components/LinkedAccountsTab.tsx`:

```tsx
import React from 'react';
import type { AvailableAccount, ClientWorkspaceSummary } from '../services/clientWorkspaceTypes';

interface LinkedAccountsTabProps {
  summary: ClientWorkspaceSummary;
  availableAccounts: AvailableAccount[];
  onLinkAccount: (account: AvailableAccount) => void;
  onUnlinkAccount: (linkId: string) => void;
}

export const LinkedAccountsTab: React.FC<LinkedAccountsTabProps> = ({
  summary,
  availableAccounts,
  onLinkAccount,
  onUnlinkAccount,
}) => {
  const unlinkedAccounts = availableAccounts.filter((account) => !account.linkedClientId);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-bold text-white">Contas vinculadas</h2>
        <div className="mt-3 grid gap-2">
          {summary.linkedAccounts.length === 0 && (
            <div className="text-xs text-slate-500">Nenhuma conta vinculada a este cliente.</div>
          )}
          {summary.linkedAccounts.map((link) => (
            <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <div className="text-xs font-bold text-slate-100">{link.account?.name || link.accountId}</div>
                <div className="text-[10px]" style={{ color: link.platform === 'meta' ? '#93c5fd' : '#86efac' }}>{link.platform}</div>
              </div>
              <button onClick={() => onUnlinkAccount(link.id)} className="text-[10px] font-bold px-2.5 py-1.5 rounded-md" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)' }}>
                Desvincular
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-bold text-white">Contas disponíveis</h2>
        <div className="mt-3 grid gap-2">
          {unlinkedAccounts.length === 0 && (
            <div className="text-xs text-slate-500">Todas as contas importadas já estão vinculadas.</div>
          )}
          {unlinkedAccounts.map((account) => (
            <div key={`${account.platform}-${account.id}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <div className="text-xs font-bold text-slate-100">{account.name}</div>
                <div className="text-[10px]" style={{ color: account.platform === 'meta' ? '#93c5fd' : '#86efac' }}>{account.platform}</div>
              </div>
              <button onClick={() => onLinkAccount(account)} className="text-[10px] font-bold px-2.5 py-1.5 rounded-md" style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.12)' }}>
                Vincular
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
```

- [ ] **Step 3: Create `FullAnalysisTab`**

Create `components/FullAnalysisTab.tsx`:

```tsx
import React, { useState } from 'react';

type AnalysisTab = 'overview' | 'platform' | 'account' | 'campaigns' | 'charts' | 'simulation';

interface FullAnalysisTabProps {
  onOpenCharts: () => void;
  onPreviewReport: () => void;
}

const tabs: Array<{ id: AnalysisTab; label: string }> = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'platform', label: 'Por Plataforma' },
  { id: 'account', label: 'Por Conta' },
  { id: 'campaigns', label: 'Campanhas' },
  { id: 'charts', label: 'Gráficos' },
  { id: 'simulation', label: 'Simulação' },
];

export const FullAnalysisTab: React.FC<FullAnalysisTabProps> = ({ onOpenCharts, onPreviewReport }) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 4 }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="px-3 py-1.5 text-[11px] font-semibold rounded-md whitespace-nowrap" style={activeTab === tab.id ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: '#64748b' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'charts' && (
        <ActionPanel title="Gráficos" text="Abra a visão gráfica completa do cliente." actionLabel="Abrir gráficos" onAction={onOpenCharts} />
      )}
      {activeTab === 'simulation' && (
        <ActionPanel title="Simulação" text="Pré-visualize o relatório antes de enviar." actionLabel="Simular relatório" onAction={onPreviewReport} />
      )}
      {activeTab !== 'charts' && activeTab !== 'simulation' && (
        <div className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-bold text-white">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
          <p className="text-xs text-slate-500 mt-1">Análise consolidada do cliente por {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()}.</p>
        </div>
      )}
    </div>
  );
};

function ActionPanel(props: { title: string; text: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h2 className="text-sm font-bold text-white">{props.title}</h2>
      <p className="text-xs text-slate-500 mt-1">{props.text}</p>
      <button onClick={props.onAction} className="mt-4 px-3 py-2 text-[11px] font-bold rounded-lg" style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}>
        {props.actionLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Wire client detail in `App.tsx`**

Add:

```ts
const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
```

Find selected summary:

```ts
const selectedClientSummary = clientSummaries.find((item) => item.client.id === selectedClientId) || null;
```

Render:

```tsx
{view === 'CLIENT_DETAIL' && selectedClientSummary && (
  <ClientDetailView
    summary={selectedClientSummary}
    availableAccounts={availableAccounts}
    onBack={() => setView('CLIENTS')}
    onLinkAccount={(account) => handleLinkAccount(selectedClientSummary.client.id, account)}
    onUnlinkAccount={handleUnlinkAccount}
    onPreviewReport={() => {
      const firstAccount = adAccounts.find((account) =>
        selectedClientSummary.linkedAccounts.some((link) => link.account?.externalAccountId === account.externalAccountId),
      );
      if (firstAccount) handleOpenPreview(firstAccount);
    }}
    onOpenCharts={() => {
      const firstAccount = adAccounts.find((account) =>
        selectedClientSummary.linkedAccounts.some((link) => link.account?.externalAccountId === account.externalAccountId),
      );
      if (firstAccount) handleOpenCharts(firstAccount);
    }}
  />
)}
```

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: build succeeds.

---

## Task 10: Report History View

**Files:**
- Create: `components/ReportsHistoryView.tsx`
- Modify: `services/clientWorkspaceApi.ts`
- Modify: `App.tsx`

- [ ] **Step 1: Add report run query**

Add to `services/clientWorkspaceApi.ts`:

```ts
export async function listClientReportRuns(): Promise<ClientReportRun[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('client_report_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    reportMode: row.report_mode,
    platformsIncluded: row.platforms_included || [],
    summaryPayload: row.summary_payload || {},
    errorMessage: row.error_message,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  }));
}
```

- [ ] **Step 2: Create `ReportsHistoryView`**

Create `components/ReportsHistoryView.tsx`:

```tsx
import React from 'react';
import type { AgencyClient, ClientReportRun } from '../services/clientWorkspaceTypes';

interface ReportsHistoryViewProps {
  runs: ClientReportRun[];
  clients: AgencyClient[];
}

export const ReportsHistoryView: React.FC<ReportsHistoryViewProps> = ({ runs, clients }) => {
  const clientById = new Map(clients.map((client) => [client.id, client.name]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Relatórios</h1>
        <p className="text-[11px] mt-1" style={{ color: '#475569' }}>Histórico de relatórios gerados e enviados.</p>
      </div>
      <div className="flex flex-col gap-2">
        {runs.length === 0 && (
          <div className="rounded-xl p-5 text-sm text-slate-500" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            Nenhum relatório gerado ainda.
          </div>
        )}
        {runs.map((run) => (
          <div key={run.id} className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-white">{clientById.get(run.clientId) || 'Cliente removido'}</div>
                <div className="text-[10px] mt-1" style={{ color: '#64748b' }}>{run.periodStart} até {run.periodEnd} · {run.reportMode}</div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color: run.status === 'failed' ? '#fca5a5' : '#86efac', background: 'rgba(255,255,255,0.04)' }}>
                {run.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Render from `App.tsx`**

Import and add state:

```ts
import { ReportsHistoryView } from './components/ReportsHistoryView';
import type { ClientReportRun } from './services/clientWorkspaceTypes';

const [reportRuns, setReportRuns] = useState<ClientReportRun[]>([]);
```

After `listClientReportRuns` is added to `services/clientWorkspaceApi.ts`, include it in the import and refresh it inside `refreshWorkspace`:

```ts
const [clients, links, runs] = await Promise.all([
  listAgencyClients(),
  listClientAccountLinks(),
  listClientReportRuns(),
]);
setWorkspaceClients(clients);
setClientAccountLinks(links);
setReportRuns(runs);
```

Render:

```tsx
{view === 'REPORTS' && (
  <ReportsHistoryView runs={reportRuns} clients={workspaceClients} />
)}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: build succeeds.

---

## Task 11: Verification And Browser QA

**Files:**
- No planned files. If a verification step fails, inspect the failing file named by the compiler, test runner, or browser console and make the smallest targeted fix before rerunning that same verification command.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npx tsc --noEmit --pretty false -p tsconfig.json
```

Expected: no TypeScript errors.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: Vite build succeeds.

- [ ] **Step 4: Start dev server**

Run:

```bash
npm run dev -- --port 5173
```

Expected: app starts at `http://localhost:5173`. If port is busy, use `5174`.

- [ ] **Step 5: Browser QA**

In the browser:

1. Log in.
2. Open `Integrações`.
3. Confirm Meta and Google connection cards render.
4. Open `Contas de Anúncio`.
5. Confirm imported Meta and Google accounts render.
6. Open `Clientes`.
7. Create a client.
8. Open the client.
9. Open `Contas Vinculadas`.
10. Link one available Meta account.
11. Confirm the account appears as linked.
12. Open `Análise Completa`.
13. Confirm subabas include `Gráficos` and `Simulação`.
14. Click `Simulação` and verify the existing report preview opens.

Expected: no console errors except existing Tailwind CDN warning.

---

## Commit Note

This workspace currently is not a Git repository. If a `.git` directory is later added, commit after each task with messages like:

```bash
git add <changed files>
git commit -m "feat: add agency client workspace schema"
```

Until then, skip commit steps and rely on the saved plan plus local file changes.
