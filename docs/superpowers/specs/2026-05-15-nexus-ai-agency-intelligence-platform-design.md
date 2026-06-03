# Nexus AI Agency Intelligence Platform Design

## Context

Nexus AI is evolving from a functional reporting app into an agency intelligence platform. The current product already has important working flows:

- client workspace and client detail pages;
- linked Meta/Google ad accounts;
- analysis, charts and report simulation;
- automation settings per client;
- manual webhook sending through Supabase Edge Function `send-webhook`;
- N8N as the WhatsApp delivery layer;
- initial database model with `agency_clients`, `agency_client_accounts`, `client_report_settings` and `client_report_runs`.

This design must preserve the current product. The new product direction adds optional layers for AI, client portals, automated history, portfolio health and agency-level intelligence. Existing screens should not be replaced or reworked unless needed to connect the new layers.

## Product Principle

The product remains usable exactly as it is today. Agencies can keep using the current client, account, analysis, chart, simulation and automation flows.

The new vision is additive:

- add an `IA Analista` tab inside each client;
- add a `Portal do Cliente` tab inside each client;
- add a global `Centro IA` area for agency operations;
- replace the old scheduled report engine with a new one based on the current client workspace model;
- keep N8N as the delivery mechanism;
- keep the client-facing report deterministic by default;
- use AI for internal agency intelligence, not as a required dependency for client report delivery.

## Target Buyer And Value

The primary buyer is a Brazilian agency or traffic management team. The final client receives value through reports and portal access, but the agency pays for the product.

The core value for the agency is:

- reduce manual reporting work;
- make the agency look more professional;
- prove that work was done;
- reduce client questions about performance;
- identify clients needing attention before churn risk grows;
- provide smarter internal analysis without exposing raw or alarming diagnosis to the client.

The product should not position itself first as a generic Whatagraph alternative. The best positioning is:

> Nexus AI is the WhatsApp and AI reporting layer for agencies that want to show daily/monthly follow-up without spending hours creating reports.

## Navigation And Product Surfaces

### Existing Surfaces To Preserve

The following product areas remain part of the current workflow:

- Clients;
- Client detail;
- Summary;
- Relatório Executivo;
- Análise Completa;
- Gráficos;
- Simulação;
- Contas Vinculadas;
- Automações;
- Contas de Anúncio;
- Integrações;
- Relatórios/Histórico;
- Configurações.

### New Client-Level Surfaces

Each client gets two new tabs:

1. `IA Analista`
2. `Portal do Cliente`

These tabs are optional layers. They should not crowd the existing analysis, charts or simulation flows. If the agency never uses these tabs, the current product still works.

### New Agency-Level Surface

Add a global `Centro IA` menu item for the agency.

This is not a replacement for the Clients screen. It is a morning briefing and operations view: which clients need attention, what failed, what improved and what deserves action.

## IA Analista

The `IA Analista` tab is a work surface for generating internal analysis and revisable text. It is not a new metric dashboard.

### Purpose

The agency uses this tab to understand a client's performance and prepare better communication. The outputs are primarily for the agency, not automatically for the client.

### Main Blocks

#### Resumo Executivo

Explains:

- what happened in the selected period;
- key changes;
- simple reading of performance;
- comparison to the previous period when data exists.

#### Diagnóstico

Includes:

- positives;
- attention points;
- probable causes;
- campaigns or platforms responsible for variation;
- internal risk level.

#### Plano Sugerido

Includes internal recommendations for the agency:

- pause, review or scale campaigns;
- reallocate budget;
- test creatives;
- check tracking;
- reconnect broken integrations;
- request client inputs;
- schedule a strategic meeting.

Recommendations must be agency-facing by default.

#### Ajuda De Comunicação

This is a revisable helper for the agency, not the source of truth for automatic report delivery. It may suggest:

- talking points;
- a short WhatsApp-style explanation;
- a softer wording for sensitive performance issues.

The automatic client report remains deterministic. AI-generated text must never be injected into client-facing delivery by default. If a future version allows AI text in client reports, that must be an explicit opt-in per client or per report run.

### Per-Client AI Profile

Each client may have an AI profile:

- objective: leads, sales, traffic, awareness, mixed;
- tone: direct, consultative, premium, informal;
- business rules: max CPL, budget, key metrics;
- exposure level: conservative, normal, detailed;
- AI enabled flag;
- briefing enabled flag.

### Chat With Data

Chat is a later layer. It should not be the first implementation dependency.

Future chat examples:

- "Why did performance drop this week?"
- "What should I tell this client?"
- "Which campaign needs attention?"
- "Which clients have churn risk?"

The initial AI feature should generate structured analysis documents and recommendations.

## Client-Facing Reports

Client-facing report delivery should stay deterministic by default.

Reasoning:

- lower cost;
- predictable wording;
- less risk of AI saying something wrong or alarming;
- easier auditability;
- the existing simulation/report message already works;
- client reports are mostly numbers and standard interpretation.

Client-facing outputs may include:

- deterministic WhatsApp message;
- deterministic PDF/HTML report;
- KPIs;
- platform/account/campaign summaries depending on portal mode;
- portal link;
- report archive.

AI is not required to send a report to the client. The initial implementation should not include AI text in automatic client messages.

## Portal Do Cliente

The portal is configured per client through a new `Portal do Cliente` tab.

It combines:

- a permanent client slug;
- archived report snapshots.

Example:

- `/portal/loja-exemplo`
- `/portal/loja-exemplo/reports/2026-05-15`

### Portal Modes

Each client can use one of three modes.

#### Essencial

For clients who do not want detail.

Shows:

- concise summary;
- few KPIs;
- next steps or agency note;
- report history if enabled.

Avoids:

- detailed campaign tables;
- too many graphs;
- technical terminology.

#### Executivo

Default mode.

Shows:

- main KPIs;
- comparison to previous period;
- deterministic report summary;
- simple chart;
- report history;
- optional agency note.

#### Completo

For mature clients.

Shows:

- KPIs;
- charts;
- platforms;
- campaigns;
- historical reports;
- PDFs/HTML snapshots;
- fuller analysis.

### Portal Settings

The agency can configure:

- slug;
- status: active or paused;
- mode: essential, executive, complete;
- logo;
- brand color;
- public agency name;
- modules visible;
- show or hide spend;
- show or hide campaigns;
- show or hide charts;
- show or hide historical reports;
- initial access model: private link;
- later access model: PIN/password.

The final client must not see:

- tokens;
- Business Manager details;
- API configuration;
- raw account linkage;
- integration debugging;
- internal AI alerts;
- internal recommendations unless explicitly enabled.

## Scheduled Reports Engine

The existing `scheduled-reports` function should be replaced by the new engine. It should not be deployed as a parallel V2 in the final product.

### Execution

Supabase should own scheduling through cron and Edge Functions.

The function should:

1. run on a recurring schedule;
2. read `client_report_settings`;
3. find settings with `delivery_enabled = true`;
4. evaluate whether each setting is due based on:
   - frequency;
   - weekly day;
   - monthly day;
   - send time;
   - timezone;
5. load `agency_clients`;
6. load active `agency_client_accounts`;
7. fetch Meta/Google data for linked accounts;
8. consolidate metrics;
9. generate deterministic report content;
10. create/update `client_report_runs`;
11. send a rich payload to N8N through webhook;
12. mark the run as `sent` or `failed`;
13. persist errors and webhook responses.

### N8N Role

N8N remains the delivery layer.

Nexus is the source of truth for:

- selected client;
- period;
- metrics;
- generated deterministic message;
- report run;
- portal link;
- send status;
- history.

N8N receives:

- phone;
- deterministic message;
- report metadata;
- metrics;
- portal link;
- report run id;
- source/version;
- optional PDF/HTML link;
- optional internal metadata for routing.

Example payload:

```json
{
  "source": "nexus-ai-scheduled",
  "version": "2",
  "reportRunId": "uuid",
  "phone": "5511999999999",
  "message": "deterministic client-facing message",
  "client": {
    "id": "uuid",
    "name": "Loja Exemplo"
  },
  "period": {
    "start": "2026-05-01",
    "end": "2026-05-15"
  },
  "metrics": {
    "spend": 1585.39,
    "clicks": 1921,
    "ctr": 2.72
  },
  "portalLink": "https://app.example.com/portal/loja-exemplo",
  "report": {
    "html": "...",
    "pdfUrl": null
  }
}
```

### Required Protections

The engine must support:

- idempotency per client, period, frequency and scheduled time;
- no duplicate sends;
- statuses: pending, processing, sent, failed;
- retry with a controlled max attempt count;
- clear error persistence;
- manual resend;
- safe fallback if one linked account fails;
- partial-data reporting when acceptable;
- no AI dependency for client-facing sends;
- no AI-generated client-facing text in automatic sends during the initial implementation.

## Centro IA

The `Centro IA` is a global agency operations view.

It aggregates client data and report history to answer:

- Which clients need attention today?
- Which reports failed?
- Which accounts are disconnected?
- Which clients are healthy?
- Which clients are at risk?
- Which clients could be upsold?
- Which clients deserve a proactive message?

### Main Sections

#### Briefing Da Manhã

Daily summary:

- number of clients healthy/attention/critical;
- reports failed;
- integrations broken;
- biggest drops;
- biggest improvements;
- recommended actions for the agency.

#### Saúde Da Carteira

Each client gets an internal status:

- healthy;
- attention;
- critical;
- no data;
- integration broken;
- automation off.

#### Alertas Internos

Alerts are deterministic where possible:

- spend without conversion;
- CPL above configured limit;
- CTR dropped;
- CPC rose;
- monthly budget pacing too fast;
- report not sent;
- account disconnected;
- token expired or expiring.

AI may summarize and prioritize alerts, but deterministic rules should generate the base alert set.

#### Oportunidades

Examples:

- client performance improving;
- budget increase opportunity;
- potential case study;
- potential upsell;
- client worth a strategy meeting.

#### Fila De Ações

Action queue:

- review client;
- resend report;
- reconnect integration;
- validate budget;
- generate AI analysis;
- contact client.

## Data Model

The design keeps current tables and adds focused tables.

### Existing Core Tables

- `agency_clients`
- `agency_client_accounts`
- `client_report_settings`
- `client_report_runs`
- `ad_platform_accounts`
- `ad_connections`
- `ad_insights_snapshots`

### Extend `client_report_settings`

Add or support:

- delivery frequency;
- weekly day;
- monthly day;
- timezone;
- default period;
- delivery target;
- webhook URL;
- report mode;
- client-facing report exposure level;
- internal AI enabled;
- briefing enabled;
- portal mode default;
- report template settings.

### Extend `client_report_runs`

This becomes the official report history.

Add or support:

- status: pending, processing, generated, sent, failed;
- execution type: manual or scheduled;
- idempotency key;
- period start/end;
- report mode;
- platforms included;
- linked account ids;
- metrics payload;
- deterministic message;
- report HTML snapshot;
- PDF URL when available;
- portal snapshot URL;
- webhook target;
- webhook response;
- error message;
- attempt count;
- scheduled for timestamp;
- sent at timestamp.

### New `client_portals`

Fields:

- id;
- user_id;
- client_id;
- slug;
- status;
- mode: essential, executive, complete;
- branding JSON;
- visibility settings JSON;
- access settings JSON;
- created_at;
- updated_at.

### New `client_ai_profiles`

Fields:

- id;
- user_id;
- client_id;
- objective;
- tone;
- business_rules JSON;
- important_metrics JSON;
- exposure_level;
- internal_ai_enabled;
- briefing_enabled;
- created_at;
- updated_at.

### New `client_ai_analyses`

Fields:

- id;
- user_id;
- client_id;
- report_run_id nullable;
- period_start;
- period_end;
- summary;
- positives JSON;
- attention_points JSON;
- internal_alerts JSON;
- recommendations JSON;
- talking_points JSON;
- risk_level;
- opportunity_level;
- raw_ai_payload JSON;
- provider;
- model;
- created_at.

### New `agency_ai_briefings`

Fields:

- id;
- user_id;
- briefing_date;
- portfolio_summary JSON;
- client_priorities JSON;
- alerts JSON;
- opportunities JSON;
- generated_text;
- provider;
- model;
- created_at.

## AI Provider Architecture

The product should not be locked to one AI provider.

Create an internal AI provider contract:

- input: structured metrics, client profile, period, report history;
- output: structured JSON with summary, positives, attention points, recommendations, talking points, risk and opportunity.

Provider strategy:

- start with Gemini because the project already has `generate-report`;
- design the internal contract so OpenAI can be added later;
- store provider and model on generated analyses;
- never make AI required for deterministic report delivery.

## Error Handling

### Scheduled Report Failures

Failures must be visible in report history and Centro IA.

Examples:

- no linked accounts;
- no data for period;
- Meta/Google API failure;
- webhook failure;
- N8N timeout;
- missing delivery target;
- invalid client settings;
- duplicate idempotency key.

### Partial Data

If one linked account fails but others succeed:

- the run can be marked as `sent_with_warnings` or `sent` with warnings in payload;
- warnings must be visible internally;
- client-facing message should avoid technical error details unless configured.

### AI Failures

If AI fails:

- deterministic report still sends;
- AI analysis is marked failed;
- Centro IA shows internal warning;
- retry can happen later.

## Security And Visibility

Portal public access must be designed carefully.

Initial portal access can use private unlisted links. Later iterations can add PIN/password.

Client-facing portal must not expose:

- auth user ids;
- tokens;
- external account raw data;
- webhook URL;
- AI raw prompts;
- agency-only recommendations;
- internal risk scoring.

All public portal queries should use safe public access rules or signed access tokens, not ordinary authenticated agency APIs.

## Implementation Phases

### Phase 1: New Report Engine And History

- Replace `scheduled-reports`.
- Use `client_report_settings`.
- Use linked accounts from the new workspace model.
- Generate deterministic message.
- Send to N8N.
- Save `client_report_runs`.
- Show reliable history.

### Phase 2: Client Portal

- Add `client_portals`.
- Add `Portal do Cliente` tab.
- Create slug.
- Add modes: Essencial, Executivo, Completo.
- Create public portal route.
- Archive report snapshots.

### Phase 3: IA Analista Per Client

- Add `client_ai_profiles`.
- Add `client_ai_analyses`.
- Add `IA Analista` tab.
- Generate internal analysis.
- Keep client report deterministic.

### Phase 4: Centro IA

- Add global area.
- Show morning briefing.
- Show portfolio health.
- Show internal alerts.
- Show opportunities.
- Show action queue.

### Phase 5: Chat With Data

- Add chat per client.
- Add global agency chat.
- Use report history and AI analyses as context.

### Phase 6: Commercial Product Layer

- plans and limits;
- billing;
- staff permissions;
- advanced white-label;
- audit logs;
- LGPD flows.

## Non-Goals For Initial Implementation

The complete spec includes the full product vision, but initial tasks should not try to implement everything.

Do not do these in Phase 1:

- public portal;
- chat with data;
- billing;
- staff roles;
- advanced PDF builder;
- replacing current analysis/charts/simulation screens;
- making AI mandatory for client report sending.

## Open Implementation Notes

- The existing `send-webhook` can continue supporting manual sends.
- The existing `scheduled-reports` function should be rewritten to the new model rather than kept as a separate final V2.
- Existing legacy tables can remain for compatibility during transition.
- New work should prefer current workspace tables over legacy `clients` and `ad_accounts`.
- The N8N webhook payload should be versioned.
- Report run id should be passed to N8N for traceability.
