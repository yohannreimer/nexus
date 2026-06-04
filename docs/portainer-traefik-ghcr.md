# Deploy no Portainer com Traefik e GHCR

Este projeto publica a imagem Docker em `ghcr.io/yohannreimer/nexus:latest` pelo GitHub Actions.

## 1. Variaveis do GitHub Actions

Como o frontend usa Vite, as variaveis `VITE_*` entram no build da imagem. Cadastre estas variaveis no GitHub em `Settings > Secrets and variables > Actions > Variables` antes de rodar o workflow `Publish GHCR image`.

```env
VITE_APP_URL=https://nexus.yrdnegocios.com.br
VITE_NEXUS_API_URL=https://nexus.yrdnegocios.com.br
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_PRYMEIRA_ACCOUNT_API_URL=https://URL-DO-PRYMEIRA-ACCOUNT
VITE_PRYMEIRA_HUB_URL=https://app.prymeiradigital.com.br
VITE_PRYMEIRA_PRODUCT_KEY=ads
VITE_PRYMEIRA_AUTH_ENABLED=true
VITE_FACEBOOK_APP_ID=seu_facebook_app_id
VITE_FACEBOOK_REDIRECT_URI=https://nexus.yrdnegocios.com.br/api/auth-callback
VITE_N8N_WEBHOOK_URL=https://webhooks.yrdnegocios.com.br/webhook/nexusrelatorios
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DEV_BYPASS=false
```

Depois de alterar qualquer variavel `VITE_*`, rode o workflow novamente para reconstruir a imagem.

## 2. Stack do Portainer

Use o arquivo `portainer-traefik-stack.yml` como stack Swarm no Portainer.

Cadastre estas variaveis na propria stack:

```env
POSTGRES_DB=nexus_ai
POSTGRES_USER=nexus
POSTGRES_PASSWORD=troque_por_uma_senha_forte

VITE_APP_URL=https://nexus.yrdnegocios.com.br
VITE_NEXUS_API_URL=https://nexus.yrdnegocios.com.br
NEXUS_API_URL=https://nexus.yrdnegocios.com.br

VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_PRYMEIRA_ACCOUNT_API_URL=https://URL-DO-PRYMEIRA-ACCOUNT
VITE_PRYMEIRA_HUB_URL=https://app.prymeiradigital.com.br
VITE_PRYMEIRA_PRODUCT_KEY=ads
VITE_PRYMEIRA_AUTH_ENABLED=true
PRYMEIRA_ACCOUNT_API_URL=https://URL-DO-PRYMEIRA-ACCOUNT
PRYMEIRA_PRODUCT_KEY=ads

NEXUS_OAUTH_STATE_SECRET=um_segredo_grande_aleatorio

VITE_FACEBOOK_APP_ID=seu_facebook_app_id
VITE_FACEBOOK_REDIRECT_URI=https://nexus.yrdnegocios.com.br/api/auth-callback
FACEBOOK_APP_ID=seu_facebook_app_id
FACEBOOK_APP_SECRET=seu_facebook_app_secret
FACEBOOK_GRAPH_VERSION=v23.0

GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=seu_google_ads_developer_token
GOOGLE_ADS_LOGIN_CUSTOMER_ID=
GOOGLE_ADS_API_VERSION=v24

VITE_N8N_WEBHOOK_URL=https://webhooks.yrdnegocios.com.br/webhook/nexusrelatorios
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DEV_BYPASS=false
```

## 3. Observacoes

- O Traefik deve estar conectado na rede externa `network_swarm_public`.
- O servico `nexus_app` escuta internamente na porta `3001`; nao precisa publicar `ports`.
- O callback do Facebook deve ser exatamente `https://nexus.yrdnegocios.com.br/api/auth-callback`.
- Se o pacote GHCR ficar privado, configure credenciais de registry no Portainer ou torne o pacote publico no GitHub.
