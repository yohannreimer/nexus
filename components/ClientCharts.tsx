import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  ArrowLeft, ArrowsClockwise, FilePdf, CurrencyCircleDollar,
  Eye, CursorClick, ChartLineUp, Tag, Lightning, WarningCircle, Table,
  Funnel, ChartLine, ChartBarHorizontal, ChartDonut
} from '@phosphor-icons/react';
import type { AdPlatform, PlatformInsight } from '../types';
import { buildClientAnalysisModel } from '../services/clientAnalysisModel';
import { isPublicEnvEnabled } from '../services/publicEnv';

interface ClientChartsProps {
  client: { id: string; name: string; platform?: AdPlatform };
  accounts?: Array<{ id: string; name: string; platform?: AdPlatform }>;
  embedded?: boolean;
  period?: ChartPeriod;
  customStartDate?: string;
  customEndDate?: string;
  onBack: () => void;
  onGeneratePDF?: () => void;
}

export type ChartPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last60days' | 'custom';

interface DailyData { date: string; spend: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number; }
interface CampaignData { name: string; id?: string; spend: number; impressions: number; clicks: number; ctr: number; cpc?: number; objective?: string; objectiveLabel?: string; }
interface ObjectiveData { objective: string; objectiveLabel: string; spend: number; impressions: number; clicks: number; campaigns: number; ctr: number; cpc: number; }

const COLORS = ['#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#f97316','#22c55e','#14b8a6','#3b82f6'];
const OBJECTIVE_COLORS: Record<string, string> = {
  'OUTCOME_TRAFFIC': '#3b82f6', 'OUTCOME_ENGAGEMENT': '#8b5cf6', 'OUTCOME_LEADS': '#22c55e',
  'OUTCOME_SALES': '#f59e0b', 'OUTCOME_AWARENESS': '#06b6d4', 'CONVERSIONS': '#ef4444',
  'MESSAGES': '#10b981', 'LINK_CLICKS': '#6366f1', 'LEAD_GENERATION': '#84cc16',
  'VIDEO_VIEWS': '#ec4899', 'UNKNOWN': '#94a3b8'
};

const chartTheme = { grid: '#0f1a2e', axis: '#2d3a50', tooltip: { bg: '#07101e', border: 'rgba(255,255,255,0.08)', text: '#f1f5f9' } };
const fmt = { currency: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, number: (v: number) => v.toLocaleString('pt-BR'), percent: (v: number) => `${v.toFixed(2).replace('.', ',')}%` };

const PANEL: React.CSSProperties = { background: '#08101e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 };
const SEG_BTN = (active: boolean): React.CSSProperties => ({
  padding: '5px 12px', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
  color: active ? '#a5b4fc' : '#334155',
  border: '1px solid transparent',
});

export const ClientCharts: React.FC<ClientChartsProps> = ({
  client,
  accounts,
  embedded = false,
  period: controlledPeriod,
  customStartDate: controlledCustomStartDate,
  customEndDate: controlledCustomEndDate,
  onBack,
  onGeneratePDF,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalPeriod, setInternalPeriod] = useState<ChartPeriod>('last30days');
  const [internalCustomStartDate, setInternalCustomStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [internalCustomEndDate, setInternalCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [objectiveData, setObjectiveData] = useState<ObjectiveData[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [summary, setSummary] = useState({ totalSpend: 0, totalImpressions: 0, totalClicks: 0, avgCtr: 0, avgCpc: 0, totalConversions: 0, spendChange: 0, ctrChange: 0 });

  const period = controlledPeriod || internalPeriod;
  const customStartDate = controlledCustomStartDate || internalCustomStartDate;
  const customEndDate = controlledCustomEndDate || internalCustomEndDate;

  useEffect(() => { if (period !== 'custom') fetchChartData(); }, [client.id, period, accounts]);
  useEffect(() => { if (period === 'custom' && customStartDate && customEndDate) fetchChartData(); }, [customStartDate, customEndDate, period]);

  const fetchChartData = async () => {
    setLoading(true); setError(null);
    try {
      if (isPublicEnvEnabled('VITE_DEV_BYPASS')) {
        await new Promise(r => setTimeout(r, 600));
        const days = period === 'today' || period === 'yesterday' ? 1 : period === 'last7days' ? 7 : period === 'last60days' ? 60 : 30;
        const mockDaily: DailyData[] = Array.from({ length: days }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
          const base = 180 + Math.sin(i * 0.5) * 60 + Math.random() * 80;
          const impr = Math.round(base * 120 + Math.random() * 5000);
          const clks = Math.round(impr * (0.012 + Math.random() * 0.018));
          return { date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), spend: parseFloat(base.toFixed(2)), impressions: impr, clicks: clks, ctr: parseFloat(((clks / impr) * 100).toFixed(2)), cpc: parseFloat((base / clks).toFixed(2)), conversions: Math.round(Math.random() * 12) };
        });
        const mockCampaigns: CampaignData[] = [
          { name: 'Promoção Verão 2025', spend: 1840.50, impressions: 218400, clicks: 3120, ctr: 1.43, cpc: 0.59, objective: 'OUTCOME_SALES', objectiveLabel: 'Vendas' },
          { name: 'Leads Qualificados Q2', spend: 960.00, impressions: 98200, clicks: 1870, ctr: 1.90, cpc: 0.51, objective: 'OUTCOME_LEADS', objectiveLabel: 'Leads' },
          { name: 'Remarketing Carrinho', spend: 540.30, impressions: 45600, clicks: 980, ctr: 2.15, cpc: 0.55, objective: 'OUTCOME_SALES', objectiveLabel: 'Vendas' },
          { name: 'Awareness Marca', spend: 320.00, impressions: 187000, clicks: 620, ctr: 0.33, cpc: 0.52, objective: 'OUTCOME_AWARENESS', objectiveLabel: 'Reconhecimento' },
          { name: 'WhatsApp Direto', spend: 280.70, impressions: 32000, clicks: 890, ctr: 2.78, cpc: 0.32, objective: 'MESSAGES', objectiveLabel: 'Mensagens' },
        ];
        const totSpend = mockCampaigns.reduce((s, c) => s + c.spend, 0);
        const totImpr = mockCampaigns.reduce((s, c) => s + c.impressions, 0);
        const totClks = mockCampaigns.reduce((s, c) => s + c.clicks, 0);
        setDailyData(mockDaily);
        setCampaignData(mockCampaigns);
        setObjectiveData([
          { objective: 'OUTCOME_SALES', objectiveLabel: 'Vendas', spend: 2380.80, impressions: 264000, clicks: 4100, campaigns: 2, ctr: 1.55, cpc: 0.58 },
          { objective: 'OUTCOME_LEADS', objectiveLabel: 'Leads', spend: 960.00, impressions: 98200, clicks: 1870, campaigns: 1, ctr: 1.90, cpc: 0.51 },
          { objective: 'OUTCOME_AWARENESS', objectiveLabel: 'Reconhecimento', spend: 320.00, impressions: 187000, clicks: 620, campaigns: 1, ctr: 0.33, cpc: 0.52 },
          { objective: 'MESSAGES', objectiveLabel: 'Mensagens', spend: 280.70, impressions: 32000, clicks: 890, campaigns: 1, ctr: 2.78, cpc: 0.32 },
        ]);
        setSummary({ totalSpend: totSpend, totalImpressions: totImpr, totalClicks: totClks, avgCtr: parseFloat(((totClks / totImpr) * 100).toFixed(2)), avgCpc: parseFloat((totSpend / totClks).toFixed(2)), totalConversions: 148, spendChange: 12.4, ctrChange: -3.2 });
        setLoading(false);
        return;
      }

      const { fetchPlatformInsights } = await import('../services/platformApi');

      const datePresetMap: Record<string, string> = { today: 'today', yesterday: 'yesterday', last7days: 'last_7d', last30days: 'last_30d', last60days: 'last_60d' };
      const selectedAccounts = accounts?.length ? accounts : [client];
      const options = period === 'custom'
        ? { dateStart: customStartDate, dateEnd: customEndDate }
        : { datePreset: datePresetMap[period] || 'last_30d' };

      const results = await Promise.allSettled(selectedAccounts.map(async (account) => {
        const platform = account.platform || 'meta';
        const response = await fetchPlatformInsights(platform, account.id, options);
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
      const daily = analysis.dailyRows.map((d) => ({ date: d.dateFormatted || d.date, spend: d.spend, impressions: d.impressions, clicks: d.clicks, ctr: d.ctr, cpc: d.cpc, conversions: d.conversions || 0 }));
      setDailyData(daily);
      setCampaignData(analysis.campaignRows.map((d) => ({
        name: selectedAccounts.length > 1 ? `${d.campaignName || 'Campanha sem nome'} · ${d.accountName}` : d.campaignName || 'Campanha sem nome',
        id: d.campaignId,
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        ctr: d.ctr,
        cpc: d.cpc,
        objective: getInsightObjective(d),
        objectiveLabel: getInsightObjectiveLabel(d),
      })));
      setObjectiveData(buildObjectiveData(analysis.campaignRows));
      setSummary({ totalSpend: analysis.totals.spend, totalImpressions: analysis.totals.impressions, totalClicks: analysis.totals.clicks, avgCtr: analysis.totals.ctr, avgCpc: analysis.totals.cpc, totalConversions: analysis.totals.conversions, spendChange: 0, ctrChange: 0 });
    } catch (e: any) {
      setError(e?.message || 'Erro ao buscar dados.');
      setDailyData([]); setCampaignData([]); setObjectiveData([]);
    } finally { setLoading(false); }
  };

  const getInsightObjective = (insight: PlatformInsight): string => {
    const raw = insight.raw as any;
    return raw?.objective || raw?.campaign?.advertisingChannelType || raw?.objectiveLabel || 'UNKNOWN';
  };

  const getInsightObjectiveLabel = (insight: PlatformInsight): string => {
    const raw = insight.raw as any;
    return raw?.objectiveLabel || raw?.campaign?.advertisingChannelType || raw?.objective || 'Geral';
  };

  const buildObjectiveData = (insights: PlatformInsight[]): ObjectiveData[] => {
    const grouped = new Map<string, ObjectiveData>();
    insights.forEach((insight) => {
      const objective = getInsightObjective(insight);
      const objectiveLabel = getInsightObjectiveLabel(insight);
      const current = grouped.get(objective) || {
        objective,
        objectiveLabel,
        spend: 0,
        impressions: 0,
        clicks: 0,
        campaigns: 0,
        ctr: 0,
        cpc: 0,
      };
      current.spend += insight.spend;
      current.impressions += insight.impressions;
      current.clicks += insight.clicks;
      current.campaigns += 1;
      current.ctr = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0;
      current.cpc = current.clicks > 0 ? current.spend / current.clicks : 0;
      grouped.set(objective, current);
    });
    return Array.from(grouped.values());
  };

  const filteredCampaigns = selectedObjective ? campaignData.filter(c => c.objective === selectedObjective) : campaignData;
  const filteredSummary = selectedObjective ? (() => { const o = objectiveData.find(o => o.objective === selectedObjective); return o ? { ...summary, totalSpend: o.spend, totalImpressions: o.impressions, totalClicks: o.clicks, avgCtr: o.ctr, avgCpc: o.cpc } : summary; })() : summary;
  const totalSpend = campaignData.reduce((s, c) => s + c.spend, 0) || 1;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#07101e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', fontSize: 11 }}>
        <p style={{ color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.dataKey === 'spend' || entry.dataKey === 'cpc' ? fmt.currency(entry.value) : entry.dataKey === 'ctr' ? fmt.percent(entry.value) : fmt.number(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className={embedded ? 'flex items-center justify-center py-16' : 'min-h-screen flex items-center justify-center'} style={{ background: '#04060f' }}>
      <div className="text-center">
        <ArrowsClockwise size={36} color="#6366f1" className="animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Carregando dados...</p>
      </div>
    </div>
  );

  if (error && embedded) return (
    <div className="rounded-xl p-6 text-center" style={PANEL}>
      <WarningCircle size={24} color="#f87171" className="mx-auto mb-3" />
      <h2 className="text-base font-bold text-white mb-2">Erro ao carregar dados</h2>
      <p className="text-sm text-slate-500 mb-4">{error}</p>
      <button onClick={fetchChartData} className="px-4 py-2 text-xs font-bold text-white rounded-lg" style={{ background: '#6366f1' }}>Tentar novamente</button>
    </div>
  );

  if (error) return (
    <div className="min-h-screen" style={{ background: '#04060f' }}>
      <PageHeader client={client} onBack={onBack} period={period} setPeriod={setInternalPeriod} customStartDate={customStartDate} customEndDate={customEndDate} setCustomStartDate={setInternalCustomStartDate} setCustomEndDate={setInternalCustomEndDate} onRefresh={fetchChartData} onPDF={onGeneratePDF} />
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center max-w-sm rounded-2xl p-8" style={PANEL}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <WarningCircle size={24} color="#f87171" />
          </div>
          <h2 className="text-base font-bold text-white mb-2">Erro ao carregar dados</h2>
          <p className="text-sm text-slate-500 mb-5">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onBack} className="px-4 py-2 text-xs font-semibold rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#475569' }}>Voltar</button>
            <button onClick={fetchChartData} className="px-4 py-2 text-xs font-bold text-white rounded-lg" style={{ background: '#6366f1' }}>Tentar novamente</button>
          </div>
        </div>
      </div>
    </div>
  );

  const kpis = [
    { label: 'Gasto Total', value: fmt.currency(filteredSummary.totalSpend), color: '#f97316', Icon: CurrencyCircleDollar, change: summary.spendChange },
    { label: 'Impressões', value: fmt.number(filteredSummary.totalImpressions), color: '#6366f1', Icon: Eye },
    { label: 'Cliques', value: fmt.number(filteredSummary.totalClicks), color: '#8b5cf6', Icon: CursorClick },
    { label: 'CTR Médio', value: fmt.percent(filteredSummary.avgCtr), color: '#22c55e', Icon: ChartLineUp, change: summary.ctrChange },
    { label: 'CPC Médio', value: fmt.currency(filteredSummary.avgCpc), color: '#f59e0b', Icon: Tag },
    { label: 'Campanhas', value: String(filteredCampaigns.length), color: '#a78bfa', Icon: Lightning },
  ];

  return (
    <div className={embedded ? '' : 'min-h-screen'} style={{ background: '#04060f' }}>
      {!embedded && <PageHeader client={client} onBack={onBack} period={period} setPeriod={setInternalPeriod} customStartDate={customStartDate} customEndDate={customEndDate} setCustomStartDate={setInternalCustomStartDate} setCustomEndDate={setInternalCustomEndDate} onRefresh={fetchChartData} onPDF={onGeneratePDF} />}

      <main className={embedded ? 'space-y-5' : 'max-w-7xl mx-auto px-5 sm:px-8 py-6 space-y-5'}>

        {/* KPI strip */}
        <div className="grid overflow-hidden rounded-xl" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', background: '#08101e', border: '1px solid rgba(255,255,255,0.06)' }}>
          {kpis.map(({ label, value, color, Icon, change }, i) => (
            <div key={label} className="px-4 py-3" style={{ borderRight: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color }}>
                <Icon size={12} color={color} weight="bold" />
                {label}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              {change !== undefined && change !== 0 && (
                <div className="mt-1 text-[9px] font-semibold" style={{ color: change >= 0 ? '#22c55e' : '#ef4444' }}>
                  {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs ant.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Objective filter */}
        {objectiveData.length > 0 && (
          <div className="rounded-xl px-4 py-3" style={PANEL}>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1.5 mr-1 shrink-0" style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#2d3a52' }}>
                <Funnel size={12} />
                Filtrar por Objetivo
              </div>
              {objectiveData.map((obj, i) => {
                const color = OBJECTIVE_COLORS[obj.objective] || COLORS[i % COLORS.length];
                const active = selectedObjective === obj.objective;
                return (
                  <button
                    key={obj.objective}
                    onClick={() => setSelectedObjective(active ? null : obj.objective)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all"
                    style={active
                      ? { background: `${color}18`, color, border: `1px solid ${color}40` }
                      : { background: 'rgba(255,255,255,0.03)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, flexShrink: 0 }} />
                    {obj.objectiveLabel}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#334155' }}>{obj.campaigns}</span>
                  </button>
                );
              })}
              {selectedObjective && (
                <button onClick={() => setSelectedObjective(null)} className="ml-auto text-[10px] font-semibold flex items-center gap-1" style={{ color: '#475569' }}>
                  × Limpar filtro
                </button>
              )}
            </div>
          </div>
        )}

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden" style={PANEL}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                <ChartLineUp size={14} color="#f97316" weight="bold" />
                Evolução de Gastos
              </div>
              <div className="flex items-center gap-1.5" style={{ fontSize: 9, color: '#475569' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f97316' }} />
                Gasto diário
              </div>
            </div>
            <div className="p-4">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 4" stroke={chartTheme.grid} />
                    <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={9} tick={{ fill: '#334155' }} />
                    <YAxis stroke={chartTheme.axis} fontSize={9} tick={{ fill: '#334155' }} tickFormatter={v => `R$${v}`} width={42} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="spend" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#spendGrad)" name="Gasto" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-slate-700 text-sm">Sem dados no período</div>
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={PANEL}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                <ChartLine size={14} color="#22c55e" weight="bold" />
                CTR e CPC ao longo do tempo
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1" style={{ fontSize: 9, color: '#475569' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} /> CTR (%)
                </div>
                <div className="flex items-center gap-1" style={{ fontSize: 9, color: '#475569' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} /> CPC (R$)
                </div>
              </div>
            </div>
            <div className="p-4">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 4" stroke={chartTheme.grid} />
                    <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={9} tick={{ fill: '#334155' }} />
                    <YAxis yAxisId="left" stroke={chartTheme.axis} fontSize={9} tick={{ fill: '#334155' }} tickFormatter={v => `${v}%`} width={36} />
                    <YAxis yAxisId="right" orientation="right" stroke={chartTheme.axis} fontSize={9} tick={{ fill: '#334155' }} tickFormatter={v => `R$${v}`} width={42} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line yAxisId="left" type="monotone" dataKey="ctr" stroke="#22c55e" strokeWidth={2} dot={false} name="CTR (%)" />
                    <Line yAxisId="right" type="monotone" dataKey="cpc" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" name="CPC (R$)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-slate-700 text-sm">Sem dados no período</div>
              )}
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        {objectiveData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribuição por Objetivo — donut + side legend */}
            <div className="rounded-xl overflow-hidden" style={PANEL}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  <ChartDonut size={14} color="#8b5cf6" weight="bold" />
                  Distribuição por Objetivo
                </div>
                <span style={{ fontSize: 9, color: '#334155' }}>clique para filtrar</span>
              </div>
              <div className="p-4 flex items-center gap-5">
                <div style={{ flexShrink: 0 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={objectiveData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={74}
                        paddingAngle={3}
                        dataKey="spend"
                        nameKey="objectiveLabel"
                      >
                        {objectiveData.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={OBJECTIVE_COLORS[entry.objective] || COLORS[i % COLORS.length]}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedObjective(selectedObjective === entry.objective ? null : entry.objective)}
                            opacity={selectedObjective && selectedObjective !== entry.objective ? 0.25 : 1}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _: string, p: any) => [fmt.currency(v), p.payload.objectiveLabel]}
                        contentStyle={{ background: '#07101e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5 flex-1">
                  {objectiveData.map((obj, i) => {
                    const color = OBJECTIVE_COLORS[obj.objective] || COLORS[i % COLORS.length];
                    const totalS = objectiveData.reduce((s, o) => s + o.spend, 0);
                    const pct = ((obj.spend / totalS) * 100).toFixed(0);
                    return (
                      <div key={obj.objective} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
                        <span className="text-[10px] flex-1" style={{ color: '#64748b' }}>{obj.objectiveLabel}</span>
                        <span className="text-[10px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>{fmt.currency(obj.spend)}</span>
                        <span className="text-[9px]" style={{ color: '#334155' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gastos por Objetivo — horizontal bars */}
            <div className="rounded-xl overflow-hidden" style={PANEL}>
              <div className="flex items-center px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  <ChartBarHorizontal size={14} color="#6366f1" weight="bold" />
                  Gastos por Objetivo
                </div>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {objectiveData.map((obj, i) => {
                  const color = OBJECTIVE_COLORS[obj.objective] || COLORS[i % COLORS.length];
                  const totalS = objectiveData.reduce((s, o) => s + o.spend, 0);
                  const pct = (obj.spend / totalS) * 100;
                  return (
                    <div key={obj.objective}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
                          <span className="text-[10px]" style={{ color: '#64748b' }}>{obj.objectiveLabel}</span>
                        </div>
                        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#f97316', fontWeight: 700 }}>
                          {fmt.currency(obj.spend)} <span style={{ color: '#475569', fontWeight: 400 }}>· {pct.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
                {/* CTR footer */}
                <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 9, color: '#334155' }}>CTR médio por obj.</span>
                  <div className="flex gap-3">
                    {objectiveData.map((obj, i) => {
                      const color = OBJECTIVE_COLORS[obj.objective] || COLORS[i % COLORS.length];
                      return (
                        <span key={obj.objective} style={{ fontSize: 9, color, fontFamily: 'monospace' }}>
                          {obj.objectiveLabel.split(' ')[0]} {fmt.percent(obj.ctr)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign table */}
        <div className="rounded-xl overflow-hidden" style={PANEL}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              <Table size={14} color="#334155" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Detalhamento por Campanha
                {selectedObjective && (
                  <span className="ml-2 text-[10px] normal-case font-normal" style={{ color: '#6366f1' }}>
                    ({objectiveData.find(o => o.objective === selectedObjective)?.objectiveLabel} · {filteredCampaigns.length})
                  </span>
                )}
              </h3>
            </div>
            {selectedObjective && (
              <button onClick={() => setSelectedObjective(null)} className="text-xs font-semibold" style={{ color: '#6366f1' }}>Ver todas</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Campanha', 'Objetivo', 'Gasto', 'Impressões', 'CTR', 'Share'].map((h, i) => (
                    <th
                      key={h}
                      className={i < 2 ? 'text-left' : 'text-right'}
                      style={{ padding: '10px 16px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2d3a50' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign, i) => {
                  const objColor = campaign.objective ? (OBJECTIVE_COLORS[campaign.objective] || COLORS[i % COLORS.length]) : COLORS[i % COLORS.length];
                  const ctrColor = campaign.ctr >= 2 ? '#22c55e' : campaign.ctr >= 1 ? '#f59e0b' : '#ef4444';
                  const sharePct = (campaign.spend / totalSpend) * 100;
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                    >
                      <td style={{ padding: '11px 16px' }}>
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: objColor }} />
                          <span className="text-xs font-medium text-slate-200">{campaign.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        {campaign.objectiveLabel ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: `${objColor}18`, color: objColor }}>
                            {campaign.objectiveLabel}
                          </span>
                        ) : <span className="text-slate-700 text-xs">—</span>}
                      </td>
                      <td className="text-right" style={{ padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt.currency(campaign.spend)}
                      </td>
                      <td className="text-right" style={{ padding: '11px 16px', fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt.number(Math.round(campaign.impressions))}
                      </td>
                      <td className="text-right" style={{ padding: '11px 16px' }}>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${ctrColor}18`, color: ctrColor }}>
                          {fmt.percent(campaign.ctr)}
                        </span>
                      </td>
                      <td className="text-right" style={{ padding: '11px 16px', width: 100 }}>
                        <div className="flex items-center gap-2 justify-end">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', width: 56 }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(sharePct, 100)}%`, background: objColor }} />
                          </div>
                          <span style={{ fontSize: 9, color: '#334155', width: 28, textAlign: 'right' }}>{sharePct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

function PageHeader({ client, onBack, period, setPeriod, customStartDate, customEndDate, setCustomStartDate, setCustomEndDate, onRefresh, onPDF }: any) {
  return (
    <header
      className="backdrop-blur-xl border-b sticky top-0 z-10"
      style={{ background: 'rgba(6,8,15,0.9)', borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between gap-4 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
          >
            <ArrowLeft size={14} />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{client.name}</p>
            <p className="text-[10px] text-slate-700">Análise de performance</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Segmented period */}
          <div className="flex items-center rounded-xl p-1 gap-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[{ value: 'today', label: 'Hoje' }, { value: 'yesterday', label: 'Ontem' }, { value: 'last7days', label: '7d' }, { value: 'last30days', label: '30d' }, { value: 'last60days', label: '60d' }, { value: 'custom', label: 'Custom' }].map(opt => (
              <button key={opt.value} onClick={() => setPeriod(opt.value)} style={SEG_BTN(period === opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} max={customEndDate} className="bg-transparent text-slate-300 text-xs border-none focus:ring-0 p-0 w-28" />
              <span className="text-slate-700">até</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} min={customStartDate} max={new Date().toISOString().split('T')[0]} className="bg-transparent text-slate-300 text-xs border-none focus:ring-0 p-0 w-28" />
            </div>
          )}

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
          >
            <ArrowsClockwise size={13} />
            Atualizar
          </button>
          <button
            onClick={onPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}
          >
            <FilePdf size={14} weight="bold" />
            PDF
          </button>
        </div>
      </div>
    </header>
  );
}
