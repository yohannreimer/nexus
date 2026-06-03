export type DeterministicTotals = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
};

export type DeterministicCampaign = DeterministicTotals & {
  id?: string;
  name: string;
  platform?: 'meta' | 'google';
  accountId?: string;
};

export type DeterministicReportInput = {
  clientName: string;
  periodLabel: string;
  totals: DeterministicTotals;
  campaigns: DeterministicCampaign[];
  portalLink?: string | null;
  agencyName?: string | null;
};

export type DeterministicReportOutput = {
  whatsappMessage: string;
  html: string;
  summaryPayload: {
    totals: DeterministicTotals;
    topCampaigns: DeterministicCampaign[];
  };
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function buildDeterministicReport(input: DeterministicReportInput): DeterministicReportOutput {
  const totals = normalizeTotals(input.totals);
  const sortedCampaigns = input.campaigns
    .map(normalizeCampaign)
    .sort((a, b) => b.spend - a.spend || a.name.localeCompare(b.name, 'pt-BR'));
  const agencyName = input.agencyName?.trim() || 'Nexus AI';
  const portalLink = input.portalLink?.trim() || '';
  const portalLine = portalLink ? `\n🔗 Portal: ${portalLink}` : '';

  const whatsappMessage = [
    '📊 *Relatório de Performance*',
    `📅 ${input.periodLabel}`,
    `📣 ${input.clientName}`,
    '',
    `💰 Investimento: *${formatCurrency(totals.spend)}*`,
    `👁 Impressões: ${formatNumber(totals.impressions)}`,
    `👆 Cliques: ${formatNumber(totals.clicks)}`,
    `📈 CTR: ${formatPercent(totals.ctr)}`,
    `💡 CPC: ${formatCurrency(totals.cpc)}`,
    `🛒 Conversões: ${formatNumber(totals.conversions)}`,
    portalLine,
    '',
    `_${agencyName} · Relatórios_`,
  ].filter((line) => line !== '').join('\n');

  return {
    whatsappMessage,
    html: buildHtml(input, totals, sortedCampaigns, agencyName, portalLink),
    summaryPayload: {
      totals,
      topCampaigns: sortedCampaigns,
    },
  };
}

function buildHtml(
  input: DeterministicReportInput,
  totals: DeterministicTotals,
  campaigns: DeterministicCampaign[],
  agencyName: string,
  portalLink: string,
): string {
  const clientName = escapeHtml(input.clientName);
  const periodLabel = escapeHtml(input.periodLabel);
  const escapedAgencyName = escapeHtml(agencyName);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório de Performance - ${clientName}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, Arial, sans-serif; background: #020617; color: #e2e8f0; }
  .wrap { max-width: 780px; margin: 0 auto; padding: 18px; }
  .header { background: #111827; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 22px; margin-bottom: 14px; }
  h1 { margin: 0 0 6px; font-size: 22px; line-height: 1.2; }
  .muted { color: #94a3b8; font-size: 12px; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
  .card { background: #0f172a; border: 1px solid rgba(255,255,255,.07); border-radius: 8px; padding: 13px; }
  .label { margin: 0 0 6px; color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; }
  .value { margin: 0; color: #f8fafc; font-size: 18px; font-weight: 800; }
  .section { background: #0f172a; border: 1px solid rgba(255,255,255,.07); border-radius: 10px; overflow: hidden; margin-bottom: 14px; }
  h2 { margin: 0; padding: 13px 15px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,.06); }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { padding: 10px 12px; color: #64748b; text-align: right; text-transform: uppercase; font-size: 9px; }
  th:first-child, td:first-child { text-align: left; }
  td { padding: 11px 12px; border-top: 1px solid rgba(255,255,255,.05); text-align: right; }
  .campaign { color: #cbd5e1; font-weight: 700; }
  .footer { color: #64748b; text-align: center; font-size: 10px; padding: 8px; }
  a { color: #93c5fd; }
</style>
</head>
<body>
<div class="wrap">
  <header class="header">
    <h1>Relatório de Performance</h1>
    <p class="muted">${clientName} · ${periodLabel}</p>
  </header>

  <section class="grid" aria-label="Resumo de métricas">
    ${metricCard('Investimento', formatCurrency(totals.spend))}
    ${metricCard('Impressões', formatNumber(totals.impressions))}
    ${metricCard('Cliques', formatNumber(totals.clicks))}
    ${metricCard('CTR', formatPercent(totals.ctr))}
    ${metricCard('CPC', formatCurrency(totals.cpc))}
    ${metricCard('CPM', formatCurrency(totals.cpm))}
    ${metricCard('Conversões', formatNumber(totals.conversions))}
  </section>

  <section class="section">
    <h2>Campanhas</h2>
    <table>
      <thead>
        <tr>
          <th>Campanha</th>
          <th>Investimento</th>
          <th>Impressões</th>
          <th>Cliques</th>
          <th>CTR</th>
          <th>CPC</th>
          <th>Conversões</th>
        </tr>
      </thead>
      <tbody>
        ${campaigns.map(campaignRow).join('')}
      </tbody>
    </table>
  </section>

  ${portalLink ? `<p class="muted">Portal: <a href="${escapeAttribute(portalLink)}">${escapeHtml(portalLink)}</a></p>` : ''}
  <footer class="footer">Gerado por ${escapedAgencyName}</footer>
</div>
</body>
</html>`;
}

function metricCard(label: string, value: string): string {
  return `<div class="card"><p class="label">${label}</p><p class="value">${value}</p></div>`;
}

function campaignRow(campaign: DeterministicCampaign): string {
  return `<tr>
    <td class="campaign">${escapeHtml(campaign.name)}</td>
    <td>${formatCurrency(campaign.spend)}</td>
    <td>${formatNumber(campaign.impressions)}</td>
    <td>${formatNumber(campaign.clicks)}</td>
    <td>${formatPercent(campaign.ctr)}</td>
    <td>${formatCurrency(campaign.cpc)}</td>
    <td>${formatNumber(campaign.conversions)}</td>
  </tr>`;
}

function normalizeCampaign(campaign: DeterministicCampaign): DeterministicCampaign {
  return {
    ...campaign,
    ...normalizeTotals(campaign),
  };
}

function normalizeTotals(totals: DeterministicTotals): DeterministicTotals {
  return {
    spend: finiteNumber(totals.spend),
    impressions: finiteNumber(totals.impressions),
    clicks: finiteNumber(totals.clicks),
    ctr: finiteNumber(totals.ctr),
    cpc: finiteNumber(totals.cpc),
    cpm: finiteNumber(totals.cpm),
    conversions: finiteNumber(totals.conversions),
  };
}

function finiteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value).replace(/\u00a0/g, ' ');
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
