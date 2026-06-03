# Prymeira Auth + Postgres Multitenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Nexus Supabase Auth with Prymeira Account authentication for `product_key=ads`, then scope product data by Prymeira `workspace_id` in Postgres.

**Architecture:** Clerk authenticates in the browser, Prymeira Account authorizes `ads`, and the app receives a workspace-scoped auth context. A server-side Postgres layer derives `workspace_id` from the Clerk bearer token by calling Prymeira Account, then executes data queries using that workspace as the tenant boundary. The migration is staged so the login/access gate works first, while data access moves from Supabase `user_id` to Postgres `workspace_id` in controlled slices.

**Tech Stack:** React 19, Vite, TypeScript, Clerk React, Express, `pg`, Postgres SQL migrations, Node test runner.

---

## Scope Check

This plan covers one product integration, but it has three dependent slices:

- Authentication gate: must land first because it produces `workspace_id`.
- Database tenancy: schema must support `workspace_id` before data helpers can move.
- Data/OAuth migration: uses the authenticated workspace context.

The slices are sequential and testable, so they stay in one plan. The current directory is not a git repository, so commit steps are replaced with explicit verification checkpoints.

## File Structure

- Create `services/prymeiraAccount.ts`: browser-safe Account API client, access decision types, denied redirect URL builder.
- Create `contexts/PrymeiraAuthContext.tsx`: Clerk-backed auth/access context for Nexus.
- Modify `App.tsx`: remove Supabase AuthProvider usage, consume Prymeira auth state, derive user/workspace from Prymeira context.
- Modify `index.tsx`: wrap the app in `ClerkProvider` through the new context provider.
- Create `components/Auth/PrymeiraLoginPage.tsx`: branded Clerk login state for Nexus/Ads Vision.
- Create `components/Auth/PrymeiraAccessState.tsx`: access verification and configuration error states.
- Modify `.env.example`: add Prymeira/Clerk/Postgres envs and mark Supabase envs as legacy.
- Create `postgres/migrations/20260603_prymeira_workspace_multitenancy.sql`: workspace columns, indexes, and uniqueness constraints.
- Create `server/prymeiraAccess.ts`: server helper that validates bearer token through Account API and returns workspace context.
- Create `server/postgres.ts`: `pg` pool and query helper using `DATABASE_URL`.
- Modify `server.ts`: mount workspace-scoped API routes and use Prymeira access helper.
- Create `services/nexusApi.ts`: browser client for the new Express API.
- Modify `services/clientWorkspaceApi.ts` and `services/platformApi.ts`: route migrated operations through `nexusApi` when Prymeira auth is enabled.
- Test `tests/prymeiraAccount.test.ts`: access-check URL, mapping, redirect builder.
- Test `tests/prymeiraAccess.test.ts`: server token handling and workspace extraction.
- Test `tests/workspaceTenantMapping.test.ts`: DB row mappers preserve workspace IDs.

## Task 1: Add Dependencies And Environment Contract

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Add runtime dependencies**

Run:

```bash
npm install @clerk/clerk-react pg
npm install -D @types/pg
```

Expected:

```text
The npm command completes successfully and updates package-lock.json.
```

`package.json` should include:

```json
"@clerk/clerk-react": "^5.49.0",
"pg": "^8.16.3"
```

and dev dependency:

```json
"@types/pg": "^8.15.6"
```

- [ ] **Step 2: Update `.env.example`**

Add this block near the existing auth/database settings:

```text
# --- Prymeira Account Auth ---
VITE_CLERK_PUBLISHABLE_KEY="replace_with_clerk_publishable_key"
VITE_PRYMEIRA_ACCOUNT_API_URL="http://localhost:3001"
VITE_PRYMEIRA_HUB_URL="http://localhost:5175"
VITE_PRYMEIRA_PRODUCT_KEY="ads"

# --- Nexus Postgres ---
# Server-side only. Do not prefix with VITE_.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexus_ai"
```

Move the Supabase variables under a comment:

```text
# --- Legacy Supabase integration ---
# These remain during migration for existing Edge Functions and data reads.
```

- [ ] **Step 3: Verify package metadata**

Run:

```bash
npm ls @clerk/clerk-react pg
```

Expected:

```text
The dependency tree includes @clerk/clerk-react and pg.
```

- [ ] **Step 4: Checkpoint**

Run:

```bash
npm run test
```

Expected: existing tests pass before code migration begins.

## Task 2: Account API Client And Redirect Builder

**Files:**
- Create: `services/prymeiraAccount.ts`
- Create: `tests/prymeiraAccount.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/prymeiraAccount.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAccessDeniedUrl,
  checkPrymeiraProductAccess,
  mapAccessDecisionToContext,
} from '../services/prymeiraAccount';

test('checkPrymeiraProductAccess calls Account API with product_key=ads', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({
      allowed: true,
      workspace_id: 'workspace-1',
      workspace_role: 'owner',
      product_key: 'ads',
      product_role: 'admin',
      status: 'active',
      plan: 'internal',
      limits: { clients: 50 },
      reason: 'active_entitlement',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await checkPrymeiraProductAccess({
    accountApiUrl: 'https://account.test/',
    productKey: 'ads',
    token: 'token-123',
    fetcher,
  });

  assert.equal(calls[0].url, 'https://account.test/access-check?product_key=ads');
  assert.deepEqual(calls[0].init?.headers, { Authorization: 'Bearer token-123' });
  assert.equal(result.workspace_id, 'workspace-1');
});

test('mapAccessDecisionToContext requires allowed workspace access', () => {
  const context = mapAccessDecisionToContext({
    allowed: true,
    workspace_id: 'workspace-1',
    workspace_role: 'owner',
    product_key: 'ads',
    product_role: 'admin',
    status: 'active',
    plan: 'internal',
    limits: { clients: 50 },
    reason: 'active_entitlement',
  }, {
    clerkUserId: 'clerk-1',
    email: 'user@prymeira.test',
    name: 'User Test',
  });

  assert.equal(context.workspaceId, 'workspace-1');
  assert.equal(context.productKey, 'ads');
  assert.deepEqual(context.limits, { clients: 50 });
});

test('buildAccessDeniedUrl preserves product, reason, and return URL', () => {
  const url = buildAccessDeniedUrl({
    hubUrl: 'https://app.prymeiradigital.com.br/',
    productKey: 'ads',
    reason: 'no_entitlement',
    returnUrl: 'https://ads.prymeiradigital.com.br/clientes',
  });

  assert.equal(
    url,
    'https://app.prymeiradigital.com.br/acesso-negado?product_key=ads&reason=no_entitlement&return_url=https%3A%2F%2Fads.prymeiradigital.com.br%2Fclientes'
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --import tsx --test tests/prymeiraAccount.test.ts
```

Expected: FAIL because `services/prymeiraAccount.ts` does not exist.

- [ ] **Step 3: Implement `services/prymeiraAccount.ts`**

Create `services/prymeiraAccount.ts`:

```ts
export type PrymeiraAccessReason =
  | 'no_customer'
  | 'no_workspace'
  | 'no_workspace_membership'
  | 'workspace_suspended'
  | 'no_product'
  | 'inactive_product'
  | 'no_entitlement'
  | 'no_product_seat'
  | 'seats_limit_reached'
  | 'expired'
  | 'blocked'
  | 'cancelled'
  | 'trial_expired'
  | 'active_entitlement'
  | 'internal_access';

export type PrymeiraAccessDecision = {
  allowed: boolean;
  workspace_id?: string;
  workspace_role?: string;
  product_key: string;
  product_role?: string;
  status: string;
  plan?: string;
  source?: string;
  seats_limit?: number;
  limits?: Record<string, unknown>;
  reason: PrymeiraAccessReason;
  upgrade_url?: string;
};

export type PrymeiraWorkspaceContext = {
  clerkUserId: string;
  email: string;
  name: string | null;
  workspaceId: string;
  workspaceRole: string;
  productKey: string;
  productRole: string | null;
  plan: string | null;
  limits: Record<string, unknown>;
};

type CheckAccessInput = {
  accountApiUrl: string;
  productKey: string;
  token: string;
  fetcher?: typeof fetch;
};

export async function checkPrymeiraProductAccess(input: CheckAccessInput): Promise<PrymeiraAccessDecision> {
  const fetcher = input.fetcher ?? fetch;
  const baseUrl = input.accountApiUrl.replace(/\/$/, '');
  const response = await fetcher(`${baseUrl}/access-check?product_key=${encodeURIComponent(input.productKey)}`, {
    headers: { Authorization: `Bearer ${input.token}` },
  });

  const json = await response.json().catch(() => null) as PrymeiraAccessDecision | { error?: { message?: string } } | null;

  if (!response.ok) {
    const message = json && 'error' in json ? json.error?.message : null;
    throw new Error(message || `Prymeira Account API request failed with ${response.status}`);
  }

  if (!json || !('allowed' in json)) {
    throw new Error('Prymeira Account API returned an invalid access decision');
  }

  return json;
}

export function mapAccessDecisionToContext(
  decision: PrymeiraAccessDecision,
  user: { clerkUserId: string; email: string; name: string | null },
): PrymeiraWorkspaceContext {
  if (!decision.allowed) {
    throw new Error(`Prymeira access denied: ${decision.reason}`);
  }

  if (!decision.workspace_id || !decision.workspace_role) {
    throw new Error('Prymeira access decision is missing workspace context');
  }

  return {
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
    workspaceId: decision.workspace_id,
    workspaceRole: decision.workspace_role,
    productKey: decision.product_key,
    productRole: decision.product_role || null,
    plan: decision.plan || null,
    limits: decision.limits || {},
  };
}

export function buildAccessDeniedUrl(input: {
  hubUrl: string;
  productKey: string;
  reason: string;
  returnUrl: string;
}): string {
  const url = new URL('/acesso-negado', input.hubUrl.replace(/\/$/, ''));
  url.searchParams.set('product_key', input.productKey);
  url.searchParams.set('reason', input.reason);
  url.searchParams.set('return_url', input.returnUrl);
  return url.toString();
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
node --import tsx --test tests/prymeiraAccount.test.ts
```

Expected: PASS.

## Task 3: Clerk Provider And Prymeira Auth Context

**Files:**
- Create: `contexts/PrymeiraAuthContext.tsx`
- Create: `components/Auth/PrymeiraLoginPage.tsx`
- Create: `components/Auth/PrymeiraAccessState.tsx`
- Modify: `index.tsx`

- [ ] **Step 1: Create branded auth state components**

Create `components/Auth/PrymeiraAccessState.tsx`:

```tsx
import React from 'react';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export function PrymeiraLoadingState({ label = 'Verificando acesso Prymeira' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-300 mx-auto mb-4" />
        <p className="text-sm text-stone-300">{label}</p>
      </div>
    </div>
  );
}

export function PrymeiraConfigError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center p-4">
      <div className="max-w-md rounded-xl border border-amber-300/20 bg-stone-950 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-300 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white mb-2">Configuração necessária</h1>
        <p className="text-sm text-stone-400">{message}</p>
      </div>
    </div>
  );
}

export function PrymeiraRedirectingState() {
  return (
    <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center p-4">
      <div className="text-center">
        <ShieldCheck className="w-9 h-9 text-amber-300 mx-auto mb-4" />
        <p className="text-sm text-stone-300">Redirecionando para a Prymeira Account</p>
      </div>
    </div>
  );
}
```

Create `components/Auth/PrymeiraLoginPage.tsx`:

```tsx
import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { BarChart3 } from 'lucide-react';

export function PrymeiraLoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a09] grid lg:grid-cols-[52fr_48fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10 bg-[radial-gradient(circle_at_25%_20%,rgba(245,158,11,0.22),transparent_34%),#0a0a09]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-amber-300/30 bg-amber-300/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="text-white font-semibold">Ads Vision</div>
            <div className="text-xs text-stone-500">Prymeira Digital</div>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-300 mb-4">Prymeira Account</p>
          <h1 className="text-5xl font-semibold text-white leading-tight">Relatórios de mídia conectados ao seu workspace.</h1>
          <p className="text-base text-stone-400 mt-5 max-w-lg">
            Entre com sua conta Prymeira para acessar clientes, contas de anúncio, automações e inteligência do Ads Vision.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-lg">
          {['Meta Ads', 'Google Ads', 'Relatórios'].map((label) => (
            <div key={label} className="h-16 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="h-1.5 w-12 rounded-full bg-amber-300/70 mb-3" />
              <div className="text-xs text-stone-400">{label}</div>
            </div>
          ))}
        </div>
      </section>
      <main className="flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex w-11 h-11 rounded-xl border border-amber-300/30 bg-amber-300/10 items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-amber-300" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Ads Vision</h1>
          </div>
          <SignIn
            routing="hash"
            appearance={{
              variables: {
                colorPrimary: '#f59e0b',
                colorBackground: '#11110f',
                colorText: '#f8fafc',
                colorTextSecondary: '#a8a29e',
                borderRadius: '8px',
              },
            }}
          />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create Prymeira auth context**

Create `contexts/PrymeiraAuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ClerkProvider, SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react';
import {
  buildAccessDeniedUrl,
  checkPrymeiraProductAccess,
  mapAccessDecisionToContext,
  type PrymeiraAccessDecision,
  type PrymeiraWorkspaceContext,
} from '../services/prymeiraAccount';
import { PrymeiraConfigError, PrymeiraLoadingState, PrymeiraRedirectingState } from '../components/Auth/PrymeiraAccessState';
import { PrymeiraLoginPage } from '../components/Auth/PrymeiraLoginPage';

type PrymeiraAuthValue = {
  user: PrymeiraWorkspaceContext | null;
  decision: PrymeiraAccessDecision | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
};

const PrymeiraAuthContext = createContext<PrymeiraAuthValue | undefined>(undefined);

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const accountApiUrl = import.meta.env.VITE_PRYMEIRA_ACCOUNT_API_URL as string | undefined;
const hubUrl = (import.meta.env.VITE_PRYMEIRA_HUB_URL as string | undefined) || 'https://app.prymeiradigital.com.br';
const productKey = (import.meta.env.VITE_PRYMEIRA_PRODUCT_KEY as string | undefined) || 'ads';

export function PrymeiraAuthProvider({ children }: { children: React.ReactNode }) {
  if (!clerkKey) {
    return <PrymeiraConfigError message="Configure VITE_CLERK_PUBLISHABLE_KEY para habilitar o login Prymeira." />;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <SignedOut>
        <PrymeiraLoginPage />
      </SignedOut>
      <SignedIn>
        <PrymeiraAccessGate>{children}</PrymeiraAccessGate>
      </SignedIn>
    </ClerkProvider>
  );
}

function PrymeiraAccessGate({ children }: { children: React.ReactNode }) {
  const { getToken, signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const [state, setState] = useState<{
    loading: boolean;
    context: PrymeiraWorkspaceContext | null;
    decision: PrymeiraAccessDecision | null;
    error: string | null;
    redirecting: boolean;
  }>({ loading: true, context: null, decision: null, error: null, redirecting: false });

  useEffect(() => {
    let active = true;

    async function verifyAccess() {
      if (!accountApiUrl) {
        setState({ loading: false, context: null, decision: null, error: 'Configure VITE_PRYMEIRA_ACCOUNT_API_URL.', redirecting: false });
        return;
      }

      if (!isLoaded || !user) return;

      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const token = await getToken();
        const email = user.primaryEmailAddress?.emailAddress;

        if (!token) throw new Error('Sessão Clerk sem token.');
        if (!email) throw new Error('Perfil Clerk sem email principal.');

        const decision = await checkPrymeiraProductAccess({ accountApiUrl, productKey, token });

        if (!active) return;

        if (!decision.allowed) {
          const redirectUrl = buildAccessDeniedUrl({
            hubUrl,
            productKey,
            reason: decision.reason || 'no_entitlement',
            returnUrl: window.location.href,
          });
          setState({ loading: false, context: null, decision, error: null, redirecting: true });
          window.location.assign(redirectUrl);
          return;
        }

        const context = mapAccessDecisionToContext(decision, {
          clerkUserId: user.id,
          email,
          name: user.fullName || user.firstName || null,
        });

        setState({ loading: false, context, decision, error: null, redirecting: false });
      } catch (error) {
        if (!active) return;
        setState({
          loading: false,
          context: null,
          decision: null,
          error: error instanceof Error ? error.message : String(error),
          redirecting: false,
        });
      }
    }

    verifyAccess();

    return () => {
      active = false;
    };
  }, [getToken, isLoaded, user]);

  const value = useMemo<PrymeiraAuthValue>(() => ({
    user: state.context,
    decision: state.decision,
    loading: state.loading,
    isAuthenticated: Boolean(state.context),
    signOut: async () => {
      await signOut();
    },
  }), [signOut, state.context, state.decision, state.loading]);

  if (state.redirecting) return <PrymeiraRedirectingState />;
  if (state.loading) return <PrymeiraLoadingState />;
  if (state.error) return <PrymeiraConfigError message={state.error} />;
  if (!state.context) return <PrymeiraConfigError message="A Prymeira Account não retornou um workspace válido para Ads Vision." />;

  return (
    <PrymeiraAuthContext.Provider value={value}>
      {children}
    </PrymeiraAuthContext.Provider>
  );
}

export function usePrymeiraAuth() {
  const context = useContext(PrymeiraAuthContext);
  if (!context) {
    throw new Error('usePrymeiraAuth deve ser usado dentro de PrymeiraAuthProvider');
  }
  return context;
}
```

- [ ] **Step 3: Wrap the app in `PrymeiraAuthProvider`**

Modify `index.tsx` to:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PrymeiraAuthProvider } from './contexts/PrymeiraAuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PrymeiraAuthProvider>
      <App />
    </PrymeiraAuthProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: Verify type errors identify remaining Supabase Auth usage**

Run:

```bash
npm run build
```

Expected: FAIL if `App.tsx` still imports or uses `AuthProvider/useAuth`. This failure is expected before Task 4.

## Task 4: Replace App Auth Consumption

**Files:**
- Modify: `App.tsx`
- Modify: `hooks/useSupabase.ts`

- [ ] **Step 1: Replace auth imports in `App.tsx`**

Remove:

```ts
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './components/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
```

Add:

```ts
import { usePrymeiraAuth } from './contexts/PrymeiraAuthContext';
```

- [ ] **Step 2: Replace auth state in `AppContent`**

Change:

```ts
const { user: authUser, isAuthenticated, loading: authLoading, signOut, isConfigured: authConfigured } = useAuth();
```

to:

```ts
const { user: authUser, isAuthenticated, loading: authLoading, signOut } = usePrymeiraAuth();
```

Delete:

```ts
type AuthViewType = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';
const [authView, setAuthView] = useState<AuthViewType>('LOGIN');
```

- [ ] **Step 3: Adapt user metadata reads**

Replace all `authUser.email` with `authUser.email`.

Replace:

```ts
authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário'
```

with:

```ts
authUser.name || authUser.email.split('@')[0] || 'Usuário'
```

Replace:

```ts
id: authUser.id,
```

with:

```ts
id: authUser.clerkUserId,
```

Add workspace metadata where `AgencyUser` is constructed if the type supports extra fields. If it does not, keep `AgencyUser` unchanged and use `authUser.workspaceId` only in data service calls.

- [ ] **Step 4: Remove in-app Supabase Auth screens**

Delete the entire block in `App.tsx` that starts with:

```ts
// Se Supabase Auth está configurado, usar autenticação do Supabase
if (authConfigured) {
```

and ends before the fallback authenticated shell rendering.

Keep the `authLoading` spinner block. Clerk signed-out rendering is handled by `PrymeiraAuthProvider`, so `AppContent` only handles authenticated product UI.

- [ ] **Step 5: Keep `useSupabase` from blocking auth migration**

In `hooks/useSupabase.ts`, leave existing data loading in place for legacy reads, but stop treating Supabase auth as the product auth source. If `getFacebookConnection()` fails because Supabase has no session, return no connection without throwing.

Use this catch branch inside `loadData`:

```ts
} catch (err: any) {
  console.warn('Dados legados Supabase indisponíveis:', err?.message || err);
  setFacebookConnection(null);
  setClients([]);
  setError(null);
} finally {
  setIsLoading(false);
}
```

- [ ] **Step 6: Verify the app typechecks**

Run:

```bash
npm run build
```

Expected: PASS for TypeScript and Vite build. If build fails on missing Clerk env at runtime, set `VITE_CLERK_PUBLISHABLE_KEY` locally before running Vite; build itself should not need a live Clerk session.

## Task 5: Postgres Workspace Schema Migration

**Files:**
- Create: `postgres/migrations/20260603_prymeira_workspace_multitenancy.sql`

- [ ] **Step 1: Create migration directory and SQL**

Create `postgres/migrations/20260603_prymeira_workspace_multitenancy.sql`:

```sql
create extension if not exists pgcrypto;

alter table if exists public.facebook_connections
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_connections
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_platform_accounts
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_platform_campaigns
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.ad_insights_snapshots
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.agency_clients
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.agency_client_accounts
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_report_settings
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_report_runs
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_portals
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_ai_profiles
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.client_ai_analyses
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.agency_ai_briefings
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.agency_config
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

alter table if exists public.user_settings
  add column if not exists workspace_id uuid,
  add column if not exists clerk_user_id text;

create index if not exists idx_ad_connections_workspace_platform
  on public.ad_connections(workspace_id, platform);

create index if not exists idx_ad_platform_accounts_workspace_platform
  on public.ad_platform_accounts(workspace_id, platform);

create index if not exists idx_ad_platform_campaigns_workspace_account
  on public.ad_platform_campaigns(workspace_id, account_id);

create index if not exists idx_ad_insights_snapshots_workspace_dates
  on public.ad_insights_snapshots(workspace_id, date_start, date_end);

create index if not exists idx_agency_clients_workspace
  on public.agency_clients(workspace_id);

create index if not exists idx_client_report_runs_workspace_client
  on public.client_report_runs(workspace_id, client_id, created_at desc);

create index if not exists idx_client_portals_workspace_slug
  on public.client_portals(workspace_id, slug);
```

- [ ] **Step 2: Run migration against local Postgres**

Run:

```bash
psql "$DATABASE_URL" -f postgres/migrations/20260603_prymeira_workspace_multitenancy.sql
```

Expected: `ALTER TABLE` and `CREATE INDEX` messages, no errors.

- [ ] **Step 3: Verify workspace columns exist**

Run:

```bash
psql "$DATABASE_URL" -c "select table_name, column_name from information_schema.columns where table_schema = 'public' and column_name = 'workspace_id' order by table_name;"
```

Expected: rows for Nexus-owned tables listed in Step 1.

## Task 6: Server Prymeira Access And Postgres Helpers

**Files:**
- Create: `server/prymeiraAccess.ts`
- Create: `server/postgres.ts`
- Create: `tests/prymeiraAccess.test.ts`

- [ ] **Step 1: Write server access tests**

Create `tests/prymeiraAccess.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePrymeiraWorkspaceFromAuthorization } from '../server/prymeiraAccess';

test('resolvePrymeiraWorkspaceFromAuthorization rejects missing bearer token', async () => {
  await assert.rejects(
    () => resolvePrymeiraWorkspaceFromAuthorization({
      authorization: undefined,
      accountApiUrl: 'https://account.test',
      productKey: 'ads',
      fetcher: fetch,
    }),
    /Bearer token is required/
  );
});

test('resolvePrymeiraWorkspaceFromAuthorization returns workspace from Account API', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({
    allowed: true,
    workspace_id: 'workspace-1',
    workspace_role: 'owner',
    product_key: 'ads',
    product_role: 'admin',
    status: 'active',
    plan: 'internal',
    limits: {},
    reason: 'active_entitlement',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const context = await resolvePrymeiraWorkspaceFromAuthorization({
    authorization: 'Bearer token-123',
    accountApiUrl: 'https://account.test',
    productKey: 'ads',
    fetcher,
  });

  assert.equal(context.workspaceId, 'workspace-1');
  assert.equal(context.token, 'token-123');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --import tsx --test tests/prymeiraAccess.test.ts
```

Expected: FAIL because `server/prymeiraAccess.ts` does not exist.

- [ ] **Step 3: Implement server access helper**

Create `server/prymeiraAccess.ts`:

```ts
import { checkPrymeiraProductAccess } from '../services/prymeiraAccount';

export type ServerWorkspaceContext = {
  token: string;
  workspaceId: string;
  workspaceRole: string;
  productRole: string | null;
  plan: string | null;
  limits: Record<string, unknown>;
};

export async function resolvePrymeiraWorkspaceFromAuthorization(input: {
  authorization: string | undefined;
  accountApiUrl: string;
  productKey: string;
  fetcher?: typeof fetch;
}): Promise<ServerWorkspaceContext> {
  const token = parseBearerToken(input.authorization);
  const decision = await checkPrymeiraProductAccess({
    accountApiUrl: input.accountApiUrl,
    productKey: input.productKey,
    token,
    fetcher: input.fetcher,
  });

  if (!decision.allowed) {
    throw Object.assign(new Error(`Prymeira product access denied: ${decision.reason}`), {
      statusCode: 403,
      reason: decision.reason,
    });
  }

  if (!decision.workspace_id || !decision.workspace_role) {
    throw Object.assign(new Error('Prymeira access decision missing workspace_id'), { statusCode: 403 });
  }

  return {
    token,
    workspaceId: decision.workspace_id,
    workspaceRole: decision.workspace_role,
    productRole: decision.product_role || null,
    plan: decision.plan || null,
    limits: decision.limits || {},
  };
}

function parseBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Bearer token is required'), { statusCode: 401 });
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw Object.assign(new Error('Bearer token is required'), { statusCode: 401 });
  }

  return token;
}
```

Create `server/postgres.ts`:

```ts
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPostgresPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurado');
  }

  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return pool;
}

export async function queryPostgres<T = unknown>(text: string, values: unknown[] = []) {
  const result = await getPostgresPool().query<T>(text, values);
  return result.rows;
}
```

- [ ] **Step 4: Verify server helper tests pass**

Run:

```bash
node --import tsx --test tests/prymeiraAccess.test.ts
```

Expected: PASS.

## Task 7: Mount Workspace API Routes

**Files:**
- Modify: `server.ts`
- Create: `services/nexusApi.ts`

- [ ] **Step 1: Add workspace access middleware in `server.ts`**

Near the imports in `server.ts`, add:

```ts
import { resolvePrymeiraWorkspaceFromAuthorization, type ServerWorkspaceContext } from './server/prymeiraAccess';
import { queryPostgres } from './server/postgres';
```

Add constants after app setup:

```ts
const PRYMEIRA_ACCOUNT_API_URL = process.env.PRYMEIRA_ACCOUNT_API_URL || process.env.VITE_PRYMEIRA_ACCOUNT_API_URL || 'http://localhost:3001';
const PRYMEIRA_PRODUCT_KEY = process.env.PRYMEIRA_PRODUCT_KEY || process.env.VITE_PRYMEIRA_PRODUCT_KEY || 'ads';
```

Add helper:

```ts
async function requireWorkspace(req: Request): Promise<ServerWorkspaceContext> {
  return resolvePrymeiraWorkspaceFromAuthorization({
    authorization: req.headers.authorization,
    accountApiUrl: PRYMEIRA_ACCOUNT_API_URL,
    productKey: PRYMEIRA_PRODUCT_KEY,
  });
}
```

- [ ] **Step 2: Add a workspace context endpoint**

Add this route in `server.ts`:

```ts
app.get('/api/workspace/me', async (req: Request, res: Response) => {
  try {
    const workspace = await requireWorkspace(req);
    res.json({ workspace });
  } catch (error) {
    const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
```

- [ ] **Step 3: Add initial workspace-scoped account endpoint**

Add this route in `server.ts`:

```ts
app.get('/api/workspace/platform-accounts', async (req: Request, res: Response) => {
  try {
    const workspace = await requireWorkspace(req);
    const accounts = await queryPostgres(`
      select id, platform, external_account_id, name, currency, timezone, status, is_active, metadata
      from public.ad_platform_accounts
      where workspace_id = $1
      order by name asc
    `, [workspace.workspaceId]);

    res.json({ data: accounts });
  } catch (error) {
    const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
```

- [ ] **Step 4: Create browser API client**

Create `services/nexusApi.ts`:

```ts
import type { PlatformAccount } from './platformTypes';

const API_BASE_URL = (import.meta.env.VITE_NEXUS_API_URL as string | undefined) || '';

export type NexusApiTokenProvider = () => Promise<string | null>;

let tokenProvider: NexusApiTokenProvider | null = null;

export function setNexusApiTokenProvider(provider: NexusApiTokenProvider) {
  tokenProvider = provider;
}

async function callNexusApi<T>(path: string): Promise<T> {
  const token = await tokenProvider?.();
  if (!token) throw new Error('Sessão Prymeira não disponível');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error(json && 'error' in json && json.error ? json.error : `Erro na API Nexus ${response.status}`);
  }

  return json as T;
}

export async function fetchWorkspacePlatformAccounts(): Promise<PlatformAccount[]> {
  const result = await callNexusApi<{ data: Array<{
    id: string;
    platform: PlatformAccount['platform'];
    external_account_id: string;
    name: string;
    currency: string | null;
    timezone: string | null;
    status: string | null;
    is_active: boolean | null;
    metadata: Record<string, unknown> | null;
  }> }>('/api/workspace/platform-accounts');

  return result.data.map((row) => ({
    id: row.id,
    platform: row.platform,
    externalAccountId: row.external_account_id,
    name: row.name,
    currency: row.currency || 'BRL',
    timezone: row.timezone || undefined,
    status: row.status || 'active',
    isConfigured: Boolean(row.is_active),
    selectedCampaignIds: [],
    metadata: row.metadata || {},
  }));
}
```

- [ ] **Step 5: Verify server build**

Run:

```bash
npm run build:server
```

Expected: PASS.

## Task 8: Connect Frontend Token Provider And First Postgres Read

**Files:**
- Modify: `contexts/PrymeiraAuthContext.tsx`
- Modify: `services/platformApi.ts`

- [ ] **Step 1: Register Nexus API token provider**

In `contexts/PrymeiraAuthContext.tsx`, import:

```ts
import { setNexusApiTokenProvider } from '../services/nexusApi';
```

Inside `PrymeiraAccessGate`, add:

```ts
useEffect(() => {
  setNexusApiTokenProvider(getToken);
}, [getToken]);
```

- [ ] **Step 2: Prefer Postgres API for platform accounts**

In `services/platformApi.ts`, import:

```ts
import { fetchWorkspacePlatformAccounts } from './nexusApi';
```

At the start of `fetchPlatformAccounts`, add:

```ts
if (import.meta.env.VITE_PRYMEIRA_AUTH_ENABLED === 'true') {
  return fetchWorkspacePlatformAccounts();
}
```

- [ ] **Step 3: Add env flag to `.env.example`**

Add:

```text
VITE_PRYMEIRA_AUTH_ENABLED="true"
VITE_NEXUS_API_URL="http://localhost:3001"
```

- [ ] **Step 4: Verify frontend build**

Run:

```bash
npm run build
```

Expected: PASS.

## Task 9: Workspace-Scoped Writes For OAuth Connections

**Files:**
- Modify: `server.ts`
- Modify: `postgres/migrations/20260603_prymeira_workspace_multitenancy.sql`

- [ ] **Step 1: Add unique workspace constraints to migration**

Append:

```sql
create unique index if not exists idx_ad_connections_workspace_platform_unique
  on public.ad_connections(workspace_id, platform)
  where workspace_id is not null;

create unique index if not exists idx_ad_platform_accounts_workspace_platform_external_unique
  on public.ad_platform_accounts(workspace_id, platform, external_account_id)
  where workspace_id is not null;
```

- [ ] **Step 2: Add workspace-scoped connection upsert helper in `server.ts`**

Add:

```ts
async function upsertWorkspaceConnection(input: {
  workspaceId: string;
  clerkUserId: string | null;
  platform: 'meta' | 'google';
  externalUserId: string | null;
  externalUserName: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
}) {
  const rows = await queryPostgres<{ id: string }>(`
    insert into public.ad_connections (
      workspace_id, clerk_user_id, platform, external_user_id, external_user_name,
      access_token, refresh_token, token_expires_at, status, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, 'active', now())
    on conflict (workspace_id, platform)
    where workspace_id is not null
    do update set
      clerk_user_id = excluded.clerk_user_id,
      external_user_id = excluded.external_user_id,
      external_user_name = excluded.external_user_name,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      status = 'active',
      updated_at = now()
    returning id
  `, [
    input.workspaceId,
    input.clerkUserId,
    input.platform,
    input.externalUserId,
    input.externalUserName,
    input.accessToken,
    input.refreshToken,
    input.tokenExpiresAt,
  ]);

  return rows[0]?.id;
}
```

- [ ] **Step 3: Add a workspace-scoped connection save route**

Add this route to `server.ts`. It gives the frontend and future OAuth callbacks a concrete Postgres write path that is scoped by the Clerk token and Prymeira Account workspace:

```ts
app.post('/api/workspace/ad-connections', async (req: Request, res: Response) => {
  try {
    const workspace = await requireWorkspace(req);
    const body = req.body as {
      platform?: 'meta' | 'google';
      externalUserId?: string | null;
      externalUserName?: string | null;
      accessToken?: string | null;
      refreshToken?: string | null;
      tokenExpiresAt?: string | null;
    };

    if (body.platform !== 'meta' && body.platform !== 'google') {
      res.status(400).json({ error: 'platform deve ser meta ou google' });
      return;
    }

    const connectionId = await upsertWorkspaceConnection({
      workspaceId: workspace.workspaceId,
      clerkUserId: null,
      platform: body.platform,
      externalUserId: body.externalUserId || null,
      externalUserName: body.externalUserName || null,
      accessToken: body.accessToken || null,
      refreshToken: body.refreshToken || null,
      tokenExpiresAt: body.tokenExpiresAt || null,
    });

    res.json({ ok: true, workspace_id: workspace.workspaceId, connection_id: connectionId });
  } catch (error) {
    const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
```

- [ ] **Step 4: Add a client function for workspace-scoped connection saves**

In `services/nexusApi.ts`, add:

```ts
export async function saveWorkspaceAdConnection(input: {
  platform: 'meta' | 'google';
  externalUserId?: string | null;
  externalUserName?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
}): Promise<{ ok: true; workspace_id: string; connection_id: string | undefined }> {
  const token = await tokenProvider?.();
  if (!token) throw new Error('Sessão Prymeira não disponível');

  const response = await fetch(`${API_BASE_URL}/api/workspace/ad-connections`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const json = await response.json().catch(() => null) as { ok?: true; workspace_id?: string; connection_id?: string; error?: string } | null;
  if (!response.ok || !json?.ok || !json.workspace_id) {
    throw new Error(json?.error || `Erro ao salvar conexão ${response.status}`);
  }

  return {
    ok: true,
    workspace_id: json.workspace_id,
    connection_id: json.connection_id,
  };
}
```

- [ ] **Step 5: Verify server build**

Run:

```bash
npm run build:server
```

Expected: PASS.

## Task 10: Final Verification

**Files:**
- All modified implementation files.

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run server build**

Run:

```bash
npm run build:server
```

Expected: PASS.

- [ ] **Step 4: Start app locally**

Run:

```bash
npm run dev:all
```

Expected:

```text
Vite reports a local URL and the Express server reports its listening port.
```

- [ ] **Step 5: Browser smoke test**

Open:

```text
http://localhost:5173
```

Expected:

- Signed-out users see Clerk/Prymeira login.
- Signed-in users trigger `GET /access-check?product_key=ads`.
- Denied users redirect to Hub access-denied route.
- Allowed users see Nexus UI.
- Platform account loading calls `/api/workspace/platform-accounts` when `VITE_PRYMEIRA_AUTH_ENABLED=true`.

- [ ] **Step 6: Database tenant check**

Run:

```bash
psql "$DATABASE_URL" -c "select workspace_id, platform, count(*) from public.ad_platform_accounts group by workspace_id, platform order by workspace_id, platform;"
```

Expected: account rows are grouped by `workspace_id`; no new code path writes tenant data using Supabase `auth.uid()` as the primary tenant key.
