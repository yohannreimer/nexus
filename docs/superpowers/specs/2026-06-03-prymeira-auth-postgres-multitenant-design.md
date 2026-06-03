# Prymeira Auth + Postgres Multitenant Design

## Goal

Replace the Nexus AI/SaaS authentication boundary with the standard Prymeira product authentication pattern and make the app multitenant through the Prymeira Account workspace contract.

Nexus will identify itself to Prymeira Account as:

```text
product_key=ads
```

The app must only load product data after the signed-in Clerk user has an active Prymeira Account access decision for `ads`.

## Current State

The current Nexus app uses Supabase Auth in `contexts/AuthContext.tsx`, Supabase client-side queries, and Supabase Edge Functions. Most data tables and client helpers isolate data by `user_id`, with RLS policies based on `auth.uid()`.

Prymeira Account uses a different standard:

- Clerk authenticates users.
- Prymeira Account API authorizes product access with `GET /access-check?product_key=X`.
- The authorization response carries the active `workspace_id`, `workspace_role`, `product_role`, plan, and limits.
- Product apps use `workspace_id` as the tenant boundary.

## Chosen Approach

Use Clerk plus Prymeira Account in the Nexus frontend, then persist Nexus product data in Postgres using `workspace_id` as the primary tenant key.

This avoids treating Supabase Auth as a second identity source and aligns Nexus with the rest of the Prymeira ecosystem. Supabase may remain temporarily for legacy Edge Function code during migration, but it is no longer the source of product authentication or tenant identity.

## Authentication Flow

1. User opens Nexus.
2. Clerk loads the current session.
3. If signed out, Nexus shows the Prymeira-style Clerk login surface.
4. If signed in, Nexus obtains a Clerk token.
5. Nexus calls Prymeira Account:

```http
GET /access-check?product_key=ads
Authorization: Bearer <clerk_token>
```

6. If `allowed=false`, Nexus redirects to the Hub access-denied route:

```text
{VITE_PRYMEIRA_HUB_URL}/acesso-negado?product_key=ads&reason={reason}&return_url={current_url}
```

7. If `allowed=true`, Nexus stores an in-memory auth context with:

```ts
{
  clerkUserId: string;
  email: string;
  name: string | null;
  workspaceId: string;
  workspaceRole: string;
  productRole: string | null;
  plan: string | null;
  limits: Record<string, unknown>;
}
```

8. All product data loads with the active `workspaceId`.

## Required Environment Variables

```text
VITE_CLERK_PUBLISHABLE_KEY=
VITE_PRYMEIRA_ACCOUNT_API_URL=
VITE_PRYMEIRA_HUB_URL=
VITE_PRYMEIRA_PRODUCT_KEY=ads
DATABASE_URL=
```

`DATABASE_URL` is server-side only and must not be exposed through Vite.

## Frontend Components

### Prymeira Auth Runtime

Create a new Prymeira auth layer that replaces the app's Supabase Auth boundary.

Primary responsibilities:

- Wrap the app in `ClerkProvider`.
- Expose signed-in user data.
- Call Prymeira Account access-check for `ads`.
- Expose `workspaceId` and product authorization metadata.
- Handle loading, signed-out, denied, and allowed states.

### Login Experience

Use the standard Prymeira login pattern:

- Clerk form remains the authentication UI.
- Login screen is branded for Nexus/Ads Vision.
- Auth should remain functional even if the Account API is temporarily unavailable; in that case, the app shows an access verification error and does not load tenant data.

### Access Denied

Denied users are redirected to the Hub access-denied page. A small local fallback state may be shown while redirecting.

## Postgres Multitenancy

Nexus product data should be keyed by `workspace_id`.

For each Nexus-owned table, add or migrate to:

```sql
workspace_id uuid not null;
clerk_user_id text;
```

`workspace_id` is the tenant boundary. `clerk_user_id` is used for audit and ownership attribution inside a workspace, not for tenant isolation.

Tables that currently use `user_id` as their tenant key should be updated to query by `workspace_id`. Existing `user_id` columns can be retained temporarily during migration to avoid destructive changes, but new code should not depend on Supabase Auth user IDs.

Target table families:

- Ad connections: Meta and Google OAuth tokens.
- Ad platform accounts and campaigns.
- Insight snapshots.
- Agency clients and client account links.
- Report settings and report runs.
- Client portals.
- AI profiles, analyses, and agency briefings.
- Agency configuration and user settings.

## Data Access

Move Nexus app data access toward a Postgres-backed API layer.

Implementation can start with a small server module that:

- Verifies the Clerk token.
- Calls Prymeira Account access-check for `ads`.
- Derives the active `workspace_id`.
- Runs Postgres queries scoped to that `workspace_id`.

Client code must not choose arbitrary workspace IDs. The server derives workspace context from the verified Clerk token and Account API response.

## OAuth Connections

Meta and Google OAuth connections become workspace-scoped:

- OAuth state stores the active `workspace_id`.
- Token records are saved by `workspace_id` and platform.
- Platform accounts are unique by `workspace_id`, platform, and external account id.
- Multiple users in the same workspace can operate on the same connected accounts according to their Prymeira Account role.

## Error Handling

The app distinguishes:

- Signed out: show Clerk sign-in.
- Missing Clerk key: show configuration error.
- Account API unavailable: show access verification error.
- Access denied: redirect to Hub with reason.
- Missing workspace in allowed response: block loading and show configuration error.
- Postgres/API failure: keep the authenticated shell visible and show scoped data-loading errors.

## Testing

Unit tests should cover:

- Access-check request building for `product_key=ads`.
- Allowed access mapping into auth context.
- Denied access redirect URL construction.
- Missing token and Account API error states.
- Data query helpers using `workspace_id`.

Integration checks should cover:

- Signed-out renders login.
- Signed-in but denied redirects to Hub.
- Signed-in and allowed loads Nexus views with workspace context.
- OAuth connection save uses `workspace_id`.

## Migration Notes

This project directory is not currently a git repository, so this spec cannot be committed from this workspace.

The migration should be incremental:

1. Add Prymeira auth and access gate.
2. Add workspace-aware Postgres schema/migrations.
3. Move read/write helpers from Supabase Auth `user_id` to server-derived `workspace_id`.
4. Move OAuth callbacks and Edge Function behavior to workspace-scoped persistence.
5. Remove Supabase Auth UI and stale Supabase-only tenant assumptions.

