/**
 * Report Generator Service
 * Processa dados do Facebook Ads e gera relatórios formatados para WhatsApp
 */

import { FacebookInsightsService } from './facebookInsightsService';

interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  metrics: {
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpm: number;
    frequency: number;
    actions?: Array<{ action_type: string; value: string }>;
    conversions?: Array<{ action_type: string; value: string }>;
  };
}

interface ReportSummary {
  date: string;
  total_campaigns: number;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_reach: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  total_purchases: number;
  total_conversations: number;
  cost_per_purchase?: number;
  cost_per_conversation?: number;
}

interface CampaignHighlight {
  name: string;
  value: number;
  metric: string;
}

interface DailyReport {
  summary: ReportSummary;
  highlights: {
    best_ctr: CampaignHighlight;
    best_cpc: CampaignHighlight;
    top_spend: CampaignHighlight;
    most_sales: CampaignHighlight;
    best_cpa?: CampaignHighlight;
  };
  alerts: Array<{
    campaign: string;
    issue: string;
    ctr: number;
    cpc: number;
  }>;
  campaigns: Array<{
    name: string;
    objective: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    purchases: number;
    conversations: number;
    insights: {
      spend: string;
      clicks: string;
      impressions: string;
      ctr: string;
      actions: Array<{ action_type: string; value: string }>;
    };
  }>;
}

export class ReportGeneratorService {
  /**
   * Helper para garantir número válido
   */
  private static safeNum(n: any): number {
    if (n === null || n === undefined || isNaN(n)) return 0;
    return Number(n);
  }

  /**
   * Gera relatório diário a partir dos insights
   */
  static generateDailyReport(
    campaigns: CampaignInsight[],
    dateLabel: string
  ): DailyReport {
    // Garante que campaigns é um array válido
    const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
    
    // 1. Calcula totais
    const summary = this.calculateSummary(safeCampaigns, dateLabel);

    // 2. Identifica destaques
    const highlights = this.findHighlights(safeCampaigns);

    // 3. Detecta alertas (CTR < 2% ou CPC > R$ 0.50)
    const alerts = this.detectAlerts(safeCampaigns);

    // 4. Prepara lista de campanhas com valores seguros
    const campaignList = safeCampaigns.map(c => ({
      name: c.campaign_name || 'Sem nome',
      objective: c.objective || 'UNKNOWN',
      spend: this.safeNum(c.metrics?.spend),
      impressions: this.safeNum(c.metrics?.impressions),
      clicks: this.safeNum(c.metrics?.clicks),
      ctr: this.safeNum(c.metrics?.ctr),
      cpc: this.safeNum(c.metrics?.cpc),
      purchases: FacebookInsightsService.getActionValue(c.metrics || { impressions: 0, reach: 0, clicks: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0, frequency: 0 }, 'purchase'),
      conversations: FacebookInsightsService.getActionValue(
        c.metrics || { impressions: 0, reach: 0, clicks: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0, frequency: 0 },
        'onsite_conversion.total_messaging_connection'
      ),
      // Formato compatível com processTemplate
      insights: {
        spend: String(this.safeNum(c.metrics?.spend)),
        clicks: String(this.safeNum(c.metrics?.clicks)),
        impressions: String(this.safeNum(c.metrics?.impressions)),
        ctr: String(this.safeNum(c.metrics?.ctr)),
        actions: c.metrics?.actions || []
      }
    }));

    return { summary, highlights, alerts, campaigns: campaignList };
  }

  /**
   * Calcula resumo geral do período
   */
  private static calculateSummary(
    campaigns: CampaignInsight[],
    dateLabel: string
  ): ReportSummary {
    const defaultMetrics = { impressions: 0, reach: 0, clicks: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0, frequency: 0, actions: [], conversions: [] };
    
    const totals = campaigns.reduce(
      (acc, c) => {
        const metrics = c.metrics || defaultMetrics;
        return {
          spend: acc.spend + this.safeNum(metrics.spend),
          impressions: acc.impressions + this.safeNum(metrics.impressions),
          clicks: acc.clicks + this.safeNum(metrics.clicks),
          reach: acc.reach + this.safeNum(metrics.reach),
          purchases:
            acc.purchases +
            FacebookInsightsService.getActionValue(metrics, 'purchase'),
          conversations:
            acc.conversations +
            FacebookInsightsService.getActionValue(
              metrics,
              'onsite_conversion.total_messaging_connection'
            )
        };
      },
      { spend: 0, impressions: 0, clicks: 0, reach: 0, purchases: 0, conversations: 0 }
    );

    const avg_ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
    const avg_cpc = totals.clicks ? totals.spend / totals.clicks : 0;
    const avg_cpm = totals.impressions ? (totals.spend / totals.impressions) * 1000 : 0;

    return {
      date: dateLabel || new Date().toLocaleDateString('pt-BR'),
      total_campaigns: campaigns.length,
      total_spend: this.safeNum(totals.spend),
      total_impressions: this.safeNum(totals.impressions),
      total_clicks: this.safeNum(totals.clicks),
      total_reach: this.safeNum(totals.reach),
      avg_ctr: this.safeNum(avg_ctr),
      avg_cpc: this.safeNum(avg_cpc),
      avg_cpm: this.safeNum(avg_cpm),
      total_purchases: totals.purchases,
      total_conversations: totals.conversations,
      cost_per_purchase: totals.purchases ? totals.spend / totals.purchases : undefined,
      cost_per_conversation: totals.conversations
        ? totals.spend / totals.conversations
        : undefined
    };
  }

  /**
   * Identifica campanhas destaque
   */
  private static findHighlights(campaigns: CampaignInsight[]) {
    const defaultMetrics = { impressions: 0, reach: 0, clicks: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0, frequency: 0, actions: [], conversions: [] };
    
    // Filtra campanhas válidas com métricas
    const validCampaigns = campaigns.filter(c => c && c.metrics);
    
    const sorted = {
      byCtr: [...validCampaigns].sort((a, b) => this.safeNum(b.metrics?.ctr) - this.safeNum(a.metrics?.ctr)),
      byCpc: [...validCampaigns].filter(c => this.safeNum(c.metrics?.cpc) > 0).sort((a, b) => this.safeNum(a.metrics?.cpc) - this.safeNum(b.metrics?.cpc)),
      bySpend: [...validCampaigns].sort((a, b) => this.safeNum(b.metrics?.spend) - this.safeNum(a.metrics?.spend)),
      bySales: [...validCampaigns].sort(
        (a, b) =>
          FacebookInsightsService.getActionValue(b.metrics || defaultMetrics, 'purchase') -
          FacebookInsightsService.getActionValue(a.metrics || defaultMetrics, 'purchase')
      )
    };

    const withSales = validCampaigns.filter(
      c => FacebookInsightsService.getActionValue(c.metrics || defaultMetrics, 'purchase') > 0
    );
    const sortedByCpa = [...withSales].sort((a, b) => {
      const purchasesA = FacebookInsightsService.getActionValue(a.metrics || defaultMetrics, 'purchase');
      const purchasesB = FacebookInsightsService.getActionValue(b.metrics || defaultMetrics, 'purchase');
      const cpaA = purchasesA > 0 ? this.safeNum(a.metrics?.spend) / purchasesA : Infinity;
      const cpaB = purchasesB > 0 ? this.safeNum(b.metrics?.spend) / purchasesB : Infinity;
      return cpaA - cpaB;
    });

    return {
      best_ctr: {
        name: sorted.byCtr[0]?.campaign_name || '-',
        value: this.safeNum(sorted.byCtr[0]?.metrics?.ctr),
        metric: 'CTR'
      },
      best_cpc: {
        name: sorted.byCpc[0]?.campaign_name || '-',
        value: this.safeNum(sorted.byCpc[0]?.metrics?.cpc),
        metric: 'CPC'
      },
      top_spend: {
        name: sorted.bySpend[0]?.campaign_name || '-',
        value: this.safeNum(sorted.bySpend[0]?.metrics?.spend),
        metric: 'Gasto'
      },
      most_sales: {
        name: sorted.bySales[0]?.campaign_name || '-',
        value: sorted.bySales[0] ? FacebookInsightsService.getActionValue(sorted.bySales[0].metrics || defaultMetrics, 'purchase') : 0,
        metric: 'Vendas'
      },
      best_cpa: sortedByCpa[0]
        ? {
            name: sortedByCpa[0].campaign_name || '-',
            value: this.safeNum(
              sortedByCpa[0].metrics?.spend /
              FacebookInsightsService.getActionValue(sortedByCpa[0].metrics || defaultMetrics, 'purchase')
            ),
            metric: 'CPA'
          }
        : undefined
    };
  }

  /**
   * Detecta campanhas com problemas (CTR < 2% ou CPC > R$ 0.50)
   */
  private static detectAlerts(campaigns: CampaignInsight[]) {
    const MIN_IMPRESSIONS = 100;
    const CTR_THRESHOLD = 2.0;
    const CPC_THRESHOLD = 0.5;

    return campaigns
      .filter(c => c && c.metrics && this.safeNum(c.metrics.impressions) >= MIN_IMPRESSIONS)
      .filter(c => this.safeNum(c.metrics?.ctr) < CTR_THRESHOLD || this.safeNum(c.metrics?.cpc) > CPC_THRESHOLD)
      .map(c => ({
        campaign: c.campaign_name || 'Sem nome',
        issue: this.safeNum(c.metrics?.ctr) < CTR_THRESHOLD ? 'CTR baixo' : 'CPC alto',
        ctr: this.safeNum(c.metrics?.ctr),
        cpc: this.safeNum(c.metrics?.cpc)
      }));
  }

  /**
   * Formata relatório para mensagem WhatsApp
   */
  static formatWhatsAppMessage(report: DailyReport): string {
    // Helpers com proteção contra undefined/NaN
    const safeNum = (n: any): number => {
      if (n === null || n === undefined || isNaN(n)) return 0;
      return Number(n);
    };
    const fmt = (n: any) => `R$ ${safeNum(n).toFixed(2).replace('.', ',')}`;
    const pct = (n: any) => `${safeNum(n).toFixed(2).replace('.', ',')} %`;

    let msg = `📊 *Relatório Diário – ${report.summary.date}*\n\n`;

    // Visão geral
    msg += `*Visão‑geral*\n`;
    msg += `• 💸 Gasto total: ${fmt(report.summary.total_spend)}\n`;
    msg += `• 👀 Impressões: ${report.summary.total_impressions.toLocaleString('pt-BR')}\n`;
    msg += `• 🖱️ Cliques: ${report.summary.total_clicks}  → CTR: ${pct(report.summary.avg_ctr)}\n`;
    msg += `• 💰 CPC: ${fmt(report.summary.avg_cpc)} | CPM: ${fmt(report.summary.avg_cpm)}\n`;
    msg += `• 🛒 Vendas: ${report.summary.total_purchases}`;
    if (report.summary.cost_per_purchase) {
      msg += ` (${fmt(report.summary.cost_per_purchase)} por venda)`;
    }
    msg += `\n`;
    msg += `• 💬 Conversas: ${report.summary.total_conversations}`;
    if (report.summary.cost_per_conversation) {
      msg += ` (${fmt(report.summary.cost_per_conversation)} por conversa)`;
    }
    msg += `\n\n`;

    // Destaques
    msg += `*Destaques*\n`;
    msg += `• Melhor CTR: ${pct(report.highlights.best_ctr.value)} na "*${report.highlights.best_ctr.name}*"\n`;
    msg += `• Melhor CPC: ${fmt(report.highlights.best_cpc.value)} na "*${report.highlights.best_cpc.name}*"\n`;
    msg += `• Maior investimento: ${fmt(report.highlights.top_spend.value)} em "*${report.highlights.top_spend.name}*"\n`;
    msg += `• Mais vendas: ${report.highlights.most_sales.value} em "*${report.highlights.most_sales.name}*"\n`;
    if (report.highlights.best_cpa) {
      msg += `• Melhor CPA: ${fmt(report.highlights.best_cpa.value)} em "*${report.highlights.best_cpa.name}*"\n`;
    }
    msg += `\n`;

    // Alertas
    if (report.alerts.length > 0) {
      msg += `*⚠️ Campanhas em alerta*\n`;
      report.alerts.forEach(alert => {
        msg += `• ${alert.campaign} – ${alert.issue} (CTR ${pct(alert.ctr)}, CPC ${fmt(alert.cpc)})\n`;
      });
      msg += `\n`;
    }

    // Lista completa
    msg += `*Campanhas (${report.campaigns.length} total)*\n`;
    report.campaigns
      .sort((a, b) => b.spend - a.spend)
      .forEach((c, i) => {
        msg += `${i + 1}. *${c.name}* – ${fmt(c.spend)} | ${pct(c.ctr)} | CPC ${fmt(c.cpc)}`;
        if (c.purchases > 0) msg += ` | ${c.purchases} vendas`;
        if (c.conversations > 0) msg += ` | ${c.conversations} conversas`;
        msg += `\n`;
      });

    return msg.trim();
  }

  /**
   * Gera relatório HTML para preview no app
   */
  static formatHtmlPreview(report: DailyReport): string {
    // Helpers com proteção contra undefined/NaN
    const safeNum = (n: any): number => {
      if (n === null || n === undefined || isNaN(n)) return 0;
      return Number(n);
    };
    const fmt = (n: any) => `R$ ${safeNum(n).toFixed(2).replace('.', ',')}`;
    const pct = (n: any) => `${safeNum(n).toFixed(2).replace('.', ',')}%`;
    const num = (n: any) => safeNum(n).toLocaleString('pt-BR');

    return `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px; padding: 32px; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);">
          <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">📊 Relatório de Performance</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 18px;">${report.summary.date}</p>
        </div>
        
        <!-- Métricas Principais -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          ${[
            { label: '💸 Gasto Total', value: fmt(report.summary.total_spend), color: '#ef4444' },
            { label: '👀 Impressões', value: num(report.summary.total_impressions), color: '#3b82f6' },
            { label: '🖱️ Cliques', value: num(report.summary.total_clicks), color: '#8b5cf6' },
            { label: '📈 CTR Médio', value: pct(report.summary.avg_ctr), color: '#10b981' },
            { label: '💰 CPC Médio', value: fmt(report.summary.avg_cpc), color: '#f59e0b' },
            { label: '📊 CPM Médio', value: fmt(report.summary.avg_cpm), color: '#06b6d4' },
            { label: '🎯 Alcance', value: num(report.summary.total_reach), color: '#ec4899' },
            { label: '📢 Campanhas', value: num(report.summary.total_campaigns), color: '#6366f1' }
          ].map(metric => `
            <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid ${metric.color};">
              <div style="color: #64748b; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">${metric.label}</div>
              <div style="color: #1e293b; font-size: 28px; font-weight: 700;">${metric.value}</div>
            </div>
          `).join('')}
        </div>

        <!-- Conversões -->
        ${report.summary.total_purchases > 0 || report.summary.total_conversations > 0 ? `
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);">
          <h3 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">🎯 Conversões</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            ${report.summary.total_purchases > 0 ? `
            <div>
              <div style="opacity: 0.9; font-size: 14px; margin-bottom: 4px;">🛒 Vendas</div>
              <div style="font-size: 32px; font-weight: 700;">${report.summary.total_purchases}</div>
              ${report.summary.cost_per_purchase ? `
              <div style="opacity: 0.8; font-size: 14px; margin-top: 4px;">CPA: ${fmt(report.summary.cost_per_purchase)}</div>
              ` : ''}
            </div>
            ` : ''}
            ${report.summary.total_conversations > 0 ? `
            <div>
              <div style="opacity: 0.9; font-size: 14px; margin-bottom: 4px;">💬 Conversas</div>
              <div style="font-size: 32px; font-weight: 700;">${report.summary.total_conversations}</div>
              ${report.summary.cost_per_conversation ? `
              <div style="opacity: 0.8; font-size: 14px; margin-top: 4px;">Custo/Conversa: ${fmt(report.summary.cost_per_conversation)}</div>
              ` : ''}
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Destaques -->
        <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 700;">⭐ Destaques</h3>
          <div style="display: grid; gap: 16px;">
            ${[
              { icon: '🏆', label: 'Melhor CTR', name: report.highlights.best_ctr.name, value: pct(report.highlights.best_ctr.value), color: '#10b981' },
              { icon: '💎', label: 'Melhor CPC', name: report.highlights.best_cpc.name, value: fmt(report.highlights.best_cpc.value), color: '#3b82f6' },
              { icon: '💸', label: 'Maior Investimento', name: report.highlights.top_spend.name, value: fmt(report.highlights.top_spend.value), color: '#f59e0b' },
              { icon: '🎯', label: 'Mais Vendas', name: report.highlights.most_sales.name, value: `${report.highlights.most_sales.value} vendas`, color: '#8b5cf6' }
            ].filter(h => h.name !== '-').map(highlight => `
              <div style="display: flex; align-items: center; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${highlight.color};">
                <div style="font-size: 32px; margin-right: 16px;">${highlight.icon}</div>
                <div style="flex: 1;">
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase;">${highlight.label}</div>
                  <div style="color: #1e293b; font-size: 16px; font-weight: 700; margin-bottom: 2px;">${highlight.name}</div>
                  <div style="color: ${highlight.color}; font-size: 14px; font-weight: 600;">${highlight.value}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Alertas -->
        ${report.alerts.length > 0 ? `
        <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">⚠️ Campanhas em Alerta (${report.alerts.length})</h3>
          <div style="display: grid; gap: 12px;">
            ${report.alerts.map(alert => `
              <div style="background: white; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                  <div style="color: #1e293b; font-size: 14px; font-weight: 600; margin-bottom: 4px;">${alert.campaign}</div>
                  <div style="color: #92400e; font-size: 12px; font-weight: 600;">${alert.issue}</div>
                </div>
                <div style="text-align: right;">
                  <div style="color: #64748b; font-size: 12px;">CTR: ${pct(alert.ctr)}</div>
                  <div style="color: #64748b; font-size: 12px;">CPC: ${fmt(alert.cpc)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Lista de Campanhas -->
        <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 700;">📋 Todas as Campanhas (${report.campaigns.length})</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 12px; text-align: left; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Campanha</th>
                  <th style="padding: 12px; text-align: right; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Gasto</th>
                  <th style="padding: 12px; text-align: right; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Impressões</th>
                  <th style="padding: 12px; text-align: right; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Cliques</th>
                  <th style="padding: 12px; text-align: right; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">CTR</th>
                  <th style="padding: 12px; text-align: right; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">CPC</th>
                  <th style="padding: 12px; text-align: right; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Vendas</th>
                </tr>
              </thead>
              <tbody>
                ${report.campaigns.sort((a, b) => b.spend - a.spend).map((c, i) => `
                  <tr style="border-bottom: 1px solid #f1f5f9; ${i % 2 === 0 ? 'background: #f8fafc;' : ''}">
                    <td style="padding: 12px; color: #1e293b; font-weight: 500;">${c.name}</td>
                    <td style="padding: 12px; text-align: right; color: #1e293b; font-weight: 600;">${fmt(c.spend)}</td>
                    <td style="padding: 12px; text-align: right; color: #64748b;">${num(c.impressions)}</td>
                    <td style="padding: 12px; text-align: right; color: #64748b;">${num(c.clicks)}</td>
                    <td style="padding: 12px; text-align: right; color: ${c.ctr < 2 ? '#ef4444' : '#10b981'}; font-weight: 600;">${pct(c.ctr)}</td>
                    <td style="padding: 12px; text-align: right; color: ${c.cpc > 0.5 ? '#ef4444' : '#10b981'}; font-weight: 600;">${fmt(c.cpc)}</td>
                    <td style="padding: 12px; text-align: right; color: #1e293b; font-weight: 600;">${c.purchases > 0 ? c.purchases : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div style="text-align: center; margin-top: 32px; padding: 24px; color: #94a3b8; font-size: 13px;">
          <p style="margin: 0;">Relatório gerado automaticamente por <strong style="color: #667eea;">Nexus AI</strong></p>
          <p style="margin: 8px 0 0 0;">Dados extraídos diretamente do Facebook Ads</p>
        </div>
      </div>
    `;
  }
}
