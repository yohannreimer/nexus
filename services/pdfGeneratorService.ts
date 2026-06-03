/**
 * Serviço de geração de PDF profissional
 * Usa html2pdf.js para gerar PDFs bonitos com branding da agência
 */

interface AgencyConfig {
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  email: string;
  phone: string;
  website: string;
  reportFooter: string;
}

interface ReportData {
  clientName: string;
  period: string;
  generatedAt: string;
  summary: {
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
  };
  highlights: {
    best_ctr: { name: string; value: number };
    best_cpc: { name: string; value: number };
    top_spend: { name: string; value: number };
    most_sales: { name: string; value: number };
  };
  campaigns: Array<{
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    purchases?: number;
  }>;
}

export class PDFGeneratorService {
  /**
   * Gera HTML do relatório PDF profissional
   */
  static generateReportHTML(data: ReportData, agency?: AgencyConfig): string {
    const primaryColor = agency?.primaryColor || '#6366f1';
    const secondaryColor = agency?.secondaryColor || '#8b5cf6';
    const agencyName = agency?.name || 'Nexus AI';
    const agencyLogo = agency?.logo || '';

    const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;
    const pct = (n: number) => `${n.toFixed(2).replace('.', ',')}%`;
    const num = (n: number) => n.toLocaleString('pt-BR');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      background: white;
    }
    
    .page {
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${primaryColor};
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    
    .agency-name {
      font-size: 24px;
      font-weight: 700;
      color: ${primaryColor};
    }
    
    .report-info {
      text-align: right;
    }
    
    .report-title {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    .client-name {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .period {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }
    
    .hero-section {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      border-radius: 16px;
      padding: 32px;
      color: white;
      margin-bottom: 32px;
    }
    
    .hero-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 24px;
    }
    
    .hero-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }
    
    .hero-metric {
      text-align: center;
    }
    
    .hero-metric-value {
      font-size: 28px;
      font-weight: 700;
    }
    
    .hero-metric-label {
      font-size: 12px;
      opacity: 0.9;
      margin-top: 4px;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    
    .metric-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid ${primaryColor};
    }
    
    .metric-card-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .metric-card-value {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .highlights-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .highlight-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .highlight-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: ${primaryColor};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    
    .highlight-content h4 {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .highlight-content p {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .highlight-content span {
      font-size: 12px;
      color: ${primaryColor};
      font-weight: 600;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    
    th {
      background: #f1f5f9;
      padding: 12px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    th:not(:first-child) {
      text-align: right;
    }
    
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    
    td:not(:first-child) {
      text-align: right;
    }
    
    .campaign-name {
      font-weight: 600;
      color: #1e293b;
    }
    
    .ctr-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .ctr-good { background: #dcfce7; color: #15803d; }
    .ctr-medium { background: #fef3c7; color: #b45309; }
    .ctr-low { background: #fee2e2; color: #b91c1c; }
    
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    
    .footer-text {
      font-size: 12px;
      color: #94a3b8;
    }
    
    .footer-agency {
      font-size: 14px;
      font-weight: 600;
      color: ${primaryColor};
      margin-top: 8px;
    }
    
    .footer-contact {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }
    
    /* Controle de quebra de página para PDF */
    .section {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .metric-card, .highlight-card {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    table {
      page-break-inside: auto;
    }
    
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    thead {
      display: table-header-group;
    }
    
    .hero-section {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .header {
      page-break-after: avoid;
    }
    
    .footer {
      page-break-before: avoid;
    }
    
    @media print {
      .page {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-section">
        ${agencyLogo ? `<img src="${agencyLogo}" alt="Logo" class="logo">` : ''}
        <span class="agency-name">${agencyName}</span>
      </div>
      <div class="report-info">
        <div class="report-title">Relatório de Performance</div>
        <div class="client-name">${data.clientName}</div>
        <div class="period">${data.period}</div>
      </div>
    </div>
    
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-title">📊 Resumo do Período</div>
      <div class="hero-metrics">
        <div class="hero-metric">
          <div class="hero-metric-value">${fmt(data.summary.total_spend)}</div>
          <div class="hero-metric-label">Investimento Total</div>
        </div>
        <div class="hero-metric">
          <div class="hero-metric-value">${num(data.summary.total_impressions)}</div>
          <div class="hero-metric-label">Impressões</div>
        </div>
        <div class="hero-metric">
          <div class="hero-metric-value">${num(data.summary.total_clicks)}</div>
          <div class="hero-metric-label">Cliques</div>
        </div>
        <div class="hero-metric">
          <div class="hero-metric-value">${pct(data.summary.avg_ctr)}</div>
          <div class="hero-metric-label">CTR Médio</div>
        </div>
      </div>
    </div>
    
    <!-- Métricas Detalhadas -->
    <div class="section">
      <div class="section-title">📈 Métricas Detalhadas</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-card-label">CPC Médio</div>
          <div class="metric-card-value">${fmt(data.summary.avg_cpc)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">CPM Médio</div>
          <div class="metric-card-value">${fmt(data.summary.avg_cpm)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Alcance</div>
          <div class="metric-card-value">${num(data.summary.total_reach)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Conversões</div>
          <div class="metric-card-value">${data.summary.total_purchases + data.summary.total_conversations}</div>
        </div>
      </div>
    </div>
    
    <!-- Destaques -->
    <div class="section">
      <div class="section-title">⭐ Destaques do Período</div>
      <div class="highlights-grid">
        <div class="highlight-card">
          <div class="highlight-icon">🏆</div>
          <div class="highlight-content">
            <h4>Melhor CTR</h4>
            <p>${data.highlights.best_ctr.name}</p>
            <span>${pct(data.highlights.best_ctr.value)}</span>
          </div>
        </div>
        <div class="highlight-card">
          <div class="highlight-icon">💎</div>
          <div class="highlight-content">
            <h4>Melhor CPC</h4>
            <p>${data.highlights.best_cpc.name}</p>
            <span>${fmt(data.highlights.best_cpc.value)}</span>
          </div>
        </div>
        <div class="highlight-card">
          <div class="highlight-icon">💰</div>
          <div class="highlight-content">
            <h4>Maior Investimento</h4>
            <p>${data.highlights.top_spend.name}</p>
            <span>${fmt(data.highlights.top_spend.value)}</span>
          </div>
        </div>
        <div class="highlight-card">
          <div class="highlight-icon">🎯</div>
          <div class="highlight-content">
            <h4>Mais Conversões</h4>
            <p>${data.highlights.most_sales.name}</p>
            <span>${data.highlights.most_sales.value} vendas</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tabela de Campanhas -->
    <div class="section">
      <div class="section-title">📋 Performance por Campanha</div>
      <table>
        <thead>
          <tr>
            <th>Campanha</th>
            <th>Investimento</th>
            <th>Impressões</th>
            <th>Cliques</th>
            <th>CTR</th>
            <th>CPC</th>
          </tr>
        </thead>
        <tbody>
          ${data.campaigns.sort((a, b) => b.spend - a.spend).map(c => `
            <tr>
              <td class="campaign-name">${c.name}</td>
              <td>${fmt(c.spend)}</td>
              <td>${num(c.impressions)}</td>
              <td>${num(c.clicks)}</td>
              <td>
                <span class="ctr-badge ${c.ctr >= 2 ? 'ctr-good' : c.ctr >= 1 ? 'ctr-medium' : 'ctr-low'}">
                  ${pct(c.ctr)}
                </span>
              </td>
              <td>${fmt(c.cpc)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">Relatório gerado em ${data.generatedAt}</div>
      <div class="footer-agency">${agencyName}</div>
      ${agency?.email || agency?.phone || agency?.website ? `
        <div class="footer-contact">
          ${[agency?.email, agency?.phone, agency?.website].filter(Boolean).join(' • ')}
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Gera e baixa o PDF
   */
  static async downloadPDF(data: ReportData, agency?: AgencyConfig): Promise<void> {
    // Importar html2pdf dinamicamente
    const html2pdf = (await import('html2pdf.js')).default;

    const html = this.generateReportHTML(data, agency);
    
    // Criar elemento temporário
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    // Configurações do PDF
    const opt = {
      margin: [10, 10, 20, 10] as [number, number, number, number], // top, left, bottom, right em mm - margem maior embaixo para evitar corte
      filename: `Relatorio_${data.clientName.replace(/\s+/g, '_')}_${data.period.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm' as const, 
        format: 'a4' as const, 
        orientation: 'portrait' as const 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(container).save();
    } finally {
      document.body.removeChild(container);
    }
  }

  /**
   * Gera PDF e retorna como Blob para envio
   */
  static async generatePDFBlob(data: ReportData, agency?: AgencyConfig): Promise<Blob> {
    const html2pdf = (await import('html2pdf.js')).default;

    const html = this.generateReportHTML(data, agency);
    
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    const opt = {
      margin: [10, 10, 20, 10] as [number, number, number, number], // top, left, bottom, right em mm
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true
      },
      jsPDF: { 
        unit: 'mm' as const, 
        format: 'a4' as const, 
        orientation: 'portrait' as const 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
      return pdfBlob;
    } finally {
      document.body.removeChild(container);
    }
  }
}
