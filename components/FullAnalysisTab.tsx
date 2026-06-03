import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowsClockwise, ChartLineUp, FileText, Gauge, ListChecks, SquaresFour, TrendUp, WarningCircle,
} from '@phosphor-icons/react';
import { buildClientAnalysisModel, ClientAnalysisModel } from '../services/clientAnalysisModel';
import type { ClientWorkspaceSummary } from '../services/clientWorkspaceTypes';
import type { AdPlatform, PlatformAccount } from '../services/platformTypes';
import { ClientCharts, type ChartPeriod } from './ClientCharts';
import { ReportPreview, type Period as ReportPeriod } from './ReportPreview';

export type AnalysisTab = 'overview' | 'platform' | 'account' | 'campaigns' | 'charts' | 'simulation';
type AnalysisPeriod = ChartPeriod;

interface FullAnalysisTabProps {
  summary: ClientWorkspaceSummary;
  initialTab?: AnalysisTab;
}

const tabs: Array<{ id: AnalysisTab; label: string }> = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'platform', label: 'Por Plataforma' },
  { id: 'account', label: 'Por Conta' },
  { id: 'campaigns', label: 'Campanhas' },
  { id: 'charts', label: 'Gráficos' },
  { id: 'simulation', label: 'Simulação' },
];

const periods: Array<{ id: AnalysisPeriod; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'last7days', label: '7 dias' },
  { id: 'last30days', label: '30 dias' },
  { id: 'last60days', label: '60 dias' },
  { id: 'custom', label: 'Custom' },
];

const datePresetMap: Record<Exclude<AnalysisPeriod, 'custom'>, string> = {
  today: 'today',
  yesterday: 'yesterday',
  last7days: 'last_7d',
  last30days: 'last_30d',
  last60days: 'last_60d',
};

const emptyModel = buildClientAnalysisModel([], []);

export const FullAnalysisTab: React.FC<FullAnalysisTabProps> = ({ summary, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>(initialTab);
  const [period, setPeriod] = useState<AnalysisPeriod>('last30days');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<ClientAnalysisModel>(emptyModel);

  const linkedAccounts = useMemo(
    () => summary.linkedAccounts
      .filter((link) => link.isActive && link.account)
      .map((link) => link.account as PlatformAccount),
    [summary.linkedAccounts],
  );
  const accountKey = linkedAccounts.map((account) => `${account.platform}:${account.externalAccountId}`).join('|');
  const analysisAccounts = useMemo(
    () => linkedAccounts.map((account) => ({
      id: account.externalAccountId,
      name: account.name,
      platform: account.platform,
    })),
    [linkedAccounts],
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalysis() {
      if (linkedAccounts.length === 0) {
        setModel(emptyModel);
        return;
      }

      setLoading(true);
      const { fetchPlatformInsights } = await import('../services/platformApi');
      const options = period === 'custom'
        ? { dateStart: customStartDate, dateEnd: customEndDate }
        : { datePreset: datePresetMap[period] };
      const results = await Promise.allSettled(linkedAccounts.map(async (account) => {
        const response = await fetchPlatformInsights(account.platform, account.externalAccountId, options);
        return {
          accountId: account.externalAccountId,
          accountName: account.name,
          platform: account.platform,
          insights: response.data,
          dailyData: response.dailyData,
        };
      }));

      if (cancelled) return;

      const successes = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      const errors = results.flatMap((result, index) => {
        if (result.status === 'fulfilled') return [];
        const account = linkedAccounts[index];
        return [{
          accountName: account.name,
          platform: account.platform,
          message: result.reason instanceof Error ? result.reason.message : 'Erro ao carregar conta',
        }];
      });

      setModel(buildClientAnalysisModel(successes, errors));
      setLoading(false);
    }

    loadAnalysis().catch((error) => {
      if (cancelled) return;
      setModel(buildClientAnalysisModel([], [{
        accountName: summary.client.name,
        platform: 'meta',
        message: error instanceof Error ? error.message : 'Erro ao carregar análise',
      }]));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [accountKey, customEndDate, customStartDate, linkedAccounts, period, summary.client.name]);

  const hasAccounts = linkedAccounts.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div
          className="min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="grid grid-cols-6 gap-1.5 min-w-[720px] xl:min-w-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 4 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="min-w-0 px-2.5 py-1.5 text-[11px] font-semibold rounded-md whitespace-nowrap truncate"
              style={activeTab === tab.id ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: '#64748b' }}
            >
              {tab.label}
            </button>
          ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row xl:flex-nowrap items-stretch sm:items-center gap-2 xl:justify-end">
          <div className="grid grid-cols-6 gap-1 rounded-lg p-1 min-w-[430px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {periods.map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id)}
                className="px-2 py-1.5 text-[10px] font-bold rounded-md whitespace-nowrap"
                style={period === item.id ? { color: '#c7d2fe', background: 'rgba(99,102,241,0.14)' } : { color: '#475569' }}
              >
                {item.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs min-w-[300px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} max={customEndDate} className="bg-transparent text-slate-300 text-xs border-none focus:ring-0 p-0 w-28" />
              <span className="text-slate-700">até</span>
              <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} min={customStartDate} max={new Date().toISOString().split('T')[0]} className="bg-transparent text-slate-300 text-xs border-none focus:ring-0 p-0 w-28" />
            </div>
          )}
          {loading && <ArrowsClockwise className="animate-spin text-indigo-300" size={16} />}
        </div>
      </div>

      {!hasAccounts && (
        <StatePanel
          icon={<WarningCircle size={20} weight="bold" />}
          title="Nenhuma conta vinculada"
          text="Vincule Meta Ads ou Google Ads na aba Contas Vinculadas para liberar a análise consolidada."
        />
      )}

      {hasAccounts && model.errors.length > 0 && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)' }}>
          <div className="text-[11px] font-bold text-amber-200 mb-1">Algumas contas não carregaram</div>
          {model.errors.map((error) => (
            <div key={`${error.platform}:${error.accountName}`} className="text-[11px] text-amber-100/70">
              {platformLabel(error.platform)} · {error.accountName}: {error.message}
            </div>
          ))}
        </div>
      )}

      {hasAccounts && activeTab === 'overview' && <OverviewPanel model={model} accountCount={linkedAccounts.length} />}
      {hasAccounts && activeTab === 'platform' && <PlatformPanel model={model} />}
      {hasAccounts && activeTab === 'account' && <AccountPanel model={model} />}
      {hasAccounts && activeTab === 'campaigns' && <CampaignsPanel model={model} />}
      {hasAccounts && activeTab === 'charts' && (
        <ClientCharts
          client={{ id: summary.client.id, name: summary.client.name }}
          accounts={analysisAccounts}
          embedded
          period={period}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onBack={() => setActiveTab('overview')}
        />
      )}
      {hasAccounts && activeTab === 'simulation' && (
        <ReportPreview
          client={{ companyName: summary.client.name, adAccountId: analysisAccounts.map((account) => account.id).join(','), platform: analysisAccounts[0]?.platform }}
          accounts={analysisAccounts}
          embedded
          period={period as ReportPeriod}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          whatsappNumber={summary.settings?.deliveryTarget || summary.client.primaryWhatsapp || ''}
          onBack={() => setActiveTab('overview')}
        />
      )}
    </div>
  );
};

function OverviewPanel({ model, accountCount }: { model: ClientAnalysisModel; accountCount: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard icon={<Gauge size={16} weight="bold" />} label="Contas lidas" value={String(accountCount)} tone="#a5b4fc" />
      <MetricCard icon={<ChartLineUp size={16} weight="bold" />} label="Investimento" value={formatCurrency(model.totals.spend)} tone="#f97316" />
      <MetricCard icon={<TrendUp size={16} weight="bold" />} label="Impressões" value={formatNumber(model.totals.impressions)} tone="#38bdf8" />
      <MetricCard icon={<ListChecks size={16} weight="bold" />} label="Cliques" value={formatNumber(model.totals.clicks)} tone="#8b5cf6" />
      <MetricCard icon={<SquaresFour size={16} weight="bold" />} label="CTR médio" value={formatPercent(model.totals.ctr)} tone="#22c55e" />
      <MetricCard icon={<FileText size={16} weight="bold" />} label="Conversões" value={formatNumber(model.totals.conversions)} tone="#f59e0b" />
    </div>
  );
}

function PlatformPanel({ model }: { model: ClientAnalysisModel }) {
  return (
    <DataPanel title="Performance por plataforma">
      {model.platformRows.map((row) => (
        <Row
          key={row.platform}
          title={platformLabel(row.platform)}
          detail={`${row.accounts} contas · ${row.campaigns} campanhas`}
          values={[
            formatCurrency(row.spend),
            formatNumber(row.clicks),
            formatPercent(row.ctr),
            formatCurrency(row.cpc),
          ]}
        />
      ))}
    </DataPanel>
  );
}

function AccountPanel({ model }: { model: ClientAnalysisModel }) {
  return (
    <DataPanel title="Performance por conta">
      {model.accountRows.map((row) => (
        <Row
          key={`${row.platform}:${row.accountId}`}
          title={row.accountName}
          detail={`${platformLabel(row.platform)} · ${row.accountId}`}
          values={[
            formatCurrency(row.spend),
            formatNumber(row.clicks),
            formatPercent(row.ctr),
            formatNumber(row.conversions),
          ]}
        />
      ))}
    </DataPanel>
  );
}

function CampaignsPanel({ model }: { model: ClientAnalysisModel }) {
  return (
    <DataPanel title="Campanhas consolidadas">
      {model.campaignRows.map((row, index) => (
        <Row
          key={`${row.platform}:${row.accountId}:${row.campaignId || index}`}
          title={row.campaignName || 'Campanha sem nome'}
          detail={`${row.accountName} · ${platformLabel(row.platform)}`}
          values={[
            formatCurrency(row.spend),
            formatNumber(row.impressions),
            formatPercent(row.ctr),
            formatNumber(row.conversions),
          ]}
        />
      ))}
    </DataPanel>
  );
}

function DataPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={panelStyle}>
      <PanelTitle title={title} subtitle="Valores consolidados do período selecionado" />
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {children}
      </div>
    </div>
  );
}

type RowProps = {
  title: string;
  detail: string;
  values: string[];
};

const Row: React.FC<RowProps> = ({ title, detail, values }) => {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_repeat(4,minmax(90px,120px))] items-center px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-200 truncate">{title}</div>
        <div className="text-[10px] text-slate-600 truncate mt-0.5">{detail}</div>
      </div>
      {values.map((value, index) => (
        <div key={`${value}:${index}`} className="text-xs font-bold md:text-right text-slate-300" style={{ fontFamily: 'monospace' }}>
          {value}
        </div>
      ))}
    </div>
  );
};

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl p-4 min-w-0" style={panelStyle}>
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: tone }}>
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold text-white mt-2 truncate" style={{ fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

function StatePanel({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl p-5" style={panelStyle}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)' }}>
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-500 mt-1">{text}</p>
        </div>
      </div>
    </div>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</h3>
      <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#0d1220',
  border: '1px solid rgba(255,255,255,0.07)',
};

function platformLabel(platform: AdPlatform): string {
  return platform === 'google' ? 'Google Ads' : 'Meta Ads';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function formatPercent(value: number): string {
  return `${value.toFixed(2).replace('.', ',')}%`;
}
