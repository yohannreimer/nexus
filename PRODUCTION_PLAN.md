# 🚀 Plano de Migração para Produção - Nexus AI

## 📋 Visão Geral

Migrar o aplicativo de um ambiente local (localhost + Express) para uma arquitetura 100% cloud-hosted usando **Supabase** como backend e **Vercel** para hospedar o frontend.

---

## 🏗️ Arquitetura Final

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USUÁRIOS                                    │
│                    (Agências de Marketing Digital)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend)                                │
│                      https://nexus-ai.vercel.app                         │
│                                                                          │
│  • React + TypeScript + Vite                                            │
│  • Interface do usuário                                                  │
│  • Comunicação com Supabase                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│   SUPABASE AUTH      │ │ SUPABASE DATABASE│ │  SUPABASE EDGE FUNCTIONS │
│                      │ │                  │ │                          │
│ • Login/Registro     │ │ • PostgreSQL     │ │ • facebook-oauth         │
│ • Email/Senha        │ │ • Row Level      │ │ • facebook-insights      │
│ • Google OAuth       │ │   Security (RLS) │ │ • send-webhook           │
│ • Magic Link         │ │ • Multi-tenancy  │ │ • scheduled-reports      │
└──────────────────────┘ └──────────────────┘ └──────────────────────────┘
                                                        │
                                    ┌───────────────────┼───────────────┐
                                    ▼                                   ▼
                        ┌──────────────────────┐           ┌──────────────────┐
                        │   FACEBOOK API       │           │   WEBHOOK        │
                        │                      │           │   (N8N/Make)     │
                        │ • Marketing API      │           │                  │
                        │ • Graph API          │           │ • WhatsApp       │
                        │ • OAuth              │           │ • Telegram       │
                        └──────────────────────┘           └──────────────────┘
```

---

## 📝 Checklist de Implementação

### FASE 1: Autenticação com Supabase Auth ✅
- [x] 1.1 Configurar Supabase Auth no projeto
- [x] 1.2 Criar página de Login
- [x] 1.3 Criar página de Registro
- [x] 1.4 Criar página de Recuperação de Senha
- [x] 1.5 Implementar proteção de rotas (PrivateRoute)
- [x] 1.6 Atualizar App.tsx com fluxo de autenticação
- [x] 1.7 Criar contexto de autenticação (AuthContext)

### FASE 2: Atualizar Schema do Banco de Dados ✅
- [x] 2.1 Adicionar tabela `profiles` vinculada ao auth.users
- [x] 2.2 Atualizar todas as tabelas para ter `user_id`
- [x] 2.3 Implementar Row Level Security (RLS) em todas as tabelas
- [x] 2.4 Criar policies para cada operação (SELECT, INSERT, UPDATE, DELETE)
- [x] 2.5 Criar triggers para auto-popular user_id

### FASE 3: Edge Functions (Substituir Backend Express) ✅
- [x] 3.1 Configurar Supabase CLI para Edge Functions
- [x] 3.2 Criar função `facebook-oauth` (trocar code por token)
- [x] 3.3 Criar função `facebook-accounts` (listar contas de anúncio)
- [x] 3.4 Criar função `facebook-insights` (buscar métricas)
- [x] 3.5 Criar função `facebook-campaigns` (listar campanhas)
- [x] 3.6 Criar função `send-webhook` (enviar para N8N/Make)
- [x] 3.7 Criar função `generate-report` (gerar relatório com IA)

### FASE 4: Atualizar Frontend ✅
- [x] 4.1 Remover todas as chamadas para localhost:3001
- [x] 4.2 Criar serviço para chamar Edge Functions
- [x] 4.3 Atualizar `api.ts` para usar Supabase
- [x] 4.4 Atualizar componentes (ClientCharts, ReportPreview, EditClientModal)
- [x] 4.5 Atualizar fluxo de OAuth do Facebook (handleConnectFacebook)
- [ ] 4.6 Testar todos os fluxos

### FASE 5: Deploy
- [ ] 5.1 Configurar projeto na Vercel
- [ ] 5.2 Configurar variáveis de ambiente na Vercel
- [ ] 5.3 Configurar domínio customizado (opcional)
- [ ] 5.4 Atualizar URLs de callback do Facebook App
- [ ] 5.5 Deploy e teste em produção

---

## 🔧 Detalhamento Técnico

### FASE 1: Autenticação

#### 1.1 Configurar Supabase Auth
No Supabase Dashboard:
- Authentication → Providers → Habilitar Email
- Authentication → Providers → Habilitar Google (opcional)
- Authentication → URL Configuration → Site URL: `https://seu-app.vercel.app`
- Authentication → URL Configuration → Redirect URLs: `https://seu-app.vercel.app/**`

#### 1.2-1.6 Arquivos a criar/modificar:
```
/components/
  Auth/
    LoginPage.tsx          # Página de login
    RegisterPage.tsx       # Página de registro
    ForgotPassword.tsx     # Recuperação de senha
    PrivateRoute.tsx       # Proteção de rotas

/contexts/
  AuthContext.tsx          # Contexto de autenticação

/hooks/
  useAuth.ts               # Hook para usar auth
```

#### Exemplo de AuthContext:
```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ... implementar signIn, signUp, signOut
}
```

---

### FASE 2: Schema do Banco de Dados

#### 2.1 Nova tabela users (perfil público)
```sql
-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente após registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 2.2 Atualizar tabelas existentes
```sql
-- Adicionar user_id em todas as tabelas principais
ALTER TABLE facebook_connections ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE ad_accounts ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE message_templates ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE report_logs ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Remover a tabela agencies (cada user é sua própria "agência")
-- Ou manter para planos enterprise com múltiplos usuários
```

#### 2.3-2.4 Row Level Security
```sql
-- Habilitar RLS
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_logs ENABLE ROW LEVEL SECURITY;

-- Policies para facebook_connections
CREATE POLICY "Users can view own connections" ON facebook_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON facebook_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON facebook_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON facebook_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Repetir para outras tabelas...
```

---

### FASE 3: Edge Functions

#### Estrutura de pastas
```
/supabase/
  functions/
    facebook-oauth/
      index.ts           # Trocar authorization code por access token
    facebook-accounts/
      index.ts           # Listar contas de anúncio do usuário
    facebook-insights/
      index.ts           # Buscar métricas das campanhas
    facebook-campaigns/
      index.ts           # Listar campanhas de uma conta
    send-webhook/
      index.ts           # Enviar relatório via webhook
    generate-report/
      index.ts           # Gerar relatório com Gemini AI
```

#### Exemplo: facebook-oauth
```typescript
// supabase/functions/facebook-oauth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID')!
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET')!

serve(async (req) => {
  const { code, redirect_uri } = await req.json()
  
  // Trocar code por token
  const tokenUrl = `https://graph.facebook.com/v23.0/oauth/access_token?` +
    `client_id=${FACEBOOK_APP_ID}&` +
    `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
    `client_secret=${FACEBOOK_APP_SECRET}&` +
    `code=${code}`
  
  const response = await fetch(tokenUrl)
  const data = await response.json()
  
  if (data.error) {
    return new Response(JSON.stringify({ error: data.error }), { status: 400 })
  }
  
  // Buscar informações do usuário Facebook
  const userResponse = await fetch(
    `https://graph.facebook.com/me?access_token=${data.access_token}`
  )
  const userData = await userResponse.json()
  
  // Salvar no banco (associado ao user logado)
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  
  await supabase.from('facebook_connections').upsert({
    user_id: user.id,
    facebook_user_id: userData.id,
    facebook_user_name: userData.name,
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
  })
  
  return new Response(JSON.stringify({ success: true, user: userData }))
})
```

#### Exemplo: facebook-insights
```typescript
// supabase/functions/facebook-insights/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { account_id, date_preset } = await req.json()
  
  // Autenticar usuário
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  
  // Buscar token do Facebook do usuário
  const { data: connection } = await supabase
    .from('facebook_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .single()
  
  if (!connection) {
    return new Response(JSON.stringify({ error: 'Facebook not connected' }), { status: 400 })
  }
  
  // Buscar insights do Facebook
  const fields = 'spend,impressions,clicks,cpc,cpm,ctr,reach,actions,cost_per_action_type'
  const url = `https://graph.facebook.com/v23.0/act_${account_id}/insights?` +
    `fields=${fields}&date_preset=${date_preset}&access_token=${connection.access_token}`
  
  const response = await fetch(url)
  const data = await response.json()
  
  return new Response(JSON.stringify(data))
})
```

---

### FASE 4: Atualizar Frontend

#### 4.1 Novo serviço para Edge Functions
```typescript
// services/edgeFunctions.ts
import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callEdgeFunction<T>(functionName: string, body: object): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Edge function error');
  }
  
  return response.json();
}

export const edgeFunctions = {
  // Facebook
  exchangeFacebookCode: (code: string, redirectUri: string) =>
    callEdgeFunction('facebook-oauth', { code, redirect_uri: redirectUri }),
  
  getAdAccounts: () =>
    callEdgeFunction('facebook-accounts', {}),
  
  getInsights: (accountId: string, datePreset: string) =>
    callEdgeFunction('facebook-insights', { account_id: accountId, date_preset: datePreset }),
  
  getCampaigns: (accountId: string) =>
    callEdgeFunction('facebook-campaigns', { account_id: accountId }),
  
  // Reports
  sendWebhook: (webhookUrl: string, message: string) =>
    callEdgeFunction('send-webhook', { webhook_url: webhookUrl, message }),
  
  generateReport: (accountId: string, templateId: string) =>
    callEdgeFunction('generate-report', { account_id: accountId, template_id: templateId }),
};
```

---

### FASE 5: Deploy

#### 5.1 Configurar Vercel
1. Conectar repositório GitHub à Vercel
2. Framework Preset: Vite
3. Build Command: `npm run build`
4. Output Directory: `dist`

#### 5.2 Variáveis de Ambiente na Vercel
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_FACEBOOK_APP_ID=123456789
```

#### 5.3 Variáveis de Ambiente no Supabase (Edge Functions)
```
FACEBOOK_APP_ID=123456789
FACEBOOK_APP_SECRET=abcdef123456
GEMINI_API_KEY=AIza...
```

#### 5.4 Atualizar Facebook App
- Settings → Basic → App Domains: `seu-app.vercel.app`
- Facebook Login → Settings → Valid OAuth Redirect URIs:
  - `https://seu-app.vercel.app/auth/callback`
  - `https://xxx.supabase.co/functions/v1/facebook-oauth`

---

## 📅 Cronograma Estimado

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | Autenticação | 2-3 horas |
| 2 | Schema + RLS | 1-2 horas |
| 3 | Edge Functions | 3-4 horas |
| 4 | Atualizar Frontend | 2-3 horas |
| 5 | Deploy | 1 hora |
| **Total** | | **9-13 horas** |

---

## ⚠️ Pontos de Atenção

1. **Facebook App Review**: Para usar a Marketing API em produção, o Facebook App precisa passar por review
2. **Rate Limits**: A API do Facebook tem limites de requisições por hora
3. **Tokens**: Access tokens do Facebook expiram (60 dias para long-lived tokens)
4. **Custos**: 
   - Supabase Free: 500MB database, 2GB bandwidth, 500K edge function invocations/mês
   - Vercel Free: 100GB bandwidth, serverless functions incluídas
5. **CORS**: Edge Functions precisam retornar headers CORS corretos

---

## 🎯 Próximos Passos

1. **Confirmar** se este plano está correto
2. **Começar pela Fase 1** (Autenticação)
3. **Testar cada fase** antes de avançar
4. **Deploy incremental** para validar em produção

---

## 📁 Estrutura Final do Projeto

```
nexus-ai/
├── public/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   └── PrivateRoute.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ConfigureClientModal.tsx
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useSupabase.ts
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── edgeFunctions.ts
│   │   └── messageTemplates.ts
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   ├── facebook-oauth/
│   │   ├── facebook-accounts/
│   │   ├── facebook-insights/
│   │   ├── facebook-campaigns/
│   │   ├── send-webhook/
│   │   └── generate-report/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── config.toml
├── .env
├── .env.example
├── package.json
├── vercel.json
└── README.md
```

---

**Pronto para começar? Diga "GO" e iniciamos pela Fase 1!** 🚀
