# Deploy no Portainer com Traefik e GHCR

Este projeto publica uma imagem Docker generica pelo GitHub Actions. Todas as variaveis ficam no Portainer.

O stack do Portainer usa uma tag imutavel de commit, por exemplo `ghcr.io/yohannreimer/nexus:7df37aabf143e2ec055df8761a79f43eff29597c`, em vez de `latest`. Isso evita o problema do Swarm/Portainer reaproveitar a imagem antiga quando voce clica em **Update the stack**.

## 1. GitHub Actions

O GitHub Actions so faz build e publish da imagem. Nao cadastre envs do app no GitHub.

A action publica duas tags:

- `ghcr.io/yohannreimer/nexus:latest`
- `ghcr.io/yohannreimer/nexus:<commit-sha>`

Para deploy no Portainer, prefira sempre a tag `<commit-sha>` no arquivo `portainer-traefik-stack.yml`. Quando houver uma nova correcao, atualize essa tag no Git e clique em **Update the stack** no Portainer.

As variaveis publicas do frontend (`VITE_*`) sao escritas em `dist/env.js` quando o container inicia, usando as envs cadastradas na stack do Portainer.

## 2. Stack do Portainer

Use o arquivo `portainer-traefik-stack.yml` como stack Swarm no Portainer.

Cadastre estas variaveis na propria stack:

```env
POSTGRES_DB=nexus_ai
POSTGRES_USER=nexus
POSTGRES_PASSWORD=troque_por_uma_senha_forte

VITE_APP_URL=https://nexus.prymeiradigital.com.br
VITE_NEXUS_API_URL=https://nexus.prymeiradigital.com.br
NEXUS_API_URL=https://nexus.prymeiradigital.com.br

VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_PRYMEIRA_ACCOUNT_API_URL=https://URL-DO-PRYMEIRA-ACCOUNT
VITE_PRYMEIRA_HUB_URL=https://app.prymeiradigital.com.br
VITE_PRYMEIRA_PRODUCT_KEY=ads
VITE_PRYMEIRA_AUTH_ENABLED=true
PRYMEIRA_ACCOUNT_API_URL=https://URL-DO-PRYMEIRA-ACCOUNT
PRYMEIRA_PRODUCT_KEY=ads

NEXUS_OAUTH_STATE_SECRET=um_segredo_grande_aleatorio

VITE_FACEBOOK_APP_ID=seu_facebook_app_id
VITE_FACEBOOK_REDIRECT_URI=https://nexus.prymeiradigital.com.br/api/workspace/oauth/meta/callback
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
- O callback do Facebook deve ser exatamente `https://nexus.prymeiradigital.com.br/api/workspace/oauth/meta/callback`.
- Se o pacote GHCR ficar privado, configure credenciais de registry no Portainer ou torne o pacote publico no GitHub.
