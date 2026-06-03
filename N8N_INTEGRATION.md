# 🔄 Integração com n8n - Workflow de Relatórios Automáticos

Este documento explica como conectar o sistema de autenticação OAuth com o n8n para criar relatórios diários automatizados.

## 📊 Arquitetura do Sistema Completo

```
┌─────────────────┐
│  Frontend React │  ← Usuário se conecta e configura
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Backend Express │  ← Gerencia OAuth e armazena tokens
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    Supabase     │  ← Banco de dados com tokens e configs
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│      n8n        │  ← Workflow de automação
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐ ┌──────────┐
│Facebook │ │WhatsApp  │
│   API   │ │   API    │
└─────────┘ └──────────┘
```

## 🗄️ Estrutura do Banco de Dados (Supabase)

### SQL para criar as tabelas:

```sql
-- Tabela de usuários e tokens
CREATE TABLE users_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fb_user_id TEXT NOT NULL UNIQUE,
  fb_user_name TEXT,
  fb_user_email TEXT,
  long_lived_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  whatsapp_number TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de contas monitoradas
CREATE TABLE monitored_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users_tokens(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_currency TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, ad_account_id)
);

-- Tabela de campanhas selecionadas
CREATE TABLE monitored_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitored_account_id UUID REFERENCES monitored_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(monitored_account_id, campaign_id)
);

-- Tabela de histórico de relatórios
CREATE TABLE report_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitored_account_id UUID REFERENCES monitored_accounts(id),
  report_date DATE NOT NULL,
  status TEXT CHECK (status IN ('sent', 'failed', 'pending')),
  total_spend DECIMAL(10, 2),
  total_impressions INTEGER,
  total_clicks INTEGER,
  whatsapp_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_users_tokens_fb_user_id ON users_tokens(fb_user_id);
CREATE INDEX idx_monitored_accounts_user_id ON monitored_accounts(user_id);
CREATE INDEX idx_monitored_accounts_is_active ON monitored_accounts(is_active);
CREATE INDEX idx_report_logs_date ON report_logs(report_date);
```

## 🔧 Atualizar o Backend para Salvar no Supabase

Instale o cliente do Supabase:

```bash
npm install @supabase/supabase-js
```

Adicione ao `.env`:

```env
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_KEY="sua_service_key_aqui"
```

### Código de integração no `server.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Modificar a rota /api/auth-callback para salvar no banco:
app.get('/api/auth-callback', async (req: Request, res: Response) => {
  // ... código existente de troca de tokens ...
  
  const userInfo = userInfoResponse.data;
  const longLivedToken = longTokenResponse.data.access_token;
  const expiresIn = longTokenResponse.data.expires_in;
  
  // Calcular data de expiração
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  
  // Salvar ou atualizar usuário
  const { data: userData, error: userError } = await supabase
    .from('users_tokens')
    .upsert({
      fb_user_id: userInfo.id,
      fb_user_name: userInfo.name,
      fb_user_email: userInfo.email,
      long_lived_token: longLivedToken,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'fb_user_id'
    })
    .select()
    .single();
  
  if (userError) {
    console.error('Erro ao salvar usuário:', userError);
    return res.status(500).json({ error: 'Erro ao salvar dados' });
  }
  
  // Salvar contas de anúncios
  const adAccounts = adAccountsResponse.data.data;
  
  for (const account of adAccounts) {
    await supabase
      .from('monitored_accounts')
      .upsert({
        user_id: userData.id,
        ad_account_id: account.id,
        account_name: account.name,
        account_currency: account.currency,
        is_active: false // Usuário escolherá quais ativar
      }, {
        onConflict: 'user_id,ad_account_id'
      });
  }
  
  // ... resto do código ...
});
```

## 🤖 Workflow do n8n - Relatório Diário

### Estrutura do Workflow:

```json
{
  "name": "Relatório Diário Facebook Ads",
  "nodes": [
    {
      "name": "Cron Diário",
      "type": "n8n-nodes-base.cron",
      "position": [250, 300],
      "parameters": {
        "triggerTimes": {
          "item": [{
            "mode": "everyDay",
            "hour": 8,
            "minute": 0
          }]
        }
      }
    },
    {
      "name": "Buscar Contas Ativas",
      "type": "n8n-nodes-base.supabase",
      "position": [450, 300],
      "parameters": {
        "operation": "getAll",
        "tableId": "monitored_accounts",
        "returnAll": true,
        "filters": {
          "conditions": [{
            "keyName": "is_active",
            "condition": "equals",
            "keyValue": true
          }]
        }
      }
    },
    {
      "name": "Loop Contas",
      "type": "n8n-nodes-base.splitInBatches",
      "position": [650, 300],
      "parameters": {
        "batchSize": 1
      }
    },
    {
      "name": "Buscar Token do Usuário",
      "type": "n8n-nodes-base.supabase",
      "position": [850, 300],
      "parameters": {
        "operation": "get",
        "tableId": "users_tokens",
        "id": "={{ $json.user_id }}"
      }
    },
    {
      "name": "Buscar Campanhas",
      "type": "n8n-nodes-base.supabase",
      "position": [1050, 300],
      "parameters": {
        "operation": "getAll",
        "tableId": "monitored_campaigns",
        "filters": {
          "conditions": [{
            "keyName": "monitored_account_id",
            "condition": "equals",
            "keyValue": "={{ $json.id }}"
          }, {
            "keyName": "is_active",
            "condition": "equals",
            "keyValue": true
          }]
        }
      }
    },
    {
      "name": "Buscar Insights Facebook",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1250, 300],
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3001/api/insights",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer {{ $node['Buscar Token do Usuário'].json.long_lived_token }}"
        },
        "bodyParameters": {
          "parameters": [
            {
              "name": "adAccountId",
              "value": "={{ $node['Loop Contas'].json.ad_account_id }}"
            },
            {
              "name": "campaignIds",
              "value": "={{ $json.map(c => c.campaign_id) }}"
            },
            {
              "name": "datePreset",
              "value": "yesterday"
            }
          ]
        }
      }
    },
    {
      "name": "Gerar Relatório com IA",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [1450, 300],
      "parameters": {
        "model": "gpt-4o-mini",
        "messages": [{
          "role": "system",
          "content": "Você é um analista de tráfego sênior. Analise os dados das campanhas e gere um resumo para WhatsApp. Use emojis, seja direto e destaque o que está performando bem e o que precisa atenção."
        }, {
          "role": "user",
          "content": "Dados das campanhas de ontem:\n{{ JSON.stringify($json.insights, null, 2) }}"
        }]
      }
    },
    {
      "name": "Enviar WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1650, 300],
      "parameters": {
        "method": "POST",
        "url": "https://graph.facebook.com/v17.0/SEU_PHONE_ID/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer SEU_WHATSAPP_TOKEN"
        },
        "bodyParameters": {
          "parameters": [
            {
              "name": "messaging_product",
              "value": "whatsapp"
            },
            {
              "name": "to",
              "value": "={{ $node['Buscar Token do Usuário'].json.whatsapp_number }}"
            },
            {
              "name": "type",
              "value": "text"
            },
            {
              "name": "text",
              "value": {
                "body": "={{ $json.choices[0].message.content }}"
              }
            }
          ]
        }
      }
    },
    {
      "name": "Salvar Log",
      "type": "n8n-nodes-base.supabase",
      "position": [1850, 300],
      "parameters": {
        "operation": "create",
        "tableId": "report_logs",
        "fields": {
          "values": [
            {
              "name": "monitored_account_id",
              "value": "={{ $node['Loop Contas'].json.id }}"
            },
            {
              "name": "report_date",
              "value": "={{ new Date().toISOString().split('T')[0] }}"
            },
            {
              "name": "status",
              "value": "sent"
            },
            {
              "name": "total_spend",
              "value": "={{ $node['Buscar Insights Facebook'].json.insights.reduce((sum, i) => sum + parseFloat(i.spend), 0) }}"
            }
          ]
        }
      }
    }
  ],
  "connections": {
    "Cron Diário": {
      "main": [[{ "node": "Buscar Contas Ativas" }]]
    },
    "Buscar Contas Ativas": {
      "main": [[{ "node": "Loop Contas" }]]
    },
    "Loop Contas": {
      "main": [
        [{ "node": "Buscar Token do Usuário" }],
        [{ "node": "Buscar Contas Ativas" }]
      ]
    },
    "Buscar Token do Usuário": {
      "main": [[{ "node": "Buscar Campanhas" }]]
    },
    "Buscar Campanhas": {
      "main": [[{ "node": "Buscar Insights Facebook" }]]
    },
    "Buscar Insights Facebook": {
      "main": [[{ "node": "Gerar Relatório com IA" }]]
    },
    "Gerar Relatório com IA": {
      "main": [[{ "node": "Enviar WhatsApp" }]]
    },
    "Enviar WhatsApp": {
      "main": [[{ "node": "Salvar Log" }]]
    }
  }
}
```

## 🔄 Workflow de Renovação de Tokens (A cada 50 dias)

```json
{
  "name": "Renovar Tokens Facebook",
  "nodes": [
    {
      "name": "Cron - A cada 50 dias",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{
            "mode": "everyX",
            "value": 50,
            "unit": "days"
          }]
        }
      }
    },
    {
      "name": "Buscar Tokens Próximos de Expirar",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "getAll",
        "tableId": "users_tokens",
        "filters": {
          "conditions": [{
            "keyName": "token_expires_at",
            "condition": "lessThan",
            "keyValue": "={{ new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() }}"
          }]
        }
      }
    },
    {
      "name": "Loop Tokens",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": {
        "batchSize": 1
      }
    },
    {
      "name": "Renovar Token",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3001/api/refresh-token",
        "bodyParameters": {
          "parameters": [{
            "name": "token",
            "value": "={{ $json.long_lived_token }}"
          }]
        }
      }
    },
    {
      "name": "Atualizar no Banco",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "update",
        "tableId": "users_tokens",
        "id": "={{ $node['Loop Tokens'].json.id }}",
        "fields": {
          "values": [
            {
              "name": "long_lived_token",
              "value": "={{ $json.token }}"
            },
            {
              "name": "token_expires_at",
              "value": "={{ new Date(Date.now() + $json.expiresIn * 1000).toISOString() }}"
            }
          ]
        }
      }
    }
  ]
}
```

## 📱 Configurar WhatsApp Business API

1. **Criar App no Facebook Developers**
   - Adicione o produto "WhatsApp Business API"
   - Configure número de telefone de teste

2. **Obter Token Permanente**
   - Vá em Tools > Access Tokens
   - Gere um token que não expire

3. **Adicionar ao .env**
   ```env
   WHATSAPP_PHONE_ID="seu_phone_id"
   WHATSAPP_TOKEN="seu_token_permanente"
   ```

## 🎯 Checklist de Implementação

- [ ] Criar tabelas no Supabase
- [ ] Atualizar backend para salvar tokens no banco
- [ ] Configurar WhatsApp Business API
- [ ] Importar workflow de relatórios no n8n
- [ ] Importar workflow de renovação de tokens
- [ ] Testar envio de relatório manual
- [ ] Ativar cron job de relatórios diários
- [ ] Monitorar logs de envio

## 🚀 Deploy em Produção

### Backend (Railway/Render)

```bash
# Build
npm run build:server

# Start
npm start
```

Variáveis de ambiente necessárias:
- `FACEBOOK_APP_SECRET`
- `VITE_FACEBOOK_APP_ID`
- `VITE_FACEBOOK_REDIRECT_URI` (URL de produção)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `WHATSAPP_PHONE_ID`
- `WHATSAPP_TOKEN`

### Frontend (Vercel)

```bash
npm run build
```

Configurar variáveis:
- `VITE_FACEBOOK_APP_ID`
- `VITE_FACEBOOK_REDIRECT_URI`
- `VITE_APP_URL`

---

**Nota**: Este é um sistema completo de ponta a ponta. Comece com um teste local e vá escalando conforme validar o produto.
