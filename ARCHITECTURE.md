# 🏗️ Arquitetura Visual do Sistema

Este documento mostra visualmente como todos os componentes se conectam.

---

## 📊 Arquitetura Completa (Visão Geral)

```
┌────────────────────────────────────────────────────────────────────────┐
│                         NEXUS AI - SaaS PLATFORM                       │
└────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐                              ┌─────────────────┐
│   USUÁRIO       │                              │  META (Facebook)│
│   (Gestor)      │                              │   & WhatsApp    │
└────────┬────────┘                              └────────┬────────┘
         │                                                │
         │ 1. Acessa app                                 │ 2. OAuth
         │                                                │
         ▼                                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Login     │  │  Dashboard   │  │ ConnectModal │              │
│  │             │  │              │  │              │              │
│  │  - Botão    │  │ - Lista      │  │ - OAuth Flow │              │
│  │    Connect  │  │   Contas     │  │ - Seleção    │              │
│  │    FB       │  │ - Preview    │  │   Campanhas  │              │
│  └─────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  URL: http://localhost:5173 (dev) | https://app.nexusai.com (prod) │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ REST API
                             │ (Authorization: Bearer token)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js + TypeScript)                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ROTAS PRINCIPAIS                                             │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ GET  /api/auth-callback     → Recebe OAuth do Facebook      │  │
│  │ POST /api/refresh-token     → Renova token antes expirar    │  │
│  │ GET  /api/campaigns/:id     → Lista campanhas de uma conta  │  │
│  │ POST /api/insights          → Busca métricas                │  │
│  │ POST /api/generate-report   → Gera texto com IA             │  │
│  │ POST /api/send-daily-report → Pipeline completo             │  │
│  │ GET  /health                → Status do servidor            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  URL: http://localhost:3001 (dev) | https://api.nexusai.com (prod)  │
└────────┬─────────────────────┬──────────────────────┬───────────────┘
         │                     │                      │
         │ SQL                 │ HTTP                 │ HTTP
         │                     │                      │
         ▼                     ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   SUPABASE      │   │ META GRAPH API  │   │  GEMINI / GPT   │
│   (PostgreSQL)  │   │                 │   │                 │
│                 │   │ - Ad Accounts   │   │ - Análise de    │
│ - users_tokens  │   │ - Campaigns     │   │   Insights      │
│ - monitored_    │   │ - Insights      │   │ - Geração de    │
│   accounts      │   │ - Metrics       │   │   Relatórios    │
│ - monitored_    │   │                 │   │                 │
│   campaigns     │   └─────────────────┘   └─────────────────┘
│ - report_logs   │
│                 │
└────────┬────────┘
         │
         │ SELECT (Cron Job)
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                         N8N WORKFLOWS                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ WORKFLOW 1: Relatórios Diários                            │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 1. Cron Trigger (08:00 AM)                                │ │
│  │ 2. Supabase: SELECT * FROM monitored_accounts (active)    │ │
│  │ 3. Loop: Para cada conta                                  │ │
│  │    a) Buscar token do usuário                             │ │
│  │    b) Chamar /api/insights                                │ │
│  │    c) Chamar /api/generate-report                         │ │
│  │    d) Enviar WhatsApp                                     │ │
│  │    e) Salvar log                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ WORKFLOW 2: Renovação de Tokens (A cada 50 dias)          │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 1. Cron Trigger (A cada 50 dias)                          │ │
│  │ 2. Supabase: SELECT tokens próximos de expirar            │ │
│  │ 3. Loop: Para cada token                                  │ │
│  │    a) Chamar /api/refresh-token                           │ │
│  │    b) Atualizar no banco                                  │ │
│  │    c) Se falhar, enviar alerta                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           │ HTTP POST (WhatsApp Business API)
                           │
                           ▼
                 ┌─────────────────────┐
                 │  WHATSAPP BUSINESS  │
                 │                     │
                 │  - Envia relatório  │
                 │  - Confirma entrega │
                 │                     │
                 └──────────┬──────────┘
                            │
                            │ Recebe
                            ▼
                  ┌───────────────────┐
                  │  CLIENTE FINAL    │
                  │  (no WhatsApp)    │
                  └───────────────────┘
```

---

## 🔄 Fluxo de Autenticação OAuth 2.0

```
┌─────────────┐                                      ┌──────────────┐
│  Frontend   │                                      │   Facebook   │
│  (React)    │                                      │   OAuth      │
└──────┬──────┘                                      └──────┬───────┘
       │                                                    │
       │ 1. Usuário clica "Conectar Facebook"              │
       ├───────────────────────────────────────────────────►│
       │    GET /dialog/oauth?client_id=X&redirect_uri=Y   │
       │                                                    │
       │                                                    │ 2. Usuário
       │                                                    │    autoriza
       │                                                    │
       │ 3. Redirect com CODE                              │
       │◄───────────────────────────────────────────────────┤
       │    ?code=ABC123                                    │
       │                                                    │
       ▼                                                    │
┌──────────────┐                                           │
│   Backend    │                                           │
│  (Express)   │                                           │
└──────┬───────┘                                           │
       │                                                    │
       │ 4. Trocar CODE por SHORT TOKEN                    │
       ├───────────────────────────────────────────────────►│
       │    POST /oauth/access_token                       │
       │    body: {code: ABC123, client_secret: XXX}       │
       │                                                    │
       │ 5. Retorna SHORT TOKEN (1h)                       │
       │◄───────────────────────────────────────────────────┤
       │    {access_token: "EAA...", expires_in: 3600}     │
       │                                                    │
       │ 6. Trocar SHORT por LONG TOKEN                    │
       ├───────────────────────────────────────────────────►│
       │    GET /oauth/access_token                        │
       │    ?grant_type=fb_exchange_token                  │
       │                                                    │
       │ 7. Retorna LONG TOKEN (60 dias)                   │
       │◄───────────────────────────────────────────────────┤
       │    {access_token: "EAA...", expires_in: 5184000}  │
       │                                                    │
       ▼                                                    │
┌──────────────┐                                           │
│  Supabase    │                                           │
│  (Database)  │                                           │
└──────┬───────┘                                           │
       │                                                    │
       │ 8. Salva no banco                                 │
       │    INSERT INTO users_tokens                       │
       │    (fb_user_id, long_lived_token, ...)            │
       │                                                    │
       ▼                                                    │
┌──────────────┐                                           │
│  Frontend    │                                           │
│  (Redirect)  │                                           │
└──────────────┘                                           │
       │                                                    │
       │ 9. Mostra Ad Accounts disponíveis                 │
       │                                                    │
```

---

## 📱 Fluxo de Envio de Relatório Diário

```
                    ┌─────────────────────────────────┐
                    │    08:00 AM - CRON TRIGGER      │
                    └────────────┬────────────────────┘
                                 │
                    ┌────────────▼────────────────────┐
                    │  n8n: Buscar contas ativas      │
                    │  SELECT * FROM monitored_accounts│
                    │  WHERE is_active = true          │
                    └────────────┬────────────────────┘
                                 │
                    ┌────────────▼────────────────────┐
                    │  Loop: Para cada conta          │
                    └────────────┬────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐    ┌───────────────────┐    ┌──────────────────┐
│ 1. Buscar     │    │ 2. Buscar         │    │ 3. Buscar        │
│    Token do   │───►│    Campanhas      │───►│    Insights FB   │
│    Usuário    │    │    Monitoradas    │    │    API           │
└───────────────┘    └───────────────────┘    └─────────┬────────┘
                                                         │
                                           ┌─────────────▼────────┐
                                           │ 4. Dados brutos:     │
                                           │    {                 │
                                           │      impressions,    │
                                           │      clicks,         │
                                           │      spend,          │
                                           │      conversions     │
                                           │    }                 │
                                           └─────────┬────────────┘
                                                     │
                                           ┌─────────▼────────────┐
                                           │ 5. Gerar Relatório   │
                                           │    com IA (Gemini)   │
                                           └─────────┬────────────┘
                                                     │
                                           ┌─────────▼────────────┐
                                           │ 6. Texto formatado:  │
                                           │                      │
                                           │ "📊 Resumo do Dia    │
                                           │  🔥 23 vendas!       │
                                           │  ⚠️ CPM subiu..."    │
                                           └─────────┬────────────┘
                                                     │
                                           ┌─────────▼────────────┐
                                           │ 7. Enviar WhatsApp   │
                                           │    Business API      │
                                           └─────────┬────────────┘
                                                     │
                                           ┌─────────▼────────────┐
                                           │ 8. Salvar Log        │
                                           │    INSERT INTO       │
                                           │    report_logs       │
                                           └──────────────────────┘
```

---

## 🗄️ Estrutura do Banco de Dados (Relacional)

```
┌─────────────────────────────────────────────────────────────┐
│                     users_tokens                            │
├─────────────────┬───────────────────────────────────────────┤
│ id (PK)         │ UUID                                      │
│ fb_user_id      │ TEXT (Unique)                             │
│ fb_user_name    │ TEXT                                      │
│ long_lived_token│ TEXT (🔑 O token de 60 dias)              │
│ token_expires_at│ TIMESTAMP                                 │
│ whatsapp_number │ TEXT                                      │
│ created_at      │ TIMESTAMP                                 │
└─────────┬───────┴───────────────────────────────────────────┘
          │
          │ 1:N (Um usuário tem N contas)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                  monitored_accounts                         │
├─────────────────┬───────────────────────────────────────────┤
│ id (PK)         │ UUID                                      │
│ user_id (FK)    │ UUID → users_tokens.id                    │
│ ad_account_id   │ TEXT (ex: act_123456)                     │
│ account_name    │ TEXT (ex: "Pizzaria do Zé")               │
│ account_currency│ TEXT (ex: "BRL")                          │
│ is_active       │ BOOLEAN (true = monitorando)              │
│ created_at      │ TIMESTAMP                                 │
└─────────┬───────┴───────────────────────────────────────────┘
          │
          │ 1:N (Uma conta tem N campanhas)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                 monitored_campaigns                         │
├─────────────────┬───────────────────────────────────────────┤
│ id (PK)         │ UUID                                      │
│ account_id (FK) │ UUID → monitored_accounts.id              │
│ campaign_id     │ TEXT (ex: "120202345678901234")           │
│ campaign_name   │ TEXT (ex: "Black Friday 2025")            │
│ is_active       │ BOOLEAN                                   │
│ created_at      │ TIMESTAMP                                 │
└─────────────────┴───────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     report_logs                             │
├─────────────────┬───────────────────────────────────────────┤
│ id (PK)         │ UUID                                      │
│ account_id (FK) │ UUID → monitored_accounts.id              │
│ report_date     │ DATE                                      │
│ status          │ TEXT (sent/failed/pending)                │
│ total_spend     │ DECIMAL                                   │
│ total_clicks    │ INTEGER                                   │
│ whatsapp_msg_id │ TEXT                                      │
│ error_message   │ TEXT (se falhou)                          │
│ created_at      │ TIMESTAMP                                 │
└─────────────────┴───────────────────────────────────────────┘
```

---

## 🔐 Fluxo de Segurança (Secrets Management)

```
┌──────────────────────────────────────────────────────────┐
│                    .env (SERVIDOR)                       │
├──────────────────────────────────────────────────────────┤
│ FACEBOOK_APP_SECRET="xxx"     🔒 NUNCA EXPOR            │
│ SUPABASE_SERVICE_KEY="yyy"    🔒 NUNCA EXPOR            │
│ WHATSAPP_TOKEN="zzz"          🔒 NUNCA EXPOR            │
│                                                           │
│ VITE_FACEBOOK_APP_ID="123"    ✅ Pode expor (público)   │
│ VITE_FACEBOOK_REDIRECT_URI    ✅ Pode expor             │
└──────────────────────────────────────────────────────────┘
                           │
                           │ Lido pelo backend
                           ▼
                  ┌────────────────┐
                  │  server.ts     │
                  │                │
                  │ Acessa secrets │
                  │ de forma segura│
                  └────────┬───────┘
                           │
              ┌────────────┴─────────────┐
              │                          │
              ▼                          ▼
    ┌─────────────────┐      ┌─────────────────┐
    │ Facebook Graph  │      │   Supabase      │
    │ (Com secret)    │      │ (Com service    │
    │                 │      │  key)           │
    └─────────────────┘      └─────────────────┘
```

---

## 🚀 Deployment Pipeline

```
┌───────────────┐
│  Developer    │
│  (Você)       │
└───────┬───────┘
        │
        │ git push
        │
        ▼
┌───────────────────────────────────────┐
│         GitHub Repository             │
└───────┬───────────┬───────────────────┘
        │           │
        │ Webhook   │ Webhook
        │           │
        ▼           ▼
┌───────────┐  ┌──────────────┐
│  Vercel   │  │   Railway    │
│           │  │              │
│ Frontend: │  │ Backend:     │
│ - Build   │  │ - Build      │
│   Vite    │  │   TypeScript │
│ - Deploy  │  │ - Deploy     │
│   Edge    │  │   Node.js    │
└─────┬─────┘  └──────┬───────┘
      │                │
      │ URL            │ URL
      │                │
      ▼                ▼
app.nexusai.com   api.nexusai.com
```

---

## 📊 Monitoramento e Logs

```
┌─────────────────────────────────────────────────────────┐
│                    SISTEMA EM PRODUÇÃO                  │
└────┬──────────────────┬─────────────────┬──────────────┘
     │                  │                 │
     ▼                  ▼                 ▼
┌──────────┐     ┌─────────────┐   ┌─────────────┐
│ Frontend │     │  Backend    │   │   n8n       │
│  Logs    │     │   Logs      │   │  Execution  │
│          │     │             │   │   Logs      │
│ - Errors │     │ - Auth      │   │             │
│ - Events │     │ - API Calls │   │ - Workflows │
└────┬─────┘     │ - Errors    │   │ - Success/  │
     │           │             │   │   Fail      │
     │           └──────┬──────┘   └──────┬──────┘
     │                  │                 │
     └──────────────────┴─────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Logging Service      │
            │  (ex: Sentry, LogRocket)│
            └───────────────────────┘
```

---

## 💰 Business Model (Multi-Tenant SaaS)

```
                     NEXUS AI PLATFORM
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐     ┌──────────┐
    │ Cliente 1│      │ Cliente 2│     │ Cliente N│
    │ (Agência)│      │ (Gestor) │     │ (Empresa)│
    └────┬─────┘      └────┬─────┘     └────┬─────┘
         │                 │                 │
         │ Paga R$97/mês   │ Paga R$247/mês  │ Paga R$497/mês
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Revenue Total  │
                  │  R$ 841/mês     │
                  └─────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐    ┌──────────┐
    │ Custos   │     │ Custos   │    │ Profit   │
    │ Infra    │     │ APIs     │    │          │
    │ R$20/mês │     │ R$50/mês │    │ R$771/mês│
    └──────────┘     └──────────┘    └──────────┘
```

---

Esta visualização mostra como cada peça do sistema se encaixa. Use como referência para entender o fluxo completo!
