import React, { useEffect, useMemo, useState } from 'react';
import { ChartLineUp, Clock, FileText, GlobeHemisphereWest, TrendUp, WarningCircle } from '@phosphor-icons/react';
import { getPublicPortalBySlug, type PublicClientPortalData, type PublicPortalReport } from '../services/clientWorkspaceApi';

interface ClientPortalPublicViewProps {
  slug: string;
  reportDate?: string | null;
}

export const ClientPortalPublicView: React.FC<ClientPortalPublicViewProps> = ({ slug, reportDate }) => {
  const [data, setData] = useState<PublicClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getPublicPortalBySlug(slug)
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Nao foi possivel carregar o portal.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const selectedReport = useMemo(() => {
    if (!data) return null;
    if (!reportDate) return data.latestRun;
    return data.recentRuns.find((run) => String(run.periodStart || run.createdAt || '').startsWith(reportDate)) || data.latestRun;
  }, [data, reportDate]);

  if (loading) return <PortalShell><StateMessage title="Carregando portal" body="Estamos preparando o relatorio do cliente." /></PortalShell>;
  if (error) return <PortalShell><StateMessage title="Erro ao carregar" body={error} tone="error" /></PortalShell>;
  if (!data || !selectedReport) {
    return (
      <PortalShell>
        <StateMessage title="Portal indisponivel" body="Este link esta inativo ou ainda nao possui relatorio publicado." tone="error" />
      </PortalShell>
    );
  }

  const portal = data.portal;
  const visibility = readRecord(portal.visibility);
  const branding = readRecord(portal.branding);
  const accentColor = typeof branding.accentColor === 'string' ? branding.accentColor : '#6366f1';
  const agencyName = typeof branding.agencyPublicName === 'string' && branding.agencyPublicName.trim()
    ? branding.agencyPublicName.trim()
    : 'Nexus AI';
  const mode = portal.mode === 'complete' || portal.mode === 'essential' ? portal.mode : 'executive';
  const summary = readRecord(selectedReport.summary);
  const metrics = readRecord(summary.metrics || summary.totals || summary);
  const campaigns = Array.isArray(summary.campaigns) ? summary.campaigns.filter(isRecord) : [];

  return (
    <PortalShell accentColor={accentColor}>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-white/10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <GlobeHemisphereWest size={14} weight="bold" style={{ color: accentColor }} />
              {agencyName}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-3 tracking-tight">{data.clientName}</h1>
            <p className="text-sm text-slate-500 mt-2">
              Relatorio de {formatDate(String(selectedReport.periodStart || ''))} ate {formatDate(String(selectedReport.periodEnd || ''))}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 self-start" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Clock size={14} weight="bold" className="text-slate-500" />
            <span className="text-[11px] font-bold text-slate-300">{modeLabel(mode)}</span>
          </div>
        </header>

        {visibility.kpis !== false && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mt-6">
            <Kpi label="Investimento" value={formatCurrency(numberValue(metrics.spend))} accent="#f97316" />
            <Kpi label="Impressoes" value={formatNumber(numberValue(metrics.impressions))} accent="#38bdf8" />
            <Kpi label="Cliques" value={formatNumber(numberValue(metrics.clicks))} accent="#8b5cf6" />
            <Kpi label="CTR" value={formatPercent(numberValue(metrics.ctr))} accent="#22c55e" />
            <Kpi label="Conversoes" value={formatNumber(numberValue(metrics.conversions))} accent="#f59e0b" />
          </section>
        )}

        <main className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] mt-6">
          <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} weight="bold" style={{ color: accentColor }} />
              <h2 className="text-sm font-bold text-white">Resumo executivo</h2>
            </div>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
              {String(selectedReport.deterministicMessage || 'Relatorio gerado para acompanhamento do periodo.')}
            </p>
          </section>

          {(mode === 'executive' || mode === 'complete') && visibility.simpleChart !== false && (
            <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-4">
                <ChartLineUp size={16} weight="bold" className="text-sky-300" />
                <h2 className="text-sm font-bold text-white">Distribuicao</h2>
              </div>
              <SpendBars campaigns={campaigns} accentColor={accentColor} />
            </section>
          )}
        </main>

        {mode === 'complete' && visibility.campaigns === true && campaigns.length > 0 && (
          <section className="rounded-xl p-5 mt-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-sm font-bold text-white mb-4">Campanhas</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-600 border-b border-white/10">
                    <th className="pb-2 font-bold">Campanha</th>
                    <th className="pb-2 font-bold">Plataforma</th>
                    <th className="pb-2 font-bold">Investimento</th>
                    <th className="pb-2 font-bold">Cliques</th>
                    <th className="pb-2 font-bold">CTR</th>
                    <th className="pb-2 font-bold">Conversoes</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 12).map((campaign, index) => (
                    <tr key={`${String(campaign.campaignName || campaign.name || 'campanha')}-${index}`} className="border-b border-white/5 text-xs text-slate-300">
                      <td className="py-3 font-semibold text-white">{String(campaign.campaignName || campaign.name || 'Campanha')}</td>
                      <td className="py-3 text-slate-500">{String(campaign.platform || '-')}</td>
                      <td className="py-3">{formatCurrency(numberValue(campaign.spend))}</td>
                      <td className="py-3">{formatNumber(numberValue(campaign.clicks))}</td>
                      <td className="py-3">{formatPercent(numberValue(campaign.ctr))}</td>
                      <td className="py-3">{formatNumber(numberValue(campaign.conversions))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {visibility.history !== false && data.recentRuns.length > 1 && (
          <section className="rounded-xl p-5 mt-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-sm font-bold text-white mb-4">Historico de relatorios</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.recentRuns.map((run) => (
                <a
                  key={String(run.id)}
                  href={`/portal/${slug}/reports/${String(run.periodStart || '').slice(0, 10)}`}
                  className="rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.05]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-xs font-bold text-slate-200">{formatDate(String(run.periodStart || ''))}</div>
                  <div className="text-[11px] text-slate-500 mt-1">ate {formatDate(String(run.periodEnd || ''))}</div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </PortalShell>
  );
};

function PortalShell({ children, accentColor = '#6366f1' }: { children: React.ReactNode; accentColor?: string }) {
  return (
    <div className="min-h-screen" style={{ background: '#04060f' }}>
      <div className="fixed inset-x-0 top-0 h-1" style={{ background: accentColor }} />
      {children}
    </div>
  );
}

function StateMessage({ title, body, tone = 'default' }: { title: string; body: string; tone?: 'default' | 'error' }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md rounded-xl p-6 text-center" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <WarningCircle size={26} weight="bold" className="mx-auto mb-3" style={{ color: tone === 'error' ? '#fca5a5' : '#a5b4fc' }} />
        <h1 className="text-lg font-bold text-white">{title}</h1>
        <p className="text-sm text-slate-500 mt-2">{body}</p>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
        <TrendUp size={13} weight="bold" />
        {label}
      </div>
      <div className="text-xl font-bold text-white mt-3">{value}</div>
    </div>
  );
}

function SpendBars({ campaigns, accentColor }: { campaigns: Record<string, unknown>[]; accentColor: string }) {
  const top = campaigns
    .map((campaign) => ({
      name: String(campaign.campaignName || campaign.name || 'Campanha'),
      spend: numberValue(campaign.spend),
    }))
    .filter((campaign) => campaign.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);
  const maxSpend = Math.max(...top.map((campaign) => campaign.spend), 1);

  if (top.length === 0) {
    return <p className="text-sm text-slate-500">Sem campanhas com investimento neste periodo.</p>;
  }

  return (
    <div className="space-y-3">
      {top.map((campaign) => (
        <div key={campaign.name}>
          <div className="flex items-center justify-between gap-3 text-[11px] mb-1">
            <span className="truncate text-slate-300">{campaign.name}</span>
            <span className="font-bold text-slate-500">{formatCurrency(campaign.spend)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(campaign.spend / maxSpend) * 100}%`, background: accentColor }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function numberValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function modeLabel(mode: string): string {
  if (mode === 'complete') return 'Portal completo';
  if (mode === 'essential') return 'Portal essencial';
  return 'Portal executivo';
}
