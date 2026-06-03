<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🚀 Nexus AI - Relatórios Automáticos de Facebook Ads

**SaaS completo para agências de tráfego**: Conecte contas de anúncios do Facebook, selecione campanhas e receba relatórios diários inteligentes via WhatsApp.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)

---

## 📋 O que é o Nexus AI?

Um produto **painkiller** que resolve a dor de agências e gestores de tráfego:

✅ **Conecta com Facebook Ads** via OAuth 2.0 (seguro e oficial)  
✅ **Tokens de longa duração** (60 dias) com renovação automática  
✅ **Multi-tenant**: Suporta múltiplas contas e clientes  
✅ **Relatórios via IA**: Análise inteligente das campanhas  
✅ **Envio automático** para WhatsApp todo dia  
✅ **Zero manutenção** para o cliente após setup inicial  

---

## 🏗️ Arquitetura

```
┌──────────────┐     OAuth 2.0      ┌──────────────┐
│   Frontend   │ ←─────────────────→ │ Facebook API │
│  (React)     │                     └──────────────┘
└──────┬───────┘                              ↑
       │                                      │
       │ REST API                    Busca Insights
       │                                      │
┌──────↓───────┐                     ┌────────────┐
│   Backend    │ ←───── Token ─────→ │  Supabase  │
│  (Express)   │                     │  Database  │
└──────────────┘                     └─────┬──────┘
                                           │
                                    ┌──────↓──────┐
                                    │     n8n     │
                                    │  Automação  │
                                    └──────┬──────┘
                                           │
                                    ┌──────↓──────┐
                                    │  WhatsApp   │
                                    │   Business  │
                                    └─────────────┘
```

---

## 🚀 Quick Start (5 minutos)

### 1️⃣ Pré-requisitos

- Node.js 18+
- Conta Meta Developers (grátis)
- Conta Facebook com acesso a Ad Accounts

### 2️⃣ Clone e instale

```bash
git clone https://github.com/yohannreimer/nexus-ai.git
cd nexus-ai
npm install
```

### 3️⃣ Configure o Facebook App

1. Acesse [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Crie um App tipo **"Empresa"**
3. Adicione o produto **"Login do Facebook"**
4. Configure **Redirect URI**: `http://localhost:3001/api/auth-callback`
5. Copie **App ID** e **App Secret**

### 4️⃣ Configure o .env

```env
# Client-Side (exposto ao frontend)
VITE_FACEBOOK_APP_ID="SEU_APP_ID"
VITE_FACEBOOK_REDIRECT_URI="http://localhost:3001/api/auth-callback"
VITE_APP_URL="http://localhost:5173"

# Server-Side (PRIVADO - nunca exponha!)
FACEBOOK_APP_SECRET="SUA_CHAVE_SECRETA"
```

### 5️⃣ Inicie o sistema

```bash
npm run dev:all
```

Abra o navegador em: **http://localhost:5173**

---

## 📚 Documentação Completa

Este projeto possui documentação extensiva e organizada. Escolha o guia adequado para você:

### 🚀 Primeiros Passos
- **[📖 DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Índice completo (comece aqui!)
- **[⚡ QUICK_START.md](./QUICK_START.md)** - Guia rápido de 5 minutos
- **[⚙️ SETUP.md](./SETUP.md)** - Configuração detalhada passo a passo

### 📊 Implementação e Arquitetura
- **[✅ IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Resumo do que foi implementado
- **[🏗️ ARCHITECTURE.md](./ARCHITECTURE.md)** - Diagramas e arquitetura visual

### 🔧 Integração e Automação
- **[🔄 N8N_INTEGRATION.md](./N8N_INTEGRATION.md)** - Workflows e banco de dados
- **[🤖 AI_REPORTS_GUIDE.md](./AI_REPORTS_GUIDE.md)** - Relatórios com Gemini/GPT

### 📈 Planejamento
- **[🗺️ ROADMAP.md](./ROADMAP.md)** - Roadmap completo (MVP → SaaS escalável)

---

## 🎯 Funcionalidades

### ✅ Implementado

- [x] **Autenticação OAuth 2.0** com Facebook
- [x] **Troca automática de tokens** (1h → 60 dias)
- [x] **Listagem de Ad Accounts** do usuário
- [x] **Seleção de campanhas** para monitorar
- [x] **API REST** para integração com n8n
- [x] **Interface React** completa

### 🚧 Próximos Passos (Roadmap)

- [ ] Integração com **Supabase** (persistência)
- [ ] **Renovação automática** de tokens via cron
- [ ] **Geração de relatórios com IA** (Gemini/GPT)
- [ ] **Envio via WhatsApp Business API**
- [ ] **Dashboard administrativo** para agências
- [ ] **Sistema de pagamento** (Stripe)
- [ ] **Deploy em produção** (Vercel + Railway)

---

## 🛠️ Tecnologias

### Frontend
- **React 19** com TypeScript
- **Vite** (build ultra-rápido)
- **TailwindCSS** (estilização)
- **Lucide Icons** (ícones modernos)

### Backend
- **Express.js** (servidor HTTP)
- **Axios** (HTTP client)
- **CORS** (segurança)
- **dotenv** (variáveis de ambiente)

### Integrações
- **Facebook Marketing API v23.0**
- **WhatsApp Business API**
- **Supabase** (PostgreSQL)
- **n8n** (automação)
- **Gemini/OpenAI** (IA para relatórios)

---

## 📦 Estrutura de Pastas

```
/workspaces/nexus-ai/
├── components/           # Componentes React
│   ├── ConnectModal.tsx  # Modal de conexão OAuth
│   ├── Dashboard.tsx     # Dashboard principal
│   ├── ConfigureClientModal.tsx
│   └── ...
├── services/            # Lógica de API
│   ├── api.ts           # Chamadas HTTP
│   └── geminiService.ts # IA Gemini
├── server.ts            # Servidor Express (OAuth)
├── App.tsx              # App principal React
├── .env                 # Variáveis de ambiente
├── package.json         # Dependências
├── SETUP.md             # Guia completo de setup
├── QUICK_START.md       # Guia rápido
└── N8N_INTEGRATION.md   # Workflows n8n
```

---

## 🔐 Segurança

| Aspecto | Status | Descrição |
|---------|--------|-----------|
| OAuth 2.0 | ✅ | Padrão oficial da Meta |
| Long-Lived Tokens | ✅ | 60 dias de validade |
| Secrets no Backend | ✅ | Nunca expostos ao cliente |
| CORS Configurado | ✅ | Apenas origins permitidas |
| HTTPS Ready | ✅ | Pronto para produção |

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Siga os passos:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: Minha Feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📞 Suporte e Comunidade

- **Issues**: [GitHub Issues](https://github.com/yohannreimer/nexus-ai/issues)
- **Email**: yohann@primeiradigital.com
- **Documentação Meta**: [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

## 🙏 Agradecimentos

- [Meta Developers](https://developers.facebook.com/) - API de anúncios
- [n8n](https://n8n.io/) - Plataforma de automação
- [Supabase](https://supabase.com/) - Backend as a Service
- [Vite](https://vitejs.dev/) - Build tool

---

<div align="center">

**Feito com ❤️ para agências de tráfego**

[⬆ Voltar ao topo](#-nexus-ai---relatórios-automáticos-de-facebook-ads)

</div>
