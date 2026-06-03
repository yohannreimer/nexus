# 📋 Nexus AI - Documentação Completa de Funcionalidades

> **Versão:** 1.0  
> **Última atualização:** Janeiro 2025  
> **Produto:** Nexus AI - Sistema de Relatórios Automatizados para Facebook Ads

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Dashboard de Performance](#dashboard-de-performance)
3. [Gráficos e Visualizações](#gráficos-e-visualizações)
4. [Sistema de Templates](#sistema-de-templates)
5. [Geração de PDFs](#geração-de-pdfs)
6. [Envio de Relatórios](#envio-de-relatórios)
7. [Configurações de Cliente](#configurações-de-cliente)
8. [Configurações da Agência](#configurações-da-agência)
9. [Integrações](#integrações)

---

## 🎯 Visão Geral

O **Nexus AI** é uma plataforma SaaS completa para gestores de tráfego e agências de marketing digital que automatiza a geração e envio de relatórios de performance do Facebook Ads.

### Principais Diferenciais

- ✅ **Automatização Total:** Relatórios diários enviados automaticamente via WhatsApp
- ✅ **Templates Personalizáveis:** 8+ templates prontos + criação ilimitada
- ✅ **PDFs Profissionais:** Relatórios com branding da agência
- ✅ **Dados em Tempo Real:** Integração direta com Facebook Marketing API v23.0
- ✅ **Multi-cliente:** Gerencie todos os clientes em um único painel
- ✅ **White Label:** Sua marca nos relatórios

---

## 📊 Dashboard de Performance

### KPIs Principais (Cards)

O dashboard exibe 4 métricas principais em destaque:

| Métrica | Descrição | Formato |
|---------|-----------|---------|
| **Gasto Total** | Investimento total no período | R$ 0,00 |
| **Impressões** | Total de vezes que os anúncios foram exibidos | Número |
| **Cliques** | Total de cliques nos anúncios | Número |
| **CTR Médio** | Taxa de cliques média | 0,00% |

### Filtros de Período

O usuário pode visualizar dados em diferentes períodos:

- ⏱️ **Últimos 7 dias** (padrão)
- ⏱️ **Últimos 30 dias**
- ⏱️ **Últimos 60 dias**
- 📅 **Período Personalizado** (data início + data fim)

### Filtro por Objetivo de Campanha

Filtre campanhas por objetivo:

| Objetivo | Cor | Emoji |
|----------|-----|-------|
| Tráfego | Azul (#3b82f6) | 📈 |
| Vendas | Verde (#22c55e) | 🛒 |
| Leads/Conversas | Roxo (#8b5cf6) | 💬 |
| Engajamento | Rosa (#ec4899) | ❤️ |
| Reconhecimento | Amarelo (#f59e0b) | 👀 |
| Apps | Ciano (#06b6d4) | 📱 |
| Alcance | Índigo (#6366f1) | 🎯 |

---

## 📈 Gráficos e Visualizações

### 1. Evolução de Gasto (AreaChart)

```
Tipo: Gráfico de Área
Dados: Gasto diário ao longo do período
Cor: Gradiente azul (#3b82f6 → transparente)
Tooltip: Data + Valor em R$
```

**Visualização:**
```
    R$
    │     ┌─────┐
    │    ╱       ╲
    │   ╱         ╲────
    │  ╱               ╲
    │ ╱                 ╲
    └──────────────────────► Dias
```

### 2. Evolução de CTR e CPC (LineChart)

```
Tipo: Gráfico de Linhas (2 linhas)
Linha 1: CTR (%) - Cor verde (#22c55e)
Linha 2: CPC (R$) - Cor azul (#3b82f6)
Eixo Y: Duplo (% e R$)
```

**Visualização:**
```
    %  │ CTR                         R$
       │    ╱╲                      
   2.5 │   ╱  ╲     ╱╲             1.50
       │  ╱    ╲   ╱  ╲  CPC       
   1.5 │ ╱      ╲ ╱    ╲──         1.00
       │╱        ╳              
   0.5 │        ╱ ╲                0.50
       └─────────────────────────►
```

### 3. Distribuição por Objetivo (PieChart)

```
Tipo: Gráfico de Pizza
Dados: % de gasto por objetivo
Cores: Conforme tabela de objetivos
Legenda: Nome do objetivo + Percentual
```

**Visualização:**
```
        ┌─────────────┐
       ╱   Tráfego    ╲
      │     45%        │
      │  ╱─────────╲   │
      │ │  Vendas   │  │
      │ │   35%     │  │
      │  ╲─────────╱   │
       ╲   Leads 20%  ╱
        └─────────────┘
```

### 4. Distribuição por Campanha (PieChart)

```
Tipo: Gráfico de Pizza
Dados: Gasto por campanha individual
Limite: Top 6 campanhas + "Outras"
Tooltip: Nome da campanha + Valor
```

### 5. Gasto por Objetivo (BarChart Horizontal)

```
Tipo: Gráfico de Barras Horizontal
Dados: Gasto total por tipo de objetivo
Ordenação: Maior → Menor
Cores: Conforme tabela de objetivos
```

**Visualização:**
```
Tráfego    ████████████████████ R$ 5.000
Vendas     ██████████████      R$ 3.500
Leads      ████████            R$ 2.000
Engajamento ████               R$ 1.000
```

### 6. CTR por Campanha (BarChart Horizontal)

```
Tipo: Gráfico de Barras Horizontal
Dados: CTR de cada campanha
Ordenação: Maior → Menor
Cor: Verde (#22c55e)
```

### 7. Tabela de Campanhas

Tabela completa com todas as métricas por campanha:

| Coluna | Descrição |
|--------|-----------|
| **Objetivo** | Badge colorido com emoji |
| **Campanha** | Nome da campanha |
| **Gasto** | Investimento (R$) |
| **Impressões** | Total de impressões |
| **Cliques** | Total de cliques |
| **CTR** | Taxa de cliques (%) |

**Badges de CTR:**
- 🟢 CTR ≥ 2% → Verde (bom)
- 🟡 CTR ≥ 1% → Amarelo (médio)
- 🔴 CTR < 1% → Vermelho (baixo)

---

## 📝 Sistema de Templates

### Templates Pré-definidos (8 templates)

#### 1. Relatório Diário Padrão (`default_daily`)
```
📊 *Relatório Diário – {{data}}*

*Visão Geral*
• 💸 Gasto total: {{gasto_total}}
• 👀 Impressões: {{impressoes}}
• 🖱️ Cliques: {{cliques}} → CTR: {{ctr}}
• 💰 CPC: {{cpc}} | CPM: {{cpm}}
• 🛒 Vendas: {{vendas}} ({{cpa}} por venda)
• 💬 Conversas: {{conversas}} ({{custo_conversa}} por conversa)

*Destaques*
• Melhor CTR: {{melhor_ctr_valor}} na "{{melhor_ctr_campanha}}"
• Melhor CPC: {{melhor_cpc_valor}} na "{{melhor_cpc_campanha}}"
• Maior investimento: {{maior_gasto_valor}} em "{{maior_gasto_campanha}}"
• Mais vendas: {{mais_vendas_valor}} em "{{mais_vendas_campanha}}"

Qualquer dúvida, estou à disposição.
```

#### 2. Resumo Simples (`simple`)
```
📊 *Resumo {{periodo}}*

💸 Gasto: {{gasto_total}}
👀 Impressões: {{impressoes}}
🖱️ Cliques: {{cliques}} (CTR {{ctr}})
🛒 Vendas: {{vendas}}

Qualquer dúvida, me avise!
```

#### 3. Relatório Detalhado (`detailed`)
```
📊 *Relatório Completo – {{data}}*

*📈 Performance Geral*
• Gasto Total: {{gasto_total}}
• Impressões: {{impressoes}} | Alcance: {{alcance}}
• Cliques: {{cliques}} | CTR: {{ctr}}
• CPC Médio: {{cpc}} | CPM: {{cpm}}

*🎯 Resultados*
• Vendas: {{vendas}} (CPA: {{cpa}})
• Conversas: {{conversas}} (Custo: {{custo_conversa}})

*⭐ Campanhas Destaque*
🏆 Melhor CTR: {{melhor_ctr_campanha}} ({{melhor_ctr_valor}})
💎 Melhor CPC: {{melhor_cpc_campanha}} ({{melhor_cpc_valor}})
💸 Maior Gasto: {{maior_gasto_campanha}} ({{maior_gasto_valor}})
🎯 Mais Vendas: {{mais_vendas_campanha}} ({{mais_vendas_valor}})

*⚠️ Alertas*
{{alertas_lista}}

Análise automática gerada por Nexus AI 🤖
```

#### 4. E-commerce Focus (`ecommerce`)
```
🛒 *Relatório de Vendas – {{data}}*

*💰 Resultados*
• Vendas: {{vendas}} unidades
• Investimento: {{gasto_total}}
• CPA: {{cpa}}

*📊 Tráfego*
• Cliques: {{cliques}}
• CTR: {{ctr}}
• CPC: {{cpc}}

*🏆 Destaque*
Campanha com melhor performance:
"{{mais_vendas_campanha}}" - {{mais_vendas_valor}} vendas

Continue assim! 🚀
```

#### 5. Geração de Leads (`leads`)
```
💬 *Relatório de Leads – {{data}}*

*🎯 Conversões*
• Conversas Iniciadas: {{conversas}}
• Custo por Conversa: {{custo_conversa}}
• Investimento Total: {{gasto_total}}

*📈 Tráfego*
• Impressões: {{impressoes}}
• Cliques: {{cliques}}
• CTR: {{ctr}}

*⭐ Melhor Campanha*
{{melhor_ctr_campanha}}
CTR: {{melhor_ctr_valor}}

Ótimo trabalho! 👏
```

#### 6. Por Campanha Detalhado (`por_campanha`)
```
📊 *Relatório – {{data}}*

*💰 Total Investido: {{gasto_total}}*

{{detalhes_por_campanha}}

*📈 Resumo Geral*
• Cliques: {{cliques}} | CTR: {{ctr}}
• Vendas: {{vendas}} | Conversas: {{conversas}}

Qualquer dúvida, estou à disposição!
```

**Exemplo de saída `{{detalhes_por_campanha}}`:**
```
📈 *Campanha Black Friday*
   💸 R$ 450,00 | 🖱️ 320 cliques | CTR: 2,45%

🛒 *Campanha Vendas Natal*
   💸 R$ 380,00 | 🛒 15 vendas | CPA: R$ 25,33

💬 *Campanha Leads WhatsApp*
   💸 R$ 200,00 | 💬 45 conversas | CPL: R$ 4,44
```

#### 7. Por Objetivo Agrupado (`por_objetivo`)
```
📊 *Relatório por Objetivo – {{data}}*

*💰 Total Investido: {{gasto_total}}*

{{resumo_por_objetivo}}

*📈 Visão Geral*
• Impressões: {{impressoes}}
• Cliques: {{cliques}} (CTR {{ctr}})

Estou à disposição! 🚀
```

**Exemplo de saída `{{resumo_por_objetivo}}`:**
```
🛒 *Vendas* (3 campanhas)
• 💰 Gasto: R$ 1.200,00
• 🖱️ Cliques: 890 | CTR: 2,15%
• 🛒 Vendas: 45 | CPA: R$ 26,67

📈 *Tráfego* (2 campanhas)
• 💰 Gasto: R$ 500,00
• 🖱️ Cliques: 1.200 | CTR: 3,45%
• 💵 CPC: R$ 0,42

💬 *Leads/Conversas* (1 campanha)
• 💰 Gasto: R$ 300,00
• 🖱️ Cliques: 450 | CTR: 1,89%
• 💬 Conversas: 67 | CPL: R$ 4,48
```

#### 8. Vendas + Tráfego (`vendas_trafego`)
```
📊 *Relatório – {{data}}*

*💰 Total Investido: {{gasto_total}}*

{{campanhas_vendas}}

{{campanhas_trafego}}

*📊 Performance Geral*
• CTR Médio: {{ctr}}
• CPC Médio: {{cpc}}

Qualquer dúvida, estou à disposição!
```

### Variáveis Disponíveis (30+ variáveis)

#### Variáveis de Data
| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{data}}` | Data do relatório | 15/01/2025 |
| `{{periodo}}` | Período analisado | Últimos 7 dias |

#### Variáveis de Métricas Gerais
| Variável | Descrição | Formato |
|----------|-----------|---------|
| `{{gasto_total}}` | Gasto total | R$ 1.234,56 |
| `{{impressoes}}` | Total de impressões | 45.000 |
| `{{alcance}}` | Alcance total | 38.000 |
| `{{cliques}}` | Total de cliques | 890 |
| `{{ctr}}` | CTR médio | 1,98% |
| `{{cpc}}` | CPC médio | R$ 1,41 |
| `{{cpm}}` | CPM médio | R$ 27,79 |
| `{{campanhas}}` | Número de campanhas | 5 |

#### Variáveis de Conversões
| Variável | Descrição | Formato |
|----------|-----------|---------|
| `{{vendas}}` | Total de vendas | 23 |
| `{{cpa}}` | Custo por aquisição | R$ 54,37 |
| `{{conversas}}` | Total de conversas | 45 |
| `{{custo_conversa}}` | Custo por conversa | R$ 27,79 |

#### Variáveis de Destaques
| Variável | Descrição |
|----------|-----------|
| `{{melhor_ctr_campanha}}` | Nome da campanha com melhor CTR |
| `{{melhor_ctr_valor}}` | Valor do melhor CTR |
| `{{melhor_cpc_campanha}}` | Nome da campanha com melhor CPC |
| `{{melhor_cpc_valor}}` | Valor do melhor CPC |
| `{{maior_gasto_campanha}}` | Campanha com maior investimento |
| `{{maior_gasto_valor}}` | Valor do maior investimento |
| `{{mais_vendas_campanha}}` | Campanha com mais vendas |
| `{{mais_vendas_valor}}` | Quantidade de vendas |

#### Variáveis de Alertas
| Variável | Descrição |
|----------|-----------|
| `{{alertas_count}}` | Número de campanhas em alerta |
| `{{alertas_lista}}` | Lista formatada de alertas |

#### Variáveis Avançadas (Por Campanha/Objetivo)
| Variável | Descrição |
|----------|-----------|
| `{{detalhes_por_campanha}}` | Lista detalhada de cada campanha |
| `{{resumo_por_objetivo}}` | Resumo agrupado por objetivo |
| `{{campanhas_vendas}}` | Métricas das campanhas de Vendas |
| `{{campanhas_trafego}}` | Métricas das campanhas de Tráfego |
| `{{campanhas_leads}}` | Métricas das campanhas de Leads |
| `{{top_3_campanhas}}` | Top 3 campanhas por investimento |

### Criação de Templates Customizados

O usuário pode:

1. ✅ **Editar templates existentes** - Modificar qualquer template padrão
2. ✅ **Salvar como novo** - Criar cópia com nome personalizado
3. ✅ **Usar qualquer variável** - Combinar variáveis livremente
4. ✅ **Preview em tempo real** - Ver como ficará a mensagem
5. ✅ **Associar a clientes** - Cada cliente pode ter seu template

---

## 📄 Geração de PDFs

### Características do PDF

- **Formato:** A4 Portrait
- **Qualidade:** Alta (scale 2x)
- **Margens:** 10mm (20mm inferior)
- **Fonte:** Segoe UI / System

### Estrutura do PDF

```
┌─────────────────────────────────────┐
│ [LOGO]  Nome da Agência             │
│         Relatório de Performance    │
│         Cliente: [NOME]             │
│         Período: [DATAS]            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │     RESUMO DO PERÍODO           │ │
│ │   (Seção Hero com Gradiente)    │ │
│ │                                 │ │
│ │  Investimento | Impressões      │ │
│ │  Cliques      | CTR Médio       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📈 MÉTRICAS DETALHADAS              │
│ ┌────────┬────────┬────────┬──────┐ │
│ │ CPC    │ CPM    │ Alcance│ Conv.│ │
│ └────────┴────────┴────────┴──────┘ │
│                                     │
│ ⭐ DESTAQUES DO PERÍODO             │
│ ┌─────────────────┬───────────────┐ │
│ │ 🏆 Melhor CTR   │ 💎 Melhor CPC │ │
│ ├─────────────────┼───────────────┤ │
│ │ 💰 Maior Gasto  │ 🎯 Mais Conv. │ │
│ └─────────────────┴───────────────┘ │
│                                     │
│ 📋 PERFORMANCE POR CAMPANHA         │
│ ┌─────────────────────────────────┐ │
│ │ Campanha | Gasto | Impr | CTR   │ │
│ │─────────────────────────────────│ │
│ │ Camp 1   | R$ XX | XXXX | X,XX% │ │
│ │ Camp 2   | R$ XX | XXXX | X,XX% │ │
│ └─────────────────────────────────┘ │
│                                     │
│         Relatório gerado em XX/XX   │
│            [NOME DA AGÊNCIA]        │
│       email • telefone • website    │
└─────────────────────────────────────┘
```

### Branding Personalizado

O PDF inclui automaticamente:

- ✅ **Logo da agência** (PNG, JPG ou SVG)
- ✅ **Cores da marca** (primária e secundária)
- ✅ **Informações de contato** (email, telefone, website)
- ✅ **Rodapé personalizado**

### Badge de CTR

O PDF usa badges coloridos para CTR:
- 🟢 **CTR ≥ 2%** → Badge verde
- 🟡 **CTR 1-2%** → Badge amarelo
- 🔴 **CTR < 1%** → Badge vermelho

---

## 📤 Envio de Relatórios

### Modos de Envio

#### 1. Envio Automático (Agendado)

```
✅ Ativado por cliente
📅 Todos os dias
⏰ Horário configurável (padrão: 08:00)
📊 Relatório do dia anterior
📱 Via WhatsApp
```

Configuração:
- Toggle ON/OFF por cliente
- Horário personalizável
- Campanhas selecionáveis

#### 2. Envio Manual

Permite enviar relatórios personalizados a qualquer momento:

**Períodos disponíveis:**
- Hoje
- Ontem
- Últimos 7 dias
- Últimos 30 dias
- Período personalizado (data início + fim)

**Funcionalidades:**
- Escolha do template
- Preview da mensagem antes de enviar
- Dados reais do Facebook
- WhatsApp destino configurável

### Preview de Mensagem (Estilo WhatsApp)

O modal exibe um preview realista:

```
┌─────────────────────────────────────┐
│  ┌──┐  Cliente Nome                 │
│  └──┘  Nexus AI Bot                 │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📊 *Relatório Diário*       │    │
│  │                             │    │
│  │ 💸 Gasto: R$ 1.250,00       │    │
│  │ 👀 Impressões: 45.000       │    │
│  │ 🖱️ Cliques: 890             │    │
│  │ ...                         │    │
│  │                       08:00 │    │
│  └─────────────────────────────┘    │
│                                     │
│        ✅ Dados reais do Facebook   │
└─────────────────────────────────────┘
```

---

## ⚙️ Configurações de Cliente

### Modal de Edição (5 Abas)

#### Aba 1: Configurações Gerais

| Campo | Descrição |
|-------|-----------|
| **WhatsApp** | Número de destino (formato: 5511999999999) |
| **Horário** | Hora do envio automático (HH:MM) |
| **Toggle Automático** | Ativa/desativa envio diário |

#### Aba 2: Campanhas

- Lista todas as campanhas da conta
- Checkbox para selecionar campanhas
- **Botões rápidos:**
  - "Selecionar Todas"
  - "Selecionar Todas Ativas"
- Contador de selecionadas

#### Aba 3: Template

- Dropdown com todos os templates
- Editor de texto do template
- Preview em tempo real (estilo WhatsApp)
- Botão "Salvar como Novo Template"
- Lista de variáveis disponíveis

#### Aba 4: Envio Manual

- Seletor de período (5 opções + custom)
- Date pickers para período personalizado
- Seletor de template
- Preview da mensagem com dados reais
- Botão "Enviar Relatório Agora"

#### Aba 5: Preview HTML

- Visualização do relatório completo
- Botão "Carregar Preview"
- Botão "Baixar PDF"

---

## 🏢 Configurações da Agência

### Aba 1: Dados Gerais

| Campo | Descrição |
|-------|-----------|
| **Nome** | Nome da agência |
| **E-mail** | E-mail de contato |
| **Telefone** | Telefone/WhatsApp |
| **Website** | URL do site |
| **Endereço** | Endereço completo |
| **CNPJ** | CNPJ da empresa |

### Aba 2: Marca & Visual

| Campo | Descrição |
|-------|-----------|
| **Logo** | Upload de imagem (PNG, JPG, SVG) |
| **Cor Primária** | Color picker + código HEX |
| **Cor Secundária** | Color picker + código HEX |
| **Preview** | Visualização das cores em gradiente |

### Aba 3: Relatórios

| Campo | Descrição |
|-------|-----------|
| **Horário Padrão** | Horário default para novos clientes |
| **Rodapé** | Texto do rodapé dos PDFs |

Variável especial: `{{agency_name}}` → Nome da agência

---

## 🔌 Integrações

### Facebook Marketing API

- **Versão:** v23.0
- **Autenticação:** OAuth 2.0
- **Dados coletados:**
  - Contas de anúncio
  - Campanhas
  - Insights (métricas)
  - Actions (conversões)

### Supabase

- **Auth:** Autenticação de usuários
- **Database:** PostgreSQL
  - Tabela `clients` (clientes)
  - Tabela `agency_settings` (configurações)
- **Edge Functions:** Processamento serverless

### N8N Webhooks

- **Uso:** Envio de mensagens WhatsApp
- **Payload:**
  ```json
  {
    "whatsappNumber": "5511999999999",
    "reportContent": "Mensagem formatada...",
    "clientName": "Nome do Cliente",
    "adAccountId": "act_123456789"
  }
  ```

---

## 📱 Tecnologias Utilizadas

| Categoria | Tecnologia |
|-----------|------------|
| **Frontend** | React 19 + TypeScript |
| **Build** | Vite |
| **Estilização** | TailwindCSS |
| **Gráficos** | Recharts |
| **PDFs** | html2pdf.js |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **API** | Facebook Marketing API v23.0 |
| **WhatsApp** | N8N Webhooks |

---

## 🎨 Sistema de Cores

### Cores de Objetivo

```css
OUTCOME_TRAFFIC:     #3b82f6 (Azul)
OUTCOME_SALES:       #22c55e (Verde)
OUTCOME_LEADS:       #8b5cf6 (Roxo)
OUTCOME_ENGAGEMENT:  #ec4899 (Rosa)
OUTCOME_AWARENESS:   #f59e0b (Amarelo)
OUTCOME_APP:         #06b6d4 (Ciano)
LINK_CLICKS:         #6366f1 (Índigo)
CONVERSIONS:         #84cc16 (Lima)
MESSAGES:            #a855f7 (Violeta)
REACH:               #0ea5e9 (Sky)
```

### Cores de Status

```css
Ativo:   #22c55e (Verde)
Pausado: #f59e0b (Amarelo)
Erro:    #ef4444 (Vermelho)
```

---

## 🚀 Resumo de Funcionalidades

### ✅ Funcionalidades Implementadas

1. **Dashboard Completo**
   - 4 KPIs principais
   - 6 tipos de gráficos
   - Tabela de campanhas
   - Filtros de período e objetivo

2. **Sistema de Templates**
   - 8 templates pré-definidos
   - 30+ variáveis dinâmicas
   - Editor visual
   - Preview em tempo real
   - Criação de templates customizados

3. **Geração de PDFs**
   - Layout profissional A4
   - Branding da agência
   - Exportação direta

4. **Envio de Relatórios**
   - Automático (agendado)
   - Manual (períodos personalizados)
   - Via WhatsApp (N8N)
   - Preview antes de enviar

5. **Configurações**
   - Por cliente (WhatsApp, horário, campanhas, template)
   - Por agência (logo, cores, dados)

6. **Integrações**
   - Facebook Marketing API v23.0
   - Supabase (Auth + Database)
   - N8N Webhooks (WhatsApp)

---

> **Nexus AI** - Automatize seus relatórios. Impressione seus clientes. 🚀
