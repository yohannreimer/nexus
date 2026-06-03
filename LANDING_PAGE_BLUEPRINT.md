# 🚀 NEXUS AI - BLUEPRINT DE LANDING PAGE

## 📋 VISÃO GERAL DO PROJETO

### O que é o Nexus AI?
Uma plataforma SaaS que automatiza a criação e envio de relatórios de Facebook/Meta Ads via WhatsApp para agências de tráfego pago.

### Dores que resolve:
1. **Tempo perdido** criando relatórios manuais todos os dias
2. **Clientes cobrando** por updates de performance
3. **Inconsistência** na comunicação com clientes
4. **Falta de profissionalismo** em relatórios amadores
5. **Risco de perder clientes** por má comunicação

### Diferenciais únicos:
- ✅ Conexão oficial com Meta (OAuth 2.0, token 60 dias)
- ✅ Envio automático via WhatsApp (sem intervenção)
- ✅ Templates de mensagem personalizáveis
- ✅ Suporte a múltiplas contas de anúncio
- ✅ Dashboard com gráficos em tempo real
- ✅ Geração de PDF profissional com branding
- ✅ Alertas automáticos de campanhas problemáticas

---

## 🎨 DESIGN SYSTEM

### Cores Principais
```css
--primary: #6366f1 (Indigo)
--primary-dark: #4f46e5
--secondary: #8b5cf6 (Purple)
--accent: #22c55e (Green - sucesso/ativo)
--warning: #f59e0b (Amber - alertas)
--dark: #1e293b (Slate 800)
--light: #f8fafc (Slate 50)
```

### Tipografia
- **Headlines:** Inter ou Satoshi (bold, tracking tight)
- **Body:** Inter (regular)
- **Monospace:** JetBrains Mono (para IDs/código)

### Estilo Visual
- Glassmorphism sutil (bg-white/70 backdrop-blur)
- Gradientes suaves (indigo → purple)
- Sombras difusas (shadow-xl shadow-indigo-500/20)
- Bordas arredondadas (rounded-2xl, rounded-3xl)
- Micro-animações (hover:-translate-y-1, scale)
- Dark mode elegante

---

## 📐 ESTRUTURA DA LANDING PAGE

### SEÇÃO 1: HERO (Above the Fold)
**Objetivo:** Capturar atenção em 3 segundos

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo Nexus AI]                    [Entrar] [Começar Free] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟢 Novo: Integração com IA Gemini 2.0                     │
│                                                             │
│        Relatórios de Facebook Ads                          │
│        no piloto automático.                               │
│                                                             │
│  Elimine 2 horas diárias de trabalho manual.               │
│  Conecte suas contas e deixe a IA enviar análises          │
│  executivas via WhatsApp para seus clientes.               │
│                                                             │
│  [🔵 Começar Gratuitamente]  [▶️ Ver Demo 2min]            │
│                                                             │
│  ⭐⭐⭐⭐⭐ "Economizo 40h/mês" - João, Agência XYZ         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Copy Hero:
```
[Badge animado com pulse]
🚀 Novo: Integração com IA Gemini 2.0

[H1 - 56px/72px]
Relatórios de Facebook Ads
no piloto automático.

[Subheadline - 20px]
Elimine 2 horas diárias de trabalho manual. Conecte suas contas 
e deixe a IA enviar análises executivas via WhatsApp.

[CTA Primário - Botão grande com ícone Facebook]
🔵 Começar Gratuitamente

[CTA Secundário - Ghost button]
▶️ Ver Demonstração (2 min)

[Social Proof micro]
⭐⭐⭐⭐⭐ Usado por +50 agências | 4.9/5 avaliação
```

#### Efeitos Visuais Hero:
- Background: Gradiente radial suave (indigo → transparent)
- Floating elements: 3 cards flutuantes mostrando preview de relatório
- Particles/dots animados no fundo
- Mouse parallax nos elementos decorativos
- Typing effect no headline (opcional)
- Glow effect no botão CTA principal

---

### SEÇÃO 2: PROBLEMA/DOR
**Objetivo:** Fazer o visitante se identificar com a dor

#### Layout Visual:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  😫 Você ainda faz relatórios assim?                       │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ 📊      │  │ 📱      │  │ ⏰      │  │ 😤      │       │
│  │ Abre    │→ │ Copia   │→ │ Formata │→ │ Envia   │       │
│  │ FB Ads  │  │ dados   │  │ texto   │  │ WhatsApp│       │
│  │         │  │ manual  │  │ manual  │  │ 1 por 1 │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
│  ⏱️ 15-30 minutos POR CLIENTE, TODOS OS DIAS              │
│                                                             │
│  Com 20 clientes = 10 HORAS/SEMANA perdidas                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Copy:
```
[Eyebrow]
O problema que ninguém fala

[H2]
Você ainda cria relatórios manualmente?

[Lista com ícones X vermelhos]
❌ Abrir o Gerenciador de Anúncios todo dia
❌ Copiar métricas em planilha ou bloco de notas
❌ Formatar texto bonito com emojis
❌ Enviar no WhatsApp de cada cliente
❌ Responder "e aí, como tá a campanha?"

[Destaque em box amarelo/âmbar]
⏱️ 15-30 minutos POR CLIENTE, TODOS OS DIAS

[Cálculo impactante]
20 clientes × 20 min × 22 dias = 146 HORAS/MÊS
Isso é quase 1 MÊS DE TRABALHO jogado fora.
```

#### Efeitos:
- Cards com animação de "processo" (setas animadas)
- Contador animado mostrando horas perdidas
- Shake animation nos ícones de X
- Background: gradiente vermelho/âmbar sutil

---

### SEÇÃO 3: SOLUÇÃO (O Produto)
**Objetivo:** Apresentar o Nexus AI como a solução

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✨ Conheça o Nexus AI                                     │
│                                                             │
│  [Screenshot/Video do Dashboard]                            │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 1. Conecte   │ │ 2. Configure │ │ 3. Relaxe    │        │
│  │ Facebook     │ │ WhatsApp     │ │ Automático!  │        │
│  │ em 1 clique  │ │ e horário    │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  [MOCKUP: Preview de mensagem WhatsApp bonita]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Copy:
```
[Badge]
✨ A solução inteligente

[H2]
Configure uma vez.
Nunca mais se preocupe.

[Subheadline]
O Nexus AI conecta direto com o Facebook Ads, analisa suas 
campanhas com IA, e envia relatórios lindos no WhatsApp 
dos seus clientes. Todo. Santo. Dia.

[3 Steps com ícones grandes]

1️⃣ CONECTE
   Faça login com sua conta do Facebook.
   Importamos todas as suas contas de anúncio automaticamente.
   (1 clique, 30 segundos)

2️⃣ CONFIGURE
   Escolha o WhatsApp de cada cliente.
   Defina o horário de envio (ex: 8h da manhã).
   Selecione o template de mensagem.

3️⃣ RELAXE
   Pronto. Todo dia, no horário configurado,
   seu cliente recebe um relatório profissional.
   Sem você mexer um dedo.
```

#### Efeitos:
- Screenshots com sombra flutuante e borda arredondada
- Mockup de iPhone mostrando WhatsApp com mensagem
- Steps com linha conectora animada
- Confetti animation sutil no step 3
- Video embed com thumbnail atraente

---

### SEÇÃO 4: FEATURES (Funcionalidades)
**Objetivo:** Mostrar profundidade do produto

#### Layout em Grid:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🛠️ Tudo que você precisa em um só lugar                   │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │ 📊 Dashboard   │  │ 📱 WhatsApp    │  │ 🎨 Templates   ││
│  │    Completo    │  │    Automático  │  │    Editáveis   ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │ 📈 Gráficos    │  │ 📄 PDF         │  │ ⚠️ Alertas    ││
│  │    Interativos │  │    Profissional│  │    Automáticos ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Features Detalhadas:

**Feature 1: Conexão Oficial com Meta**
```
🔐 Conexão 100% Segura
- OAuth 2.0 oficial da Meta
- Token de 60 dias (renovação automática)
- Permissão apenas de leitura (Safe Mode)
- Importa todas as Ad Accounts automaticamente
```

**Feature 2: Dashboard Inteligente**
```
📊 Visão Completa do Portfolio
- Veja todas as contas em um lugar
- Status: Ativa, Pendente, Bloqueada
- Métricas em tempo real
- Filtros por status
```

**Feature 3: Relatórios WhatsApp**
```
📱 Mensagens Profissionais
- Templates pré-prontos (7 modelos)
- Editor de templates com variáveis
- Preview em tempo real estilo WhatsApp
- Envio manual ou automático
```

**Feature 4: Gráficos Interativos**
```
📈 Visualização de Dados
- Gráficos de linha, barra e pizza
- Análise por campanha
- Análise por objetivo
- Comparativo de períodos
```

**Feature 5: PDF Profissional**
```
📄 Relatórios para Imprimir
- Design com sua marca
- Logo e cores personalizáveis
- Download em 1 clique
- Pronto para reuniões
```

**Feature 6: Alertas Automáticos**
```
⚠️ Nunca Perca um Problema
- Detecta CTR baixo
- Detecta CPC alto
- Detecta campanhas paradas
- Notifica você e o cliente
```

#### Efeitos:
- Cards com hover que mostra mais detalhes (expand)
- Ícones com micro-animação no hover
- Badge "NOVO" em features recentes
- Background gradient sutil alternando

---

### SEÇÃO 5: DEMO/PREVIEW INTERATIVO
**Objetivo:** Mostrar o produto funcionando

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  👀 Veja como funciona na prática                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   [VIDEO EMBED ou GIF ANIMADO]                      │   │
│  │   Mostrando:                                        │   │
│  │   1. Login com Facebook                             │   │
│  │   2. Contas aparecendo                              │   │
│  │   3. Configuração de cliente                        │   │
│  │   4. Preview de mensagem                            │   │
│  │   5. Mensagem chegando no WhatsApp                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [🔵 Quero testar agora - GRÁTIS]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Copy:
```
[H2]
Veja o Nexus AI em ação

[Subheadline]
2 minutos para entender como você vai economizar 
+40 horas por mês.

[CTA após vídeo]
Convencido? Comece grátis agora.
```

#### Efeitos:
- Video player customizado com controles bonitos
- Play button grande animado
- Progress bar colorida
- Thumbnail com screenshot atraente
- Lightbox para tela cheia

---

### SEÇÃO 6: PROVA SOCIAL
**Objetivo:** Construir confiança

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💬 O que dizem nossos clientes                            │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ "Economizo 2h    │  │ "Meus clientes   │                │
│  │  por dia. Melhor │  │  adoram receber  │                │
│  │  investimento    │  │  o relatório     │                │
│  │  que já fiz."    │  │  todo dia!"      │                │
│  │                  │  │                  │                │
│  │ 👤 João Silva    │  │ 👤 Maria Santos  │                │
│  │ CEO, Agência X   │  │ Gestora, Y Mkt   │                │
│  │ ⭐⭐⭐⭐⭐          │  │ ⭐⭐⭐⭐⭐          │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  📊 +50 agências | 📱 +10.000 relatórios/mês              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Copy dos Depoimentos:
```
Depoimento 1:
"Antes eu levava 3 horas toda manhã fazendo relatórios. 
Agora acordo e já está tudo enviado. Meus clientes acham 
que eu acordo às 6h da manhã trabalhando pra eles 😂"
— João Silva, CEO da Agência Resultado Digital
   ⭐⭐⭐⭐⭐ | 15 clientes ativos

Depoimento 2:
"A qualidade dos relatórios subiu muito. O template 
com emojis deixa a mensagem profissional mas amigável. 
Recebi elogios de clientes que nunca comentavam nada."
— Marina Costa, Gestora de Tráfego
   ⭐⭐⭐⭐⭐ | 8 clientes ativos

Depoimento 3:
"O melhor é o alerta automático. Antes eu descobria 
problema na campanha quando cliente reclamava. Agora 
eu fico sabendo antes dele."
— Pedro Mendes, Founder AgênciaX
   ⭐⭐⭐⭐⭐ | 22 clientes ativos
```

#### Métricas de Impacto:
```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│    +50     │  │  +10.000   │  │   40h      │  │   4.9/5    │
│  Agências  │  │ Relatórios │  │  Economia  │  │ Avaliação  │
│   Ativas   │  │   /mês     │  │   /mês     │  │   Média    │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
```

#### Efeitos:
- Cards de depoimento com avatar e estrelas
- Carousel automático (ou grid estático)
- Números com contador animado (count up)
- Logos de agências (se autorizado)
- Hover effect nos cards

---

### SEÇÃO 7: COMPARATIVO
**Objetivo:** Mostrar vantagem competitiva

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚖️ Nexus AI vs. Fazer Manual                              │
│                                                             │
│  ┌─────────────────────────┬─────────────────────────────┐ │
│  │       MANUAL ❌         │       NEXUS AI ✅           │ │
│  ├─────────────────────────┼─────────────────────────────┤ │
│  │ 20-30 min por cliente   │ 0 minutos (automático)      │ │
│  │ Copia/cola de dados     │ Dados direto da API         │ │
│  │ Formatação inconsist.   │ Templates profissionais     │ │
│  │ Esquece de enviar       │ Nunca esquece               │ │
│  │ Sem alertas             │ Alertas automáticos         │ │
│  │ Gráficos? Só em reunião │ Dashboard 24/7              │ │
│  │ PDF? Muito trabalho     │ 1 clique                    │ │
│  └─────────────────────────┴─────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Copy:
```
[H2]
Por que o Nexus AI?

[Tabela comparativa visual]
| Aspecto              | Trabalho Manual | Nexus AI        |
|---------------------|-----------------|-----------------|
| Tempo por cliente   | 20-30 min/dia   | 0 minutos       |
| Risco de erro       | Alto            | Zero            |
| Consistência        | Depende do dia  | Sempre igual    |
| Profissionalismo    | Varia           | Sempre alto     |
| Escalabilidade      | Limitada        | Ilimitada       |
| Alertas proativos   | Não existe      | Automático      |
| Custo real          | Seu tempo       | R$X/mês         |

[Destaque]
💡 Seu tempo vale quanto?
Se você cobra R$150/hora e gasta 40h/mês em relatórios,
são R$6.000 de custo oculto. O Nexus AI custa uma fração disso.
```

#### Efeitos:
- Tabela com animação de entrada (stagger)
- ✅ e ❌ coloridos e destacados
- Highlight na coluna do Nexus AI
- Calculator widget (quanto você economiza)

---

### SEÇÃO 8: PRICING
**Objetivo:** Converter interesse em ação

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💰 Planos simples, sem surpresas                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────┐     │
│  │   STARTER   │  │    PRO ⭐       │  │   AGENCY    │     │
│  │             │  │   MAIS POPULAR  │  │             │     │
│  │   Grátis    │  │    R$97/mês    │  │  R$297/mês  │     │
│  │             │  │                 │  │             │     │
│  │ • 3 contas  │  │ • 15 contas     │  │ • Ilimitado │     │
│  │ • 1 envio   │  │ • Envio diário  │  │ • White-lab │     │
│  │   /semana   │  │ • Templates     │  │ • API       │     │
│  │             │  │ • PDF           │  │ • Suporte   │     │
│  │             │  │ • Alertas       │  │   Priority  │     │
│  │             │  │                 │  │             │     │
│  │ [Começar]   │  │ [Assinar Pro]   │  │ [Falar c/   │     │
│  │             │  │                 │  │  Vendas]    │     │
│  └─────────────┘  └─────────────────┘  └─────────────┘     │
│                                                             │
│  🔒 Cancele quando quiser | 💳 Pague com PIX ou Cartão    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Copy Pricing:

```
[H2]
Invista em produtividade

[Subheadline]
Economize +40 horas por mês por menos que uma pizza.

---

STARTER - Grátis para sempre
Para experimentar o Nexus AI
• Até 3 contas de anúncio
• 1 relatório por semana
• Templates básicos
• Dashboard completo
[Começar Grátis]

---

PRO - R$97/mês ⭐ MAIS POPULAR
Para gestores de tráfego
• Até 15 contas de anúncio
• Relatórios diários ilimitados
• Todos os templates
• Geração de PDF
• Alertas automáticos
• Suporte por WhatsApp
[Assinar o Pro] - 7 dias grátis

---

AGENCY - R$297/mês
Para agências em escala
• Contas ilimitadas
• White-label (sua marca)
• API de integração
• Suporte prioritário
• Onboarding dedicado
• Multi-usuários
[Falar com Vendas]

---

[Garantias]
🔒 Cancele quando quiser, sem multa
💳 PIX, Cartão ou Boleto
🎁 7 dias grátis no plano Pro
✅ Satisfação garantida ou devolvemos
```

#### Efeitos:
- Card PRO destacado (scale, border, badge)
- Toggle mensal/anual com desconto
- Animação de "economize X%" no anual
- Hover effect nos cards
- Selo de garantia animado

---

### SEÇÃO 9: FAQ
**Objetivo:** Eliminar objeções

#### Perguntas e Respostas:

```
❓ É seguro conectar minha conta do Facebook?
✅ 100% seguro. Usamos OAuth 2.0, o mesmo padrão que Google, 
   Apple e Microsoft. Nunca temos acesso à sua senha. 
   A permissão é apenas de leitura.

❓ Funciona com qualquer conta de anúncios?
✅ Sim! Funciona com contas pessoais, Business Manager, 
   e contas de clientes que você gerencia. Basta ter 
   permissão de gestor/analista.

❓ O que acontece se o token expirar?
✅ Nosso sistema usa tokens de 60 dias e avisa você 
   antes de expirar. Renovar é só clicar em um botão.

❓ Posso personalizar a mensagem enviada?
✅ Sim! Temos 7 templates prontos e você pode criar 
   os seus próprios usando variáveis dinâmicas.

❓ Funciona com WhatsApp normal ou precisa ser Business?
✅ Funciona com qualquer WhatsApp! Enviamos via webhook 
   para seu número configurado (usando Evolution API, 
   N8N, ou similar).

❓ Quanto tempo para configurar tudo?
✅ Menos de 5 minutos. É só conectar o Facebook, 
   colocar o WhatsApp do cliente e pronto.

❓ E se eu precisar de ajuda?
✅ Temos suporte via WhatsApp em horário comercial. 
   Clientes Pro e Agency têm prioridade.

❓ Posso cancelar quando quiser?
✅ Sim! Sem fidelidade, sem multa. Cancele com um clique 
   diretamente no painel.
```

#### Efeitos:
- Accordion expandível
- Animação suave de abertura
- Ícone de + que vira - ao abrir
- Destaque na pergunta mais comum

---

### SEÇÃO 10: CTA FINAL
**Objetivo:** Última chance de converter

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ██████████████████████████████████████████████████████    │
│  █                                                    █    │
│  █   🚀 Pronto para economizar +40 horas/mês?        █    │
│  █                                                    █    │
│  █   Comece grátis agora e veja a mágica acontecer.  █    │
│  █                                                    █    │
│  █   [🔵 CRIAR MINHA CONTA GRÁTIS]                   █    │
│  █                                                    █    │
│  █   ✅ Setup em 5 min  ✅ Sem cartão  ✅ Cancele qdo quiser█
│  █                                                    █    │
│  ██████████████████████████████████████████████████████    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Copy:
```
[H2 Grande]
Pronto para automatizar seus relatórios?

[Subheadline]
Junte-se a +50 agências que já economizam 
40 horas por mês com o Nexus AI.

[CTA Principal - Botão gigante]
🚀 CRIAR MINHA CONTA GRÁTIS

[Micro-copy abaixo do botão]
✅ Setup em 5 minutos
✅ Não precisa de cartão
✅ Cancele quando quiser

[Urgência sutil]
🔥 Últimas 10 vagas do plano Starter gratuito
```

#### Efeitos:
- Background gradiente escuro (indigo → purple)
- Botão com glow pulsante
- Confetti ao passar mouse no botão
- Partículas flutuantes no fundo
- Contador de vagas (opcional)

---

### SEÇÃO 11: FOOTER
**Objetivo:** Links e credibilidade

#### Conteúdo:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Logo Nexus AI]                                            │
│                                                             │
│  Produto        Recursos        Empresa       Legal        │
│  • Features     • Blog          • Sobre       • Termos     │
│  • Pricing      • Docs          • Contato     • Privacidade│
│  • Changelog    • API           • Carreiras   • LGPD       │
│  • Roadmap      • Status        • Parceiros                │
│                                                             │
│  📧 contato@nexusai.com.br | 📱 WhatsApp: (11) 99999-9999 │
│                                                             │
│  [LinkedIn] [Instagram] [YouTube]                          │
│                                                             │
│  © 2025 Nexus AI. Todos os direitos reservados.           │
│  Feito com ❤️ no Brasil                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎬 ANIMAÇÕES E MICRO-INTERAÇÕES

### Animações de Entrada (Scroll Reveal)
```css
/* Fade up */
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}
.reveal.active {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children */
.stagger-children > * {
  opacity: 0;
  transform: translateY(20px);
}
.stagger-children.active > *:nth-child(1) { transition-delay: 0.1s; }
.stagger-children.active > *:nth-child(2) { transition-delay: 0.2s; }
.stagger-children.active > *:nth-child(3) { transition-delay: 0.3s; }
```

### Hover Effects
```css
/* Card lift */
.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.15);
}

/* Button glow */
.btn-primary:hover {
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.4);
}

/* Icon bounce */
.icon:hover {
  animation: bounce 0.5s ease;
}
```

### Animações Especiais
```css
/* Gradient text shimmer */
.shimmer {
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1);
  background-size: 200% auto;
  -webkit-background-clip: text;
  animation: shimmer 3s linear infinite;
}

/* Floating elements */
.float {
  animation: float 6s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* Pulse badge */
.pulse::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: inherit;
  animation: pulse 2s ease-out infinite;
}
```

---

## 📱 RESPONSIVIDADE

### Breakpoints
```css
/* Mobile first */
sm: 640px   /* Tablets pequenos */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop pequeno */
xl: 1280px  /* Desktop */
2xl: 1536px /* Desktop grande */
```

### Adaptações Mobile
- Hero: H1 menor (40px), botões full-width, stacked
- Features: Grid 1 coluna
- Pricing: Cards stacked, PRO primeiro
- FAQ: Accordion sempre (não side-by-side)
- Footer: Links em accordion ou menu hamburguer

---

## 🔧 TECNOLOGIAS RECOMENDADAS

### Para Desenvolvimento
```
Framework: Next.js 14 (App Router) ou Astro
Styling: Tailwind CSS + Framer Motion
Components: shadcn/ui ou Radix UI
Icons: Lucide Icons
Fonts: Google Fonts (Inter)
Analytics: Vercel Analytics ou Plausible
Forms: React Hook Form + Zod
```

### Para Assets
```
Ilustrações: unDraw, Storyset, ou custom
Mockups: Figma + Shots.so
Screenshots: CleanShot X
Video: Loom ou Screen Studio
```

---

## 📊 TRACKING E CONVERSÃO

### Eventos para Rastrear
```javascript
// Hero
trackEvent('hero_cta_click', { button: 'primary' })
trackEvent('hero_demo_click')

// Pricing
trackEvent('pricing_view')
trackEvent('pricing_plan_select', { plan: 'pro' })

// CTA Final
trackEvent('final_cta_click')

// Conversão
trackEvent('signup_start')
trackEvent('signup_complete')
trackEvent('facebook_connect')
```

### Ferramentas
- Vercel Analytics (pageviews)
- PostHog ou Mixpanel (eventos)
- Hotjar (heatmaps, recordings)
- Google Search Console (SEO)

---

## 🎯 CHECKLIST FINAL

### UX/UI
- [ ] Hero carrega em < 3s
- [ ] Botões têm estados hover/active/loading
- [ ] Formulários têm validação inline
- [ ] Mobile first implementado
- [ ] Dark mode (opcional mas desejável)
- [ ] Animações não causam lag
- [ ] Acessibilidade (ARIA, contraste)

### Conversão
- [ ] CTA visível above the fold
- [ ] Social proof próximo ao CTA
- [ ] Pricing claro e sem pegadinhas
- [ ] FAQ responde objeções principais
- [ ] Garantia/segurança visível

### Performance
- [ ] Lighthouse > 90 em tudo
- [ ] Imagens otimizadas (WebP, lazy load)
- [ ] Fonts com font-display: swap
- [ ] JS/CSS minificado
- [ ] CDN para assets estáticos

### SEO
- [ ] Title tag otimizado
- [ ] Meta description com CTA
- [ ] Open Graph tags
- [ ] Schema markup (Product, FAQ)
- [ ] Sitemap.xml
- [ ] robots.txt

---

## 🚀 PRÓXIMOS PASSOS

1. **Validar estrutura** com stakeholders
2. **Criar wireframes** no Figma (low-fi)
3. **Desenvolver mockup** high-fidelity
4. **Aprovar design** final
5. **Desenvolver** com Next.js/Astro
6. **Testar** responsividade e performance
7. **Lançar** com tracking ativo
8. **Iterar** baseado em dados

---

**Documento criado para Nexus AI**
**Versão 1.0 - Novembro 2025**
