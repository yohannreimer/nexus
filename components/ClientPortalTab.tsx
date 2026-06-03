import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Copy, GlobeHemisphereWest, Link, LockKey, SlidersHorizontal } from '@phosphor-icons/react';
import type { ClientPortal, ClientPortalMode, ClientWorkspaceSummary } from '../services/clientWorkspaceTypes';
import { buildPortalSlug, defaultPortalVisibility } from '../services/portalModel';

export type ClientPortalSaveInput = {
  slug: string;
  status: ClientPortal['status'];
  mode: ClientPortalMode;
  branding: Record<string, unknown>;
  visibilitySettings: Record<string, unknown>;
  accessSettings: Record<string, unknown>;
};

interface ClientPortalTabProps {
  summary: ClientWorkspaceSummary;
  portal: ClientPortal | null;
  onSave: (input: ClientPortalSaveInput) => Promise<void>;
}

const modeOptions: Array<{
  mode: ClientPortalMode;
  label: string;
  description: string;
}> = [
  { mode: 'essential', label: 'Essencial', description: 'KPIs e histórico, sem excesso de detalhe.' },
  { mode: 'executive', label: 'Executivo', description: 'Visão principal para a maioria dos clientes.' },
  { mode: 'complete', label: 'Completo', description: 'Inclui plataformas, campanhas e gráficos detalhados.' },
];

const visibilityLabels: Array<{ key: string; label: string; description: string }> = [
  { key: 'kpis', label: 'KPIs principais', description: 'Investimento, cliques, CTR e conversões.' },
  { key: 'comparison', label: 'Comparativo', description: 'Variação contra o período anterior.' },
  { key: 'simpleChart', label: 'Gráfico simples', description: 'Evolução resumida para leitura rápida.' },
  { key: 'platformBreakdown', label: 'Por plataforma', description: 'Separação entre Meta e Google.' },
  { key: 'campaigns', label: 'Campanhas', description: 'Lista de campanhas do relatório.' },
  { key: 'detailedCharts', label: 'Gráficos detalhados', description: 'Visualizações mais completas.' },
  { key: 'history', label: 'Histórico', description: 'Relatórios enviados anteriormente.' },
];

export const ClientPortalTab: React.FC<ClientPortalTabProps> = ({ summary, portal, onSave }) => {
  const defaultSlug = useMemo(() => buildPortalSlug(summary.client.name), [summary.client.name]);
  const [slug, setSlug] = useState(portal?.slug || defaultSlug);
  const [status, setStatus] = useState<ClientPortal['status']>(portal?.status || 'active');
  const [mode, setMode] = useState<ClientPortalMode>(portal?.mode || summary.settings?.portalMode || 'executive');
  const [agencyPublicName, setAgencyPublicName] = useState(readAgencyPublicName(portal));
  const [accentColor, setAccentColor] = useState(readAccentColor(portal));
  const [visibility, setVisibility] = useState<Record<string, boolean>>({
    ...defaultPortalVisibility(mode),
    ...readBooleanRecord(portal?.visibilitySettings || {}),
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const nextMode = portal?.mode || summary.settings?.portalMode || 'executive';
    setSlug(portal?.slug || buildPortalSlug(summary.client.name));
    setStatus(portal?.status || 'active');
    setMode(nextMode);
    setAgencyPublicName(readAgencyPublicName(portal));
    setAccentColor(readAccentColor(portal));
    setVisibility({
      ...defaultPortalVisibility(nextMode),
      ...readBooleanRecord(portal?.visibilitySettings || {}),
    });
  }, [portal, summary.client.name, summary.settings?.portalMode]);

  const portalUrl = `${window.location.origin}/portal/${slug || defaultSlug}`;

  const handleModeChange = (nextMode: ClientPortalMode) => {
    setMode(nextMode);
    setVisibility(defaultPortalVisibility(nextMode));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        slug: buildPortalSlug(slug),
        status,
        mode,
        branding: { agencyPublicName: agencyPublicName.trim(), accentColor },
        visibilitySettings: visibility,
        accessSettings: { publicAccess: true },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}>
              <GlobeHemisphereWest size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Portal do Cliente</h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure o link público que o cliente acessa para ver os relatórios já preparados.
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded-lg disabled:opacity-60"
            style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <CheckCircle size={13} weight="bold" />
            {saving ? 'Salvando...' : 'Salvar portal'}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] mt-5">
          <label className="block">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Slug público</span>
            <div className="flex rounded-lg bg-slate-950/60 border border-white/10 overflow-hidden focus-within:border-indigo-400/50">
              <span className="hidden sm:inline-flex items-center px-3 text-[11px] text-slate-600 border-r border-white/10">
                /portal/
              </span>
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                onBlur={() => setSlug((value) => buildPortalSlug(value))}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Nome público da agência</span>
            <input
              value={agencyPublicName}
              onChange={(event) => setAgencyPublicName(event.target.value)}
              placeholder="Nome que aparece no portal"
              className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-400/50"
            />
          </label>

          <label className="block md:w-40">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Cor da marca</span>
            <input
              type="color"
              value={accentColor}
              onChange={(event) => setAccentColor(event.target.value)}
              className="w-full h-[34px] rounded-lg bg-slate-950/60 border border-white/10 px-2 py-1"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="min-w-0 flex-1 inline-flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Link size={13} weight="bold" className="text-slate-500 shrink-0" />
            <span className="truncate text-[11px] text-slate-400">{portalUrl}</span>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg"
            style={{ color: '#93c5fd', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)' }}
          >
            <Copy size={13} weight="bold" />
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={16} weight="bold" className="text-indigo-300" />
            <h3 className="text-xs font-bold text-white">Formato do portal</h3>
          </div>

          <div className="grid gap-2">
            {modeOptions.map((option) => (
              <button
                key={option.mode}
                onClick={() => handleModeChange(option.mode)}
                className="text-left rounded-lg px-3 py-3 transition-colors"
                style={mode === option.mode
                  ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(129,140,248,0.35)' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-xs font-bold" style={{ color: mode === option.mode ? '#c7d2fe' : '#cbd5e1' }}>
                  {option.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start gap-2">
              <LockKey size={15} weight="bold" className="text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-200">Portal ativo</div>
                <div className="text-[11px] text-slate-500">Quando pausado, o link não deve aparecer para o cliente.</div>
              </div>
            </div>
            <button
              onClick={() => setStatus((current) => current === 'active' ? 'paused' : 'active')}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={status === 'active'
                ? { color: '#86efac', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.22)' }
                : { color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)' }}
            >
              {status === 'active' ? 'Ativo' : 'Pausado'}
            </button>
          </div>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-xs font-bold text-white mb-4">Seções visíveis</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibilityLabels.map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 rounded-lg p-3 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(visibility[item.key])}
                  onChange={(event) => setVisibility((current) => ({ ...current, [item.key]: event.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-xs font-bold text-slate-200">{item.label}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">{item.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

function readAccentColor(portal: ClientPortal | null): string {
  const color = portal?.branding?.accentColor;
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#6366f1';
}

function readAgencyPublicName(portal: ClientPortal | null): string {
  const agencyPublicName = portal?.branding?.agencyPublicName;
  return typeof agencyPublicName === 'string' ? agencyPublicName : '';
}

function readBooleanRecord(value: Record<string, unknown>): Record<string, boolean> {
  return Object.entries(value).reduce<Record<string, boolean>>((result, [key, item]) => {
    if (typeof item === 'boolean') result[key] = item;
    return result;
  }, {});
}
