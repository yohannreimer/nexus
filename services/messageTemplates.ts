/**
 * Sistema de Templates de Mensagens WhatsApp
 * Permite criar templates customizáveis com variáveis dinâmicas
 */

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  isDefault?: boolean;
  createdAt: string;
}

// Variáveis disponíveis para uso nos templates
export const TEMPLATE_VARIABLES = {
  // Data
  '{{data}}': 'Data do relatório',
  '{{periodo}}': 'Período analisado (ex: Últimos 7 dias)',
  
  // Métricas Gerais
  '{{gasto_total}}': 'Gasto total formatado (R$ 123,45)',
  '{{impressoes}}': 'Total de impressões',
  '{{alcance}}': 'Alcance total',
  '{{cliques}}': 'Total de cliques',
  '{{ctr}}': 'CTR médio (%)',
  '{{cpc}}': 'CPC médio (R$)',
  '{{cpm}}': 'CPM médio (R$)',
  '{{campanhas}}': 'Número total de campanhas',
  
  // Conversões
  '{{vendas}}': 'Total de vendas/compras',
  '{{cpa}}': 'Custo por aquisição (R$)',
  '{{conversas}}': 'Total de conversas iniciadas',
  '{{custo_conversa}}': 'Custo por conversa (R$)',
  
  // Destaques
  '{{melhor_ctr_campanha}}': 'Nome da campanha com melhor CTR',
  '{{melhor_ctr_valor}}': 'Valor do melhor CTR',
  '{{melhor_cpc_campanha}}': 'Nome da campanha com melhor CPC',
  '{{melhor_cpc_valor}}': 'Valor do melhor CPC',
  '{{maior_gasto_campanha}}': 'Campanha com maior investimento',
  '{{maior_gasto_valor}}': 'Valor do maior investimento',
  '{{mais_vendas_campanha}}': 'Campanha com mais vendas',
  '{{mais_vendas_valor}}': 'Quantidade de vendas',
  
  // Alertas
  '{{alertas_count}}': 'Número de campanhas em alerta',
  '{{alertas_lista}}': 'Lista de campanhas com problemas',
  
  // POR CAMPANHA/OBJETIVO (NOVOS)
  '{{detalhes_por_campanha}}': 'Lista detalhada de cada campanha com métricas individuais',
  '{{resumo_por_objetivo}}': 'Resumo agrupado por tipo de objetivo (Vendas, Tráfego, Leads)',
  '{{campanhas_vendas}}': 'Métricas das campanhas de Vendas',
  '{{campanhas_trafego}}': 'Métricas das campanhas de Tráfego',
  '{{campanhas_leads}}': 'Métricas das campanhas de Leads/Conversas',
  '{{top_3_campanhas}}': 'As 3 campanhas com melhor performance',
};

// Templates pré-definidos
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'default_daily',
    name: 'Relatório Diário Padrão',
    description: 'Template completo com todas as métricas principais',
    isDefault: true,
    createdAt: new Date().toISOString(),
    template: `📊 *Relatório Diário – {{data}}*

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

Qualquer dúvida, estou à disposição.`
  },
  {
    id: 'simple',
    name: 'Resumo Simples',
    description: 'Template enxuto com métricas essenciais',
    isDefault: true,
    createdAt: new Date().toISOString(),
    template: `📊 *Resumo {{periodo}}*

💸 Gasto: {{gasto_total}}
👀 Impressões: {{impressoes}}
🖱️ Cliques: {{cliques}} (CTR {{ctr}})
🛒 Vendas: {{vendas}}

Qualquer dúvida, me avise!`
  },
  {
    id: 'detailed',
    name: 'Relatório Detalhado',
    description: 'Template completo com alertas e análises',
    isDefault: true,
    createdAt: new Date().toISOString(),
    template: `📊 *Relatório Completo – {{data}}*

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

Análise automática gerada por Nexus AI 🤖`
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Focus',
    description: 'Focado em vendas e ROAS',
    isDefault: true,
    createdAt: new Date().toISOString(),
    template: `🛒 *Relatório de Vendas – {{data}}*

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

Continue assim! 🚀`
  },
  {
    id: 'leads',
    name: 'Geração de Leads',
    description: 'Focado em conversas e leads',
    isDefault: true,
    createdAt: new Date().toISOString(),
    template: `💬 *Relatório de Leads – {{data}}*

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

Ótimo trabalho! 👏`
  },
  {
    id: 'por_campanha',
    name: '📊 Por Campanha (Detalhado)',
    description: 'Mostra cada campanha individualmente com suas métricas',
    isDefault: true,
    createdAt: new Date().toISOString(),
    template: `📊 *Relatório – {{data}}*

*💰 Total Investido: {{gasto_total}}*

{{detalhes_por_campanha}}

*📈 Resumo Geral*
• Cliques: {{cliques}} | CTR: {{ctr}}
• Vendas: {{vendas}} | Conversas: {{conversas}}

Qualquer dúvida, estou à disposição!`
  },
  {
    id: 'por_objetivo',
    name: '🎯 Por Objetivo (Agrupado)',
    description: 'Agrupa campanhas por tipo de objetivo (Vendas, Tráfego, Leads)',
    isDefault: true,
    createdAt: new Date().toISOString(),
    template: `📊 *Relatório por Objetivo – {{data}}*

*💰 Total Investido: {{gasto_total}}*

{{resumo_por_objetivo}}

*📈 Visão Geral*
• Impressões: {{impressoes}}
• Cliques: {{cliques}} (CTR {{ctr}})

Estou à disposição! 🚀`
  },
  {
    id: 'vendas_trafego',
    name: '🛒📈 Vendas + Tráfego',
    description: 'Template separado para quem roda campanhas de Vendas e Tráfego',
    isDefault: true,
    createdAt: new Date().toISOString(),
    template: `📊 *Relatório – {{data}}*

*💰 Total Investido: {{gasto_total}}*

{{campanhas_vendas}}

{{campanhas_trafego}}

*📊 Performance Geral*
• CTR Médio: {{ctr}}
• CPC Médio: {{cpc}}

Qualquer dúvida, estou à disposição!`
  }
];

/**
 * Mapeamento de objetivos do Facebook para nomes amigáveis
 */
const OBJECTIVE_LABELS: Record<string, { label: string; emoji: string }> = {
  'OUTCOME_SALES': { label: 'Vendas', emoji: '🛒' },
  'OUTCOME_TRAFFIC': { label: 'Tráfego', emoji: '📈' },
  'OUTCOME_LEADS': { label: 'Leads/Conversas', emoji: '💬' },
  'OUTCOME_ENGAGEMENT': { label: 'Engajamento', emoji: '❤️' },
  'OUTCOME_AWARENESS': { label: 'Reconhecimento', emoji: '👀' },
  'OUTCOME_APP_PROMOTION': { label: 'Apps', emoji: '📱' },
  'LINK_CLICKS': { label: 'Tráfego (Cliques)', emoji: '🔗' },
  'CONVERSIONS': { label: 'Conversões', emoji: '🎯' },
  'MESSAGES': { label: 'Mensagens', emoji: '💬' },
  'REACH': { label: 'Alcance', emoji: '👁️' },
  'BRAND_AWARENESS': { label: 'Reconhecimento', emoji: '🌟' },
  'POST_ENGAGEMENT': { label: 'Engajamento', emoji: '👍' },
  'VIDEO_VIEWS': { label: 'Visualizações', emoji: '🎬' },
};

/**
 * Obtém label e emoji do objetivo
 */
function getObjectiveInfo(objective: string): { label: string; emoji: string } {
  return OBJECTIVE_LABELS[objective] || { label: objective || 'Outros', emoji: '📊' };
}

/**
 * Gera texto formatado com detalhes de cada campanha individual
 */
function generateCampaignDetails(campaigns: any[]): string {
  if (!campaigns || campaigns.length === 0) {
    return '_Nenhuma campanha ativa_';
  }

  const formatCurrency = (val: any): string => {
    const num = parseFloat(val) || 0;
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  const formatPercent = (val: any): string => {
    const num = parseFloat(val) || 0;
    return `${num.toFixed(2).replace('.', ',')}%`;
  };

  const formatNumber = (val: any): string => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('pt-BR');
  };

  return campaigns.map((camp, index) => {
    const objInfo = getObjectiveInfo(camp.objective);
    
    // Suporta múltiplos formatos de dados (insights aninhados ou flat)
    const insights = camp.insights?.data?.[0] || camp.insights || {};
    
    // Usa dados diretos da campanha ou extrai dos insights
    const spend = parseFloat(camp.spend) || parseFloat(insights.spend) || 0;
    const clicks = parseInt(camp.clicks) || parseInt(insights.clicks) || 0;
    const impressions = parseInt(camp.impressions) || parseInt(insights.impressions) || 0;
    const ctr = parseFloat(camp.ctr) || parseFloat(insights.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0);
    const cpc = clicks > 0 ? spend / clicks : 0;
    
    // Extrair conversões/vendas das actions
    let purchases = camp.purchases || 0;
    let conversations = camp.conversations || 0;
    
    // Se não tem valores diretos, tenta extrair das actions
    const actions = insights.actions || camp.actions || [];
    if (Array.isArray(actions) && (!purchases && !conversations)) {
      actions.forEach((action: any) => {
        if (action.action_type === 'purchase' || action.action_type === 'omni_purchase') {
          purchases += parseInt(action.value) || 0;
        }
        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
            action.action_type === 'onsite_conversion.total_messaging_connection') {
          conversations += parseInt(action.value) || 0;
        }
      });
    }
    
    // Monta as métricas baseadas no objetivo
    let metricsLine = '';
    if (camp.objective?.includes('SALES') || camp.objective === 'CONVERSIONS') {
      // Sempre mostra vendas para campanhas de vendas
      const cpa = purchases > 0 ? formatCurrency(spend / purchases) : '-';
      metricsLine = `🛒 ${purchases} vendas | CPA: ${cpa}`;
    } else if (camp.objective?.includes('LEADS') || camp.objective === 'MESSAGES') {
      // Sempre mostra conversas para campanhas de leads
      const cpl = conversations > 0 ? formatCurrency(spend / conversations) : '-';
      metricsLine = `💬 ${conversations} conversas | CPL: ${cpl}`;
    } else {
      metricsLine = `🖱️ ${formatNumber(clicks)} cliques | CTR: ${formatPercent(ctr)}`;
    }
    
    return `${objInfo.emoji} *${camp.name}*
   💸 ${formatCurrency(spend)} | ${metricsLine}`;
  }).join('\n\n');
}

/**
 * Gera resumo agrupado por tipo de objetivo
 */
function generateObjectiveSummary(campaigns: any[]): string {
  if (!campaigns || campaigns.length === 0) {
    return '_Nenhuma campanha ativa_';
  }

  const formatCurrency = (val: number): string => `R$ ${val.toFixed(2).replace('.', ',')}`;
  const formatPercent = (val: number): string => `${val.toFixed(2).replace('.', ',')}%`;
  const formatNumber = (val: number): string => val.toLocaleString('pt-BR');

  // Agrupa campanhas por objetivo
  const grouped: Record<string, {
    spend: number;
    clicks: number;
    impressions: number;
    purchases: number;
    conversations: number;
    campaigns: string[];
    objective: string;
  }> = {};

  campaigns.forEach(camp => {
    const objective = camp.objective || 'UNKNOWN';
    if (!grouped[objective]) {
      grouped[objective] = {
        spend: 0,
        clicks: 0,
        impressions: 0,
        purchases: 0,
        conversations: 0,
        campaigns: [],
        objective
      };
    }

    // Suporta múltiplos formatos de dados
    const insights = camp.insights?.data?.[0] || camp.insights || {};
    
    grouped[objective].spend += parseFloat(camp.spend) || parseFloat(insights.spend) || 0;
    grouped[objective].clicks += parseInt(camp.clicks) || parseInt(insights.clicks) || 0;
    grouped[objective].impressions += parseInt(camp.impressions) || parseInt(insights.impressions) || 0;
    grouped[objective].campaigns.push(camp.name);

    // Valores diretos ou das actions
    let purchases = camp.purchases || 0;
    let conversations = camp.conversations || 0;
    
    const actions = insights.actions || camp.actions || [];
    if (Array.isArray(actions) && (!purchases && !conversations)) {
      actions.forEach((action: any) => {
        if (action.action_type === 'purchase' || action.action_type === 'omni_purchase') {
          purchases += parseInt(action.value) || 0;
        }
        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
            action.action_type === 'onsite_conversion.total_messaging_connection') {
          conversations += parseInt(action.value) || 0;
        }
      });
    }
    
    grouped[objective].purchases += purchases;
    grouped[objective].conversations += conversations;
  });

  // Gera texto para cada grupo de objetivo
  return Object.entries(grouped).map(([objective, data]) => {
    const objInfo = getObjectiveInfo(objective);
    const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
    const cpc = data.clicks > 0 ? data.spend / data.clicks : 0;

    let metricsLine = '';
    let resultLine = '';
    
    if (objective.includes('SALES') || objective === 'CONVERSIONS') {
      // Sempre mostra vendas para campanhas de vendas
      const cpa = data.purchases > 0 ? formatCurrency(data.spend / data.purchases) : '-';
      resultLine = `• 🛒 Vendas: ${data.purchases} | CPA: ${cpa}`;
      metricsLine = `• 💰 Gasto: ${formatCurrency(data.spend)}
• 🖱️ Cliques: ${formatNumber(data.clicks)} | CTR: ${formatPercent(ctr)}`;
    } else if (objective.includes('LEADS') || objective === 'MESSAGES') {
      // Sempre mostra conversas para campanhas de leads
      const cpl = data.conversations > 0 ? formatCurrency(data.spend / data.conversations) : '-';
      resultLine = `• 💬 Conversas: ${data.conversations} | CPL: ${cpl}`;
      metricsLine = `• 💰 Gasto: ${formatCurrency(data.spend)}
• 🖱️ Cliques: ${formatNumber(data.clicks)} | CTR: ${formatPercent(ctr)}`;
    } else {
      metricsLine = `• 💰 Gasto: ${formatCurrency(data.spend)}
• 🖱️ Cliques: ${formatNumber(data.clicks)} | CTR: ${formatPercent(ctr)}
• 💵 CPC: ${formatCurrency(cpc)}`;
    }

    const campaignCount = data.campaigns.length;
    const campaignLabel = campaignCount === 1 ? '1 campanha' : `${campaignCount} campanhas`;

    return `${objInfo.emoji} *${objInfo.label}* (${campaignLabel})
${metricsLine}${resultLine ? '\n' + resultLine : ''}`;
  }).join('\n\n');
}

/**
 * Gera texto para campanhas de um objetivo específico
 */
function generateCampaignsByObjective(campaigns: any[], targetObjectives: string[]): string {
  const filtered = campaigns?.filter(c => 
    targetObjectives.some(t => c.objective?.includes(t) || c.objective === t)
  ) || [];

  if (filtered.length === 0) {
    return '';
  }

  const formatCurrency = (val: number): string => `R$ ${val.toFixed(2).replace('.', ',')}`;
  const formatPercent = (val: number): string => `${val.toFixed(2).replace('.', ',')}%`;
  const formatNumber = (val: number): string => val.toLocaleString('pt-BR');

  // Calcula totais
  let totalSpend = 0, totalClicks = 0, totalImpressions = 0, totalPurchases = 0, totalConversations = 0;
  
  filtered.forEach(camp => {
    const insights = camp.insights?.data?.[0] || camp.insights || {};
    
    totalSpend += parseFloat(camp.spend) || parseFloat(insights.spend) || 0;
    totalClicks += parseInt(camp.clicks) || parseInt(insights.clicks) || 0;
    totalImpressions += parseInt(camp.impressions) || parseInt(insights.impressions) || 0;

    // Valores diretos ou das actions
    let purchases = camp.purchases || 0;
    let conversations = camp.conversations || 0;
    
    const actions = insights.actions || camp.actions || [];
    if (Array.isArray(actions) && (!purchases && !conversations)) {
      actions.forEach((action: any) => {
        if (action.action_type === 'purchase' || action.action_type === 'omni_purchase') {
          purchases += parseInt(action.value) || 0;
        }
        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
            action.action_type === 'onsite_conversion.total_messaging_connection') {
          conversations += parseInt(action.value) || 0;
        }
      });
    }
    
    totalPurchases += purchases;
    totalConversations += conversations;
  });

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const objectiveType = targetObjectives[0];
  const objInfo = getObjectiveInfo(objectiveType);

  // Header e métricas baseadas no tipo
  let content = `${objInfo.emoji} *${objInfo.label}* (${filtered.length} ${filtered.length === 1 ? 'campanha' : 'campanhas'})\n`;
  content += `• 💰 Gasto: ${formatCurrency(totalSpend)}\n`;
  content += `• 🖱️ Cliques: ${formatNumber(totalClicks)} | CTR: ${formatPercent(ctr)}\n`;

  if (objectiveType.includes('SALES') || objectiveType === 'CONVERSIONS') {
    // Sempre mostra vendas para campanhas de vendas
    const cpa = totalPurchases > 0 ? formatCurrency(totalSpend / totalPurchases) : '-';
    content += `• 🛒 Vendas: ${totalPurchases} | CPA: ${cpa}`;
  } else if (objectiveType.includes('LEADS') || objectiveType === 'MESSAGES') {
    // Sempre mostra conversas para campanhas de leads
    const cpl = totalConversations > 0 ? formatCurrency(totalSpend / totalConversations) : '-';
    content += `• 💬 Conversas: ${totalConversations} | CPL: ${cpl}`;
  }

  return content;
}

/**
 * Gera top 3 campanhas
 */
function generateTop3Campaigns(campaigns: any[]): string {
  if (!campaigns || campaigns.length === 0) {
    return '_Sem dados_';
  }

  const formatCurrency = (val: number): string => `R$ ${val.toFixed(2).replace('.', ',')}`;

  // Ordena por gasto (maior investimento)
  const sorted = [...campaigns].sort((a, b) => {
    const spendA = parseFloat(a.spend) || parseFloat(a.insights?.data?.[0]?.spend || a.insights?.spend || 0);
    const spendB = parseFloat(b.spend) || parseFloat(b.insights?.data?.[0]?.spend || b.insights?.spend || 0);
    return spendB - spendA;
  });

  const top3 = sorted.slice(0, 3);

  return top3.map((camp, index) => {
    const insights = camp.insights?.data?.[0] || camp.insights || {};
    const spend = parseFloat(camp.spend) || parseFloat(insights.spend) || 0;
    const clicks = parseInt(camp.clicks) || parseInt(insights.clicks) || 0;
    const medal = ['🥇', '🥈', '🥉'][index];
    return `${medal} ${camp.name}: ${formatCurrency(spend)} | ${clicks} cliques`;
  }).join('\n');
}

/**
 * Processa template substituindo variáveis pelos valores reais
 */
export function processTemplate(template: string, data: any): string {
  let processed = template;

  // Helper para formatar números com segurança
  const safeNum = (val: any): number => {
    if (val === null || val === undefined || isNaN(val)) return 0;
    return Number(val);
  };

  const formatCurrency = (val: any): string => {
    const num = safeNum(val);
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  const formatPercent = (val: any): string => {
    const num = safeNum(val);
    return `${num.toFixed(2).replace('.', ',')}%`;
  };

  const formatNumber = (val: any): string => {
    const num = safeNum(val);
    return num.toLocaleString('pt-BR');
  };

  // Processa variáveis por campanha/objetivo PRIMEIRO (são mais complexas)
  const campaigns = data.campaigns || [];
  
  const campaignReplacements: Record<string, string> = {
    '{{detalhes_por_campanha}}': generateCampaignDetails(campaigns),
    '{{resumo_por_objetivo}}': generateObjectiveSummary(campaigns),
    '{{campanhas_vendas}}': generateCampaignsByObjective(campaigns, ['OUTCOME_SALES', 'CONVERSIONS']),
    '{{campanhas_trafego}}': generateCampaignsByObjective(campaigns, ['OUTCOME_TRAFFIC', 'LINK_CLICKS']),
    '{{campanhas_leads}}': generateCampaignsByObjective(campaigns, ['OUTCOME_LEADS', 'MESSAGES']),
    '{{top_3_campanhas}}': generateTop3Campaigns(campaigns),
  };

  // Substitui variáveis de campanha
  Object.entries(campaignReplacements).forEach(([key, value]) => {
    processed = processed.replace(new RegExp(key, 'g'), value);
  });

  // Substitui cada variável pelo valor correspondente
  // {{data}} usa periodLabel como prioridade para mostrar "Últimos 30 dias" ao invés de uma data específica
  const replacements: Record<string, string> = {
    '{{data}}': data.periodLabel || data.summary?.date || new Date().toLocaleDateString('pt-BR'),
    '{{periodo}}': data.periodLabel || 'Hoje',
    
    // Métricas
    '{{gasto_total}}': formatCurrency(data.summary?.total_spend),
    '{{impressoes}}': formatNumber(data.summary?.total_impressions),
    '{{alcance}}': formatNumber(data.summary?.total_reach),
    '{{cliques}}': formatNumber(data.summary?.total_clicks),
    '{{ctr}}': formatPercent(data.summary?.avg_ctr),
    '{{cpc}}': formatCurrency(data.summary?.avg_cpc),
    '{{cpm}}': formatCurrency(data.summary?.avg_cpm),
    '{{campanhas}}': String(safeNum(data.summary?.total_campaigns)),
    
    // Conversões
    '{{vendas}}': String(safeNum(data.summary?.total_purchases)),
    '{{cpa}}': data.summary?.cost_per_purchase ? formatCurrency(data.summary.cost_per_purchase) : '-',
    '{{conversas}}': String(safeNum(data.summary?.total_conversations)),
    '{{custo_conversa}}': data.summary?.cost_per_conversation ? formatCurrency(data.summary.cost_per_conversation) : '-',
    
    // Destaques
    '{{melhor_ctr_campanha}}': data.highlights?.best_ctr?.name || '-',
    '{{melhor_ctr_valor}}': data.highlights?.best_ctr?.value !== undefined ? formatPercent(data.highlights.best_ctr.value) : '-',
    '{{melhor_cpc_campanha}}': data.highlights?.best_cpc?.name || '-',
    '{{melhor_cpc_valor}}': data.highlights?.best_cpc?.value !== undefined ? formatCurrency(data.highlights.best_cpc.value) : '-',
    '{{maior_gasto_campanha}}': data.highlights?.top_spend?.name || '-',
    '{{maior_gasto_valor}}': data.highlights?.top_spend?.value !== undefined ? formatCurrency(data.highlights.top_spend.value) : '-',
    '{{mais_vendas_campanha}}': data.highlights?.most_sales?.name || '-',
    '{{mais_vendas_valor}}': String(safeNum(data.highlights?.most_sales?.value)),
    
    // Alertas
    '{{alertas_count}}': String(data.alerts?.length || 0),
    '{{alertas_lista}}': data.alerts?.length > 0 
      ? data.alerts.map((a: any) => `• ${a.campaign || a.campaignName} - ${a.issue}`).join('\n')
      : 'Nenhum alerta no momento ✅'
  };

  // Faz as substituições
  Object.entries(replacements).forEach(([key, value]) => {
    processed = processed.replace(new RegExp(key, 'g'), value);
  });

  return processed;
}

/**
 * Salva template customizado no localStorage
 */
export function saveCustomTemplate(template: MessageTemplate): void {
  const saved = getCustomTemplates();
  const exists = saved.findIndex(t => t.id === template.id);
  
  if (exists >= 0) {
    saved[exists] = template;
  } else {
    saved.push(template);
  }
  
  localStorage.setItem('nexus_custom_templates', JSON.stringify(saved));
}

/**
 * Recupera templates customizados do localStorage
 */
export function getCustomTemplates(): MessageTemplate[] {
  const saved = localStorage.getItem('nexus_custom_templates');
  return saved ? JSON.parse(saved) : [];
}

/**
 * Retorna todos os templates (padrão + customizados)
 */
export function getAllTemplates(): MessageTemplate[] {
  return [...DEFAULT_TEMPLATES, ...getCustomTemplates()];
}

/**
 * Salva template associado a um cliente específico
 */
export function saveClientTemplate(accountId: string, templateId: string): void {
  const mapping = getClientTemplateMapping();
  mapping[accountId] = templateId;
  localStorage.setItem('nexus_client_templates', JSON.stringify(mapping));
}

/**
 * Recupera template do cliente
 */
export function getClientTemplate(accountId: string): string | null {
  const mapping = getClientTemplateMapping();
  return mapping[accountId] || null;
}

/**
 * Mapping de cliente -> template
 */
function getClientTemplateMapping(): Record<string, string> {
  const saved = localStorage.getItem('nexus_client_templates');
  return saved ? JSON.parse(saved) : {};
}

/**
 * Deleta template customizado
 */
export function deleteCustomTemplate(templateId: string): void {
  const saved = getCustomTemplates();
  const filtered = saved.filter(t => t.id !== templateId);
  localStorage.setItem('nexus_custom_templates', JSON.stringify(filtered));
}
