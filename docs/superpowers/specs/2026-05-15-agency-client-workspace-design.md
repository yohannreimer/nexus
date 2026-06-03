# Agency Client Workspace Design

Date: 2026-05-15
Project: Nexus AI

## Goal

Transform Nexus AI from an account-first ads dashboard into an agency client workspace.

The main operating unit becomes a client. Each client groups one or more Meta Ads and Google Ads accounts, owns report settings, and supports unified executive and analytical reporting.

## Approved Product Direction

Use the robust client model.

- The main navigation opens on `Clientes`.
- Each client is a strong operational group for the agency.
- A client can have many Meta Ads and Google Ads accounts.
- An ad account can belong to only one active client.
- Accounts not linked to any client remain visible as available accounts.
- `Integrações` is only for connecting and reconnecting platforms.
- `Contas de Anúncio` remains as an operational inventory and audit screen.
- `Faturamento` should be removed from navigation or hidden until billing exists.

## Main Navigation

The proposed navigation:

- `Clientes`
- `Contas de Anúncio`
- `Relatórios`
- `Integrações`
- `Configurações`

## Client Workspace

Each client has internal tabs so the daily view stays clean.

- `Resumo`
- `Relatório Executivo`
- `Análise Completa`
- `Contas Vinculadas`
- `Automações`
- `Configurações`

### Resumo

Default client tab.

Shows only daily operational information:

- investment total
- conversions total
- linked accounts count
- next scheduled send
- client health
- important alerts

### Relatório Executivo

Client-facing report mode.

Should be simple, polished, and suitable for WhatsApp/PDF/export. It summarizes total performance across Meta and Google, then provides a short platform comparison and key recommendations.

### Análise Completa

Manager-facing technical view.

Internal subtabs:

- `Visão Geral`
- `Por Plataforma`
- `Por Conta`
- `Campanhas`
- `Gráficos`
- `Simulação`

`Gráficos` and `Simulação` replace the current loose account-level buttons. They belong inside the client analysis experience.

### Contas Vinculadas

Where the agency links or unlinks imported ad accounts to the client.

Rules:

- only available accounts can be linked directly
- if an account already belongs to another client, the UI must show which client owns it
- moving an account between clients requires explicit confirmation

### Automações

Controls report delivery behavior:

- send enabled/disabled
- send time
- report frequency
- default period
- webhook or WhatsApp target
- last run status

### Configurações

Client data and operational metadata:

- client name
- WhatsApp
- internal owner
- status
- notes
- optional segment/logo later

## Operational Screens

### Clientes

Primary screen.

Shows a list of clients with:

- name
- status
- linked Meta/Google count
- total spend
- next send
- automation health
- open client action

Empty state: prompt to create the first client.

### Contas de Anúncio

Inventory and audit screen.

Shows every imported account:

- platform
- account name
- account id
- status
- linked client
- last sync/update
- action to link or move account

This screen is for cleaning up account organization.

### Integrações

Connection-only screen.

Shows:

- Meta Ads connection status
- Google Ads connection status
- connect/reconnect actions
- token health
- last sync
- permission/API errors

### Relatórios

Historical report center.

Shows:

- report generated
- report sent
- report failed
- client
- period
- platforms included
- preview action

## Data Model

Add a robust client layer instead of overloading the current legacy `clients` table.

### agency_clients

Represents the agency client.

Suggested fields:

- `id`
- `user_id`
- `name`
- `status`
- `primary_whatsapp`
- `internal_owner`
- `notes`
- `metadata`
- `created_at`
- `updated_at`

### agency_client_accounts

Links ad accounts to clients.

Suggested fields:

- `id`
- `user_id`
- `client_id`
- `account_id`
- `platform`
- `is_active`
- `created_at`
- `updated_at`

Constraint:

- one active ad account can belong to only one active client

### client_report_settings

Stores report preferences for each client.

Suggested fields:

- `id`
- `user_id`
- `client_id`
- `default_period`
- `send_time`
- `timezone`
- `delivery_enabled`
- `delivery_target`
- `webhook_url`
- `default_report_mode`
- `created_at`
- `updated_at`

### client_report_runs

Stores report generation and delivery history.

Suggested fields:

- `id`
- `user_id`
- `client_id`
- `period_start`
- `period_end`
- `status`
- `report_mode`
- `platforms_included`
- `summary_payload`
- `error_message`
- `created_at`
- `sent_at`

### Existing Tables

Continue using:

- `ad_connections`
- `ad_platform_accounts`
- `ad_platform_campaigns`
- `ad_insights_snapshots`

The existing legacy `clients` table can be migrated gradually or kept as compatibility until the new workspace is stable.

## Unified Reporting Behavior

The unified report aggregates metrics from all accounts linked to the client.

Metrics:

- spend: sum
- impressions: sum
- clicks: sum
- conversions: sum
- CTR: weighted from total clicks/impressions
- CPC: weighted from spend/clicks
- CPM: weighted from spend/impressions
- ROAS: calculate only when conversion value exists

If a platform lacks a metric, the UI should show a clear neutral state rather than pretending the data exists.

## Error Handling

Important states:

- no integrations connected
- integration connected but no accounts imported
- accounts imported but not linked to clients
- client exists with no accounts
- linked account lost permission
- report has no data for selected period
- Google Ads developer token not approved

Each state should have a direct recovery action.

## Implementation Notes

The implementation should happen incrementally:

1. Add database tables and policies.
2. Add services for client workspaces and links.
3. Replace sidebar navigation with real views.
4. Build `Clientes` list.
5. Build client detail with internal tabs.
6. Move account linking into `Contas Vinculadas`.
7. Move current chart and simulation flows into `Análise Completa`.
8. Add `Integrações` as the connection-only screen.
9. Add report history.

## Non-Goals For First Implementation

- billing
- multi-user roles inside one agency
- client login portal
- editing ad campaigns
- writing back to Meta Ads or Google Ads
- advanced revenue attribution beyond existing available metrics

