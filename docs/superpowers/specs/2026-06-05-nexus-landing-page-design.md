# Nexus AI — Landing Page `/landing`

**Data:** 2026-06-05  
**Status:** Aprovado

---

## Objetivo

Criar a landing page pública do Nexus AI em `/landing`, seguindo exatamente o padrão visual dos outros produtos Prymeira (inline styles, dark #0a0a09, gold #fcc009). A seção de plataformas (Meta Ads + Google Ads) precisa ser detalhada o suficiente para satisfazer a revisão de conta do Google Ads.

---

## Arquitetura

### Novo arquivo
`nexus-ai-main/components/NexusLandingPage.tsx`

### Roteamento
`App.tsx` — adicionar check antes de `readPublicPortalRoute()`:
```tsx
if (window.location.pathname === '/landing') {
  return <NexusLandingPage />;
}
```

### Symlink
`Hub — Prymeira Account/apps/nexus-ai` → `../../../../nexus-ai-main`

---

## Design tokens

```
BG        #0a0a09
SURFACE   #111110
BORDER    #1e1e1c
ACCENT    #fcc009
TEXT      #f6f2e8
TEXT_SOFT #9e9589
TEXT_MUTED #5a5652
FONT      -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Indigo (#6366f1) usado apenas em badges de plataforma, não como cor estrutural.

---

## Seções

### 1. Navbar (sticky, #0a0a09)
- Logo SVG Nexus AI (ícone quadrado indigo + texto "Nexus AI")
- Links âncora: Plataformas · Funcionalidades · Planos
- CTA ghost "Entrar" + botão gold "Começar teste"
- Responsive: links ocultos em mobile

### 2. Hero (#0a0a09)
- Badge: "Powered by Gemini 2.0 · Meta Ads · Google Ads"
- H1: "Relatórios de Ads no piloto automático."
- Sub: "Conecte suas contas de anúncio e deixe a IA enviar análises diárias para seus clientes via WhatsApp — sem abrir nenhuma plataforma."
- CTA gold "Começar gratuitamente →" + ghost "Ver funcionalidades"
- Chips: Meta Ads · Google Ads · WhatsApp · Gemini 2.0

### 3. Problema (#fafaf8)
- H2: "Sua agência perde 2h por dia criando relatórios."
- 3 pain cards (bordas vermelhas): Relatório manual todo dia / Cliente cobrando update agora / Dados inconsistentes entre plataformas

### 4. Plataformas (#ffffff) — seção crítica para Google
Dois blocos lado a lado, cada um com:
- Nome + logo da plataforma
- "Como o Nexus AI se conecta": OAuth 2.0 oficial, permissão read-only
- Métricas acessadas: impressões, cliques, CPM, CPC, ROAS, conversões, gasto, alcance
- Como os dados são usados: IA Gemini gera resumo → enviado via WhatsApp
- Escopo de permissão solicitado (apenas leitura, nunca escrita)
- Badge de segurança: "Sem acesso a dados financeiros ou gerenciamento de campanhas"

### 5. Funcionalidades (#fafaf8)
Grid 2×4 de feature cards:
- Conexão OAuth oficial (Meta + Google)
- Relatórios via IA Gemini
- Envio automático WhatsApp
- Multi-conta / multi-cliente
- Dashboard tempo real
- PDF com branding da agência
- Alertas de ROAS baixo
- Histórico completo de relatórios

### 6. Como funciona (#0a0a09)
3 passos em timeline:
1. Conecte suas contas (OAuth seguro)
2. Configure clientes e campanhas
3. IA envia relatórios automaticamente

### 7. Planos (#fafaf8)
- Toggle mensal/anual
- 3 cards: Starter · Agência (recomendado, borda gold) · Agência Pro
- CTA "Começar teste" em cada card

### 8. CTA Final (#0a0a09)
- H2: "Automatize seus relatórios hoje."
- CTA gold grande

### 9. Footer (#050505)
- © 2026 Prymeira Digital
- Links: Termos · Privacidade · Suporte

---

## Responsive
- `useIsMobile()` hook (window.innerWidth < 768)
- `isMobile` passado como prop para cada seção
- Grids colapsam para 1 coluna em mobile
- Navbar oculta links âncora em mobile

---

## Restrições
- Sem dependências novas — apenas React e lucide-react (já instalados)
- Sem Tailwind — apenas inline styles
- Sem modificações em index.html ou vite.config.ts
