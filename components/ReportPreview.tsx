import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, PaperPlaneTilt, ArrowsClockwise, WarningCircle,
  CurrencyCircleDollar, Eye, CursorClick, ChartLineUp, Tag,
  ShoppingCart, FilePdf, ArrowSquareOut, Printer, WhatsappLogo
} from '@phosphor-icons/react';
import { PDFGeneratorService } from '../services/pdfGeneratorService';
import type { AdPlatform } from '../types';
import { buildClientAnalysisModel } from '../services/clientAnalysisModel';
import { buildDeterministicReport } from '../services/deterministicReport';
import { isPublicEnvEnabled } from '../services/publicEnv';

interface ReportPreviewProps {
  client: { companyName: string; adAccountId: string; platform?: AdPlatform };
  accounts?: Array<{ id: string; name: string; platform?: AdPlatform }>;
  embedded?: boolean;
  period?: Period;
  customStartDate?: string;
  customEndDate?: string;
  whatsappNumber?: string;
  onBack: () => void;
}

interface DailyReport {
  summary: {
    date: string; total_campaigns: number; total_spend: number;
    total_impressions: number; total_clicks: number; total_reach: number;
    avg_ctr: number; avg_cpc: number; avg_cpm: number;
    total_purchases: number; total_conversations: number;
    cost_per_purchase?: number; cost_per_conversation?: number;
  };
  highlights: {
    best_ctr: { name: string; value: number };
    best_cpc: { name: string; value: number };
    top_spend: { name: string; value: number };
    most_sales: { name: string; value: number };
  };
  alerts: Array<{ campaign: string; issue: string; ctr: number; cpc: number }>;
  campaigns: Array<{ name: string; spend: number; impressions: number; clicks: number; ctr: number; cpc: number; purchases: number; }>;
  whatsappMessage: string;
  htmlPreview: string;
}

export type Period = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last60days' | 'custom';
const PERIOD_LABELS: Record<string, string> = { today: 'Hoje', yesterday: 'Ontem', last7days: '7 dias', last30days: '30 dias', last60days: '60 dias', custom: 'Custom' };
const DATE_PRESET_MAP: Record<string, string> = { today: 'today', yesterday: 'yesterday', last7days: 'last_7d', last30days: 'last_30d', last60days: 'last_60d' };

const PANEL: React.CSSProperties = { background: '#08101e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 };
const SEG_BTN = (active: boolean): React.CSSProperties => ({
  padding: '5px 12px', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
  color: active ? '#a5b4fc' : '#334155',
  border: '1px solid transparent',
});

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  client,
  accounts,
  embedded = false,
  period: controlledPeriod,
  customStartDate: controlledCustomStartDate,
  customEndDate: controlledCustomEndDate,
  whatsappNumber: initialWhatsapp,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState<string>('');
  const [internalPeriod, setInternalPeriod] = useState<Period>('yesterday');
  const [internalCustomStartDate, setInternalCustomStartDate] = useState('');
  const [internalCustomEndDate, setInternalCustomEndDate] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsapp || '');
  const period = controlledPeriod || internalPeriod;
  const customStartDate = controlledCustomStartDate || internalCustomStartDate;
  const customEndDate = controlledCustomEndDate || internalCustomEndDate;

  const handleGenerate = async () => {
    setLoading(true); setError('');
    try {
      if (period === 'custom' && (!customStartDate || !customEndDate)) throw new Error('Selecione as datas inicial e final');

      if (isPublicEnvEnabled('VITE_DEV_BYPASS')) {
        await new Promise(r => setTimeout(r, 700));
        const periodLabel = PERIOD_LABELS[period] || period;
        const mockCampaigns = [
          { name: 'Promoção Verão 2025', spend: 1840.50, impressions: 218400, clicks: 3120, ctr: 1.43, cpc: 0.59, purchases: 42 },
          { name: 'Leads Qualificados Q2', spend: 960.00, impressions: 98200, clicks: 1870, ctr: 1.90, cpc: 0.51, purchases: 0 },
          { name: 'Remarketing Carrinho', spend: 540.30, impressions: 45600, clicks: 980, ctr: 2.15, cpc: 0.55, purchases: 28 },
          { name: 'Awareness Marca', spend: 320.00, impressions: 187000, clicks: 620, ctr: 0.33, cpc: 0.52, purchases: 0 },
          { name: 'WhatsApp Direto', spend: 280.70, impressions: 32000, clicks: 890, ctr: 2.78, cpc: 0.32, purchases: 15 },
        ];
        const totals = { spend: 3941.50, impressions: 581200, clicks: 7480, reach: 412000, ctr: 1.29, cpc: 0.53, cpm: 6.78, conversions: 85 };
        const getPeriodLabel = () => period === 'custom' ? `${customStartDate} a ${customEndDate}` : periodLabel;
        const mockHighlights = { best_ctr: { name: 'WhatsApp Direto', value: 2.78 }, best_cpc: { name: 'WhatsApp Direto', value: 0.32 }, top_spend: { name: 'Promoção Verão 2025', value: 1840.50 }, most_sales: { name: 'Promoção Verão 2025', value: 42 } };
        const deterministicReport = buildDeterministicReport({
          clientName: client.companyName,
          periodLabel: getPeriodLabel(),
          totals,
          campaigns: mockCampaigns.map((campaign) => ({
            ...campaign,
            cpm: campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0,
            conversions: campaign.purchases,
          })),
        });
        setReport({
          summary: { date: new Date().toLocaleDateString('pt-BR'), total_campaigns: mockCampaigns.length, total_spend: totals.spend, total_impressions: totals.impressions, total_clicks: totals.clicks, total_reach: totals.reach, avg_ctr: totals.ctr, avg_cpc: totals.cpc, avg_cpm: totals.cpm, total_purchases: totals.conversions, total_conversations: 0 },
          highlights: mockHighlights,
          alerts: [],
          campaigns: mockCampaigns,
          whatsappMessage: deterministicReport.whatsappMessage,
          htmlPreview: deterministicReport.html,
        });
        setLoading(false);
        return;
      }

      const { fetchPlatformInsights } = await import('../services/platformApi');

      const params = period === 'custom'
        ? { dateStart: customStartDate, dateEnd: customEndDate }
        : { datePreset: DATE_PRESET_MAP[period] || 'yesterday' };
      const selectedAccounts = accounts?.length ? accounts : [{
        id: client.adAccountId,
        name: client.companyName,
        platform: client.platform || 'meta',
      }];
      const results = await Promise.allSettled(selectedAccounts.map(async (account) => {
        const platform = account.platform || 'meta';
        const response = await fetchPlatformInsights(platform, account.id, params);
        return {
          accountId: account.id,
          accountName: account.name,
          platform,
          insights: response.data,
          dailyData: response.dailyData,
        };
      }));
      const successes = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      const errors = results.flatMap((result, index) => result.status === 'fulfilled' ? [] : [`${selectedAccounts[index].name}: ${result.reason instanceof Error ? result.reason.message : 'erro ao carregar'}`]);
      if (successes.length === 0 && errors.length > 0) throw new Error(errors.join(' | '));

      const analysis = buildClientAnalysisModel(successes, []);
      const insightsData = {
        data: analysis.campaignRows,
        totals: analysis.totals,
      };

      const sortedByCtr = [...insightsData.data].sort((a: any, b: any) => b.ctr - a.ctr);
      const sortedByCpc = [...insightsData.data].filter((c: any) => c.cpc > 0).sort((a: any, b: any) => a.cpc - b.cpc);
      const sortedBySpend = [...insightsData.data].sort((a: any, b: any) => b.spend - a.spend);
      const sortedByPurchases = [...insightsData.data].sort((a: any, b: any) => (b.conversions || 0) - (a.conversions || 0));
      const getPL = () => period === 'custom' ? `${customStartDate} a ${customEndDate}` : PERIOD_LABELS[period] || period;
      const camps = insightsData.data.map((c: any) => ({ name: selectedAccounts.length > 1 ? `${c.campaignName || 'Campanha sem nome'} · ${c.accountName}` : c.campaignName || 'Campanha sem nome', spend: c.spend, impressions: c.impressions, clicks: c.clicks, ctr: c.ctr, cpc: c.cpc, purchases: c.conversions || 0 }));
      const t = insightsData.totals;
      const deterministicReport = buildDeterministicReport({
        clientName: client.companyName,
        periodLabel: getPL(),
        totals: {
          spend: t.spend,
          impressions: t.impressions,
          clicks: t.clicks,
          ctr: t.ctr,
          cpc: t.cpc,
          cpm: t.cpm,
          conversions: t.conversions || 0,
        },
        campaigns: insightsData.data.map((campaign: any) => ({
          id: campaign.campaignId,
          name: selectedAccounts.length > 1 ? `${campaign.campaignName || 'Campanha sem nome'} · ${campaign.accountName}` : campaign.campaignName || 'Campanha sem nome',
          platform: campaign.platform,
          accountId: campaign.accountId,
          spend: campaign.spend,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          ctr: campaign.ctr,
          cpc: campaign.cpc,
          cpm: campaign.cpm,
          conversions: campaign.conversions || 0,
        })),
      });

      setReport({
        summary: { date: new Date().toLocaleDateString('pt-BR'), total_campaigns: insightsData.data.length, total_spend: t.spend, total_impressions: t.impressions, total_clicks: t.clicks, total_reach: t.impressions, avg_ctr: t.ctr, avg_cpc: t.cpc, avg_cpm: t.cpm, total_purchases: t.conversions || 0, total_conversations: 0 },
        highlights: { best_ctr: { name: sortedByCtr[0]?.campaignName || '-', value: sortedByCtr[0]?.ctr || 0 }, best_cpc: { name: sortedByCpc[0]?.campaignName || '-', value: sortedByCpc[0]?.cpc || 0 }, top_spend: { name: sortedBySpend[0]?.campaignName || '-', value: sortedBySpend[0]?.spend || 0 }, most_sales: { name: sortedByPurchases[0]?.campaignName || '-', value: sortedByPurchases[0]?.conversions || 0 } },
        alerts: [],
        campaigns: camps,
        whatsappMessage: deterministicReport.whatsappMessage,
        htmlPreview: deterministicReport.html,
      });
    } catch (err: any) {
      setError(formatReportError(err));
    } finally { setLoading(false); }
  };

  const handleSendWhatsApp = async () => {
    if (!whatsappNumber || !report) return;
    setSendingWhatsApp(true);
    try {
      const { sendWebhook } = await import('../services/api');
      await sendWebhook({ whatsappNumber, reportContent: report.whatsappMessage, clientName: client.companyName, adAccountId: client.adAccountId, adAccountName: client.companyName });
      alert('✅ Relatório enviado com sucesso!');
    } catch (err: any) { alert('❌ Erro ao enviar: ' + err.message); }
    finally { setSendingWhatsApp(false); }
  };

  const handleExportPDF = async () => {
    if (!report) return;

    try {
      const { getAgencyConfig } = await import('../services/agencyConfig');
      const agencyConfig = await getAgencyConfig();

      await PDFGeneratorService.downloadPDF({
        clientName: client.companyName,
        period: period === 'custom' ? `${customStartDate}_a_${customEndDate}` : PERIOD_LABELS[period],
        generatedAt: new Date().toLocaleString('pt-BR'),
        summary: {
          total_spend: report.summary.total_spend,
          total_impressions: report.summary.total_impressions,
          total_clicks: report.summary.total_clicks,
          total_reach: report.summary.total_reach,
          avg_ctr: report.summary.avg_ctr,
          avg_cpc: report.summary.avg_cpc,
          avg_cpm: report.summary.avg_cpm,
          total_purchases: report.summary.total_purchases,
          total_conversations: report.summary.total_conversations,
          cost_per_purchase: report.summary.cost_per_purchase,
          cost_per_conversation: report.summary.cost_per_conversation,
        },
        highlights: report.highlights,
        campaigns: report.campaigns,
      }, agencyConfig);
    } catch (err: any) {
      alert(`Erro ao exportar PDF: ${err?.message || 'erro desconhecido'}`);
    }
  };

  const handlePrintReport = () => {
    if (!report) return;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>${escapeHtml(client.companyName)}</title></head><body>${report.htmlPreview}<script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`);
      w.document.close();
    }
  };

  useEffect(() => {
    if (period !== 'custom' || (customStartDate && customEndDate)) handleGenerate();
  }, [period, customStartDate, customEndDate, accounts]);

  const s = report?.summary;
  const fmt = {
    currency: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    number: (v: number) => v.toLocaleString('pt-BR'),
    percent: (v: number) => `${v.toFixed(2).replace('.', ',')}%`,
  };

  const kpis = s ? [
    { label: 'Gasto Total', value: fmt.currency(s.total_spend), color: '#f97316', Icon: CurrencyCircleDollar },
    { label: 'Impressões', value: fmt.number(s.total_impressions), color: '#6366f1', Icon: Eye },
    { label: 'Cliques', value: fmt.number(s.total_clicks), color: '#8b5cf6', Icon: CursorClick },
    { label: 'CTR Médio', value: fmt.percent(s.avg_ctr), color: '#22c55e', Icon: ChartLineUp },
    { label: 'CPC Médio', value: fmt.currency(s.avg_cpc), color: '#f59e0b', Icon: Tag },
    { label: 'Conversões', value: String(s.total_purchases), color: '#a78bfa', Icon: ShoppingCart },
  ] : [];

  return (
    <div className={embedded ? 'flex flex-col' : 'min-h-screen flex flex-col'} style={{ background: '#04060f' }}>

      {/* Header */}
      {!embedded && <header
        className="backdrop-blur-xl border-b sticky top-0 z-10"
        style={{ background: 'rgba(6,8,15,0.9)', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-0 flex items-center justify-between gap-4 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
            >
              <ArrowLeft size={14} />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">Preview do Relatório</p>
              <p className="text-[10px] text-slate-700 truncate">{client.companyName} · {client.adAccountId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Segmented period */}
            <div className="flex items-center rounded-xl p-1 gap-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {(['today','yesterday','last7days','last30days','last60days','custom'] as Period[]).map(p => (
                <button key={p} onClick={() => { setInternalPeriod(p); if (p !== 'custom') { setInternalCustomStartDate(''); setInternalCustomEndDate(''); } }} style={SEG_BTN(period === p)}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <input type="date" value={customStartDate} onChange={e => setInternalCustomStartDate(e.target.value)} max={customEndDate || new Date().toISOString().split('T')[0]} className="bg-transparent text-slate-300 text-xs border-none focus:ring-0 p-0 w-28" />
                <span className="text-slate-600">até</span>
                <input type="date" value={customEndDate} onChange={e => setInternalCustomEndDate(e.target.value)} min={customStartDate} max={new Date().toISOString().split('T')[0]} className="bg-transparent text-slate-300 text-xs border-none focus:ring-0 p-0 w-28" />
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
            >
              <ArrowsClockwise size={13} className={loading ? 'animate-spin' : ''} />
              Regerar
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}
            >
              <FilePdf size={14} weight="bold" />
              Exportar PDF
            </button>
          </div>
        </div>
      </header>}

      {/* KPI strip */}
      {report && !loading && (
        <div className={embedded ? 'w-full pt-1' : 'max-w-6xl mx-auto w-full px-5 sm:px-8 pt-5'}>
          <div className="grid overflow-hidden rounded-xl" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', background: '#08101e', border: '1px solid rgba(255,255,255,0.06)' }}>
            {kpis.map(({ label, value, color, Icon }, i) => (
              <div key={label} className="px-4 py-3" style={{ borderRight: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color }}>
                  <Icon size={12} color={color} weight="bold" />
                  {label}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <main className={`${embedded ? 'w-full py-4' : 'flex-1 max-w-6xl mx-auto w-full px-5 sm:px-8 py-5'} grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4 items-start`}>

        {/* Error state */}
        {error && (
          <div className="xl:col-span-2 rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <WarningCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#f87171' }}>Erro ao carregar relatório</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(248,113,113,0.7)' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="xl:col-span-2 flex items-center justify-center py-24">
            <div className="text-center">
              <ArrowsClockwise size={36} color="#6366f1" className="animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-500">Gerando relatório...</p>
            </div>
          </div>
        )}

        {!loading && !error && report && (
          <>
            {/* Sidebar */}
            <div className="flex flex-col gap-4">

              {/* Send panel */}
              <div style={PANEL} className="overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#334155' }}>
                  <PaperPlaneTilt size={12} />
                  Enviar Relatório
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#334155', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                      <WhatsappLogo size={12} color="#22c55e" />
                      WhatsApp de destino
                    </div>
                    <input
                      type="text"
                      placeholder="5511999999999"
                      value={whatsappNumber}
                      onChange={e => setWhatsappNumber(e.target.value)}
                      className="w-full text-xs text-slate-300 placeholder-slate-700 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>
                  <button
                    onClick={handleSendWhatsApp}
                    disabled={!whatsappNumber || sendingWhatsApp}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', opacity: !whatsappNumber ? 0.4 : 1 }}
                  >
                    <WhatsappLogo size={14} weight="fill" />
                    {sendingWhatsApp ? 'Enviando...' : 'Enviar via WhatsApp'}
                  </button>
                  <p className="text-[10px]" style={{ color: '#1e2a3a' }}>Enviado via n8n · webhook configurado</p>
                </div>
              </div>

              {/* WA message preview */}
              <div style={PANEL} className="overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#334155' }}>
                  <WhatsappLogo size={12} />
                  Mensagem WhatsApp
                </div>
                <div>
                  <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: '#1a2b36' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                      {client.companyName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-200">{client.companyName}</p>
                      <p className="text-[9px]" style={{ color: '#334155' }}>Nexus AI Bot · online</p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: '#111b21' }}>
                    <div className="rounded-t-lg rounded-br-lg rounded-bl-sm p-2.5 max-w-[90%] ml-auto" style={{ background: '#1f2c33' }}>
                      <pre className="text-[10px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{report.whatsappMessage}</pre>
                      <p className="text-[9px] text-right mt-1" style={{ color: '#334155' }}>20:00 ✓✓</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Main HTML preview */}
            <div style={{ ...PANEL }} className="overflow-hidden flex flex-col min-w-0">
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#334155' }}>
                  Relatório HTML · {PERIOD_LABELS[period]}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(report.htmlPreview); w.document.close(); } }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                  >
                    <ArrowSquareOut size={11} />
                    Nova aba
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                  >
                    <Printer size={11} />
                    Imprimir
                  </button>
                </div>
              </div>
              <iframe
                srcDoc={report.htmlPreview}
                style={{ width: '100%', border: 'none', minHeight: 'calc(100vh - 220px)', background: '#020617' }}
                title="Relatório HTML"
              />
            </div>
          </>
        )}

      </main>
    </div>
  );
};

function formatReportError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Erro desconhecido';
  if (message === 'Google Ads API request failed') {
    return 'A conexão Google foi criada, mas o Developer Token do Google Ads ainda não tem Basic/Standard Access para contas reais. No Google Ads API Center, solicite Basic Access ou teste com uma conta Google Ads de teste.';
  }
  return message;
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
