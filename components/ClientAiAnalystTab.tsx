import React, { useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle, ChatCircleText, ClipboardText, Lightning, WarningCircle } from '@phosphor-icons/react';
import type {
  ClientAiAnalysis,
  ClientAiProfile,
  ClientReportRun,
  ClientWorkspaceSummary,
} from '../services/clientWorkspaceTypes';
import {
  getClientAiProfile,
  listClientAiAnalyses,
  upsertClientAiProfile,
} from '../services/clientWorkspaceApi';
import { generateClientAiAnalysis } from '../services/edgeFunctions';

type PeriodPreset = 'yesterday' | 'last_7d' | 'last_30d' | 'last_60d' | 'custom';

interface ClientAiAnalystTabProps {
  summary: ClientWorkspaceSummary;
  reportRuns: ClientReportRun[];
}

const objectiveOptions: Array<{ value: ClientAiProfile['objective']; label: string }> = [
  { value: 'leads', label: 'Leads' },
  { value: 'sales', label: 'Vendas' },
  { value: 'traffic', label: 'Trafego' },
  { value: 'awareness', label: 'Reconhecimento' },
  { value: 'mixed', label: 'Misto' },
];

const toneOptions: Array<{ value: ClientAiProfile['tone']; label: string }> = [
  { value: 'direct', label: 'Direto' },
  { value: 'consultative', label: 'Consultivo' },
  { value: 'premium', label: 'Premium' },
  { value: 'informal', label: 'Informal' },
];

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d', label: '7 dias' },
  { value: 'last_30d', label: '30 dias' },
  { value: 'last_60d', label: '60 dias' },
  { value: 'custom', label: 'Custom' },
];

export const ClientAiAnalystTab: React.FC<ClientAiAnalystTabProps> = ({ summary, reportRuns }) => {
  const [profile, setProfile] = useState<ClientAiProfile | null>(null);
  const [analyses, setAnalyses] = useState<ClientAiAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('last_30d');
  const [customStart, setCustomStart] = useState(() => calculatePeriod('last_30d').start);
  const [customEnd, setCustomEnd] = useState(() => calculatePeriod('last_30d').end);

  const [internalAiEnabled, setInternalAiEnabled] = useState(false);
  const [objective, setObjective] = useState<ClientAiProfile['objective']>('mixed');
  const [tone, setTone] = useState<ClientAiProfile['tone']>('consultative');
  const [targetCpl, setTargetCpl] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [businessNotes, setBusinessNotes] = useState('');

  const period = useMemo(() => {
    if (periodPreset === 'custom') return { start: customStart, end: customEnd };
    return calculatePeriod(periodPreset);
  }, [customEnd, customStart, periodPreset]);

  const latestAnalysis = analyses[0] || null;
  const latestRun = reportRuns[0] || null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getClientAiProfile(summary.client.id),
      listClientAiAnalyses(summary.client.id),
    ])
      .then(([nextProfile, nextAnalyses]) => {
        if (!active) return;
        setProfile(nextProfile);
        setAnalyses(nextAnalyses);
        applyProfile(nextProfile);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar IA Analista.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [summary.client.id]);

  const saveProfile = async (): Promise<ClientAiProfile> => {
    const saved = await upsertClientAiProfile({
      clientId: summary.client.id,
      objective,
      tone,
      businessRules: {
        targetCpl: parseOptionalNumber(targetCpl),
        monthlyBudget: parseOptionalNumber(monthlyBudget),
        notes: businessNotes.trim(),
      },
      importantMetrics: importantMetricsForObjective(objective),
      exposureLevel: 'normal',
      internalAiEnabled,
      briefingEnabled: internalAiEnabled,
    });
    setProfile(saved);
    applyProfile(saved);
    return saved;
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil de IA.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await saveProfile();
      await generateClientAiAnalysis({
        clientId: summary.client.id,
        periodStart: period.start,
        periodEnd: period.end,
      });
      const nextAnalyses = await listClientAiAnalyses(summary.client.id);
      setAnalyses(nextAnalyses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar analise de IA.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Panel>
        <p className="text-sm text-slate-500">Carregando IA Analista...</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg px-3 py-2 text-[11px]" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)' }}>
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}>
                <Brain size={20} weight="bold" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">IA Analista</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Analise interna para a agencia. Nada daqui entra no relatorio do cliente automaticamente.
                </p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={internalAiEnabled}
                onChange={(event) => setInternalAiEnabled(event.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
              />
              IA interna ativa
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mt-5">
            <div className="sm:col-span-2">
              <FieldLabel label="Objetivo" />
              <SegmentedControl
                options={objectiveOptions}
                value={objective}
                onChange={(value) => setObjective(value as ClientAiProfile['objective'])}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel label="Tom" />
              <SegmentedControl
                options={toneOptions}
                value={tone}
                onChange={(value) => setTone(value as ClientAiProfile['tone'])}
              />
            </div>
            <Field label="CPL alvo">
              <input value={targetCpl} onChange={(event) => setTargetCpl(event.target.value)} placeholder="Ex: 35" className={inputClass} />
            </Field>
            <Field label="Orcamento mensal">
              <input value={monthlyBudget} onChange={(event) => setMonthlyBudget(event.target.value)} placeholder="Ex: 5000" className={inputClass} />
            </Field>
            <label className="block sm:col-span-2">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Regras do negocio</span>
              <textarea
                value={businessNotes}
                onChange={(event) => setBusinessNotes(event.target.value)}
                rows={4}
                placeholder="Margem, sazonalidade, restricoes comerciais, produtos prioritarios..."
                className={`${inputClass} resize-none`}
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <p className="text-[11px] text-slate-600">
              Ultimo relatorio base: {latestRun ? `${formatDate(latestRun.periodStart)} ate ${formatDate(latestRun.periodEnd)}` : 'nenhum relatorio encontrado'}
            </p>
            <button
              onClick={handleSaveProfile}
              disabled={saving || generating}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded-lg disabled:opacity-60"
              style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              <CheckCircle size={13} weight="bold" />
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 mb-4">
            <Lightning size={16} weight="bold" className="text-indigo-300" />
            <h3 className="text-xs font-bold text-white">Gerar analise</h3>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div>
              <FieldLabel label="Periodo" />
              <SegmentedControl
                options={periodOptions}
                value={periodPreset}
                onChange={(value) => setPeriodPreset(value as PeriodPreset)}
              />
            </div>
            <Field label="Inicio">
              <input type="date" value={period.start} disabled={periodPreset !== 'custom'} onChange={(event) => setCustomStart(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Fim">
              <input type="date" value={period.end} disabled={periodPreset !== 'custom'} onChange={(event) => setCustomEnd(event.target.value)} className={inputClass} />
            </Field>
            <button
              onClick={handleGenerate}
              disabled={generating || saving}
              className="self-end inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded-lg disabled:opacity-60"
              style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              <Brain size={13} weight="bold" />
              {generating ? 'Gerando...' : 'Gerar analise'}
            </button>
          </div>

          <div className="mt-4 rounded-lg px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start gap-2">
              <WarningCircle size={15} weight="bold" className="text-amber-300 mt-0.5" />
              <p className="text-[11px] leading-5 text-slate-500">
                Recomendacoes sao marcadas como uso interno da agencia. Para o cliente, continue usando o relatorio deterministico atual.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-white">Ultima analise</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {latestAnalysis ? `${formatDate(latestAnalysis.periodStart)} ate ${formatDate(latestAnalysis.periodEnd)} · Risco ${riskLabel(latestAnalysis.riskLevel)}` : 'Nenhuma analise gerada ainda.'}
            </p>
          </div>
          {profile && (
            <span className="self-start rounded-md px-2.5 py-1 text-[10px] font-bold" style={{ color: profile.internalAiEnabled ? '#86efac' : '#fbbf24', background: 'rgba(255,255,255,0.04)' }}>
              {profile.internalAiEnabled ? 'IA ativa' : 'IA pausada'}
            </span>
          )}
        </div>

        {latestAnalysis ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <AnalysisBlock icon={<ClipboardText size={16} weight="bold" />} title="Resumo Executivo">
              <p className="text-sm leading-6 text-slate-300">{latestAnalysis.summary}</p>
            </AnalysisBlock>
            <AnalysisBlock icon={<WarningCircle size={16} weight="bold" />} title="Diagnostico">
              <List items={[...latestAnalysis.positives, ...latestAnalysis.attentionPoints, ...latestAnalysis.internalAlerts]} empty="Sem diagnostico detalhado." />
            </AnalysisBlock>
            <AnalysisBlock icon={<Lightning size={16} weight="bold" />} title="Plano Sugerido">
              <List
                items={latestAnalysis.recommendations.map((item) => {
                  if (item && typeof item === 'object' && !Array.isArray(item)) {
                    return `${String((item as Record<string, unknown>).action || (item as Record<string, unknown>).text || 'Acao sugerida')} · uso interno da agencia`;
                  }
                  return String(item);
                })}
                empty="Sem recomendacoes."
              />
            </AnalysisBlock>
            <AnalysisBlock icon={<ChatCircleText size={16} weight="bold" />} title="Ajuda de Comunicacao">
              <List items={latestAnalysis.talkingPoints} empty="Sem pontos de conversa." />
            </AnalysisBlock>
          </div>
        ) : (
          <div className="rounded-lg px-4 py-5 text-sm text-slate-500" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            Gere uma analise para criar o primeiro diagnostico interno deste cliente.
          </div>
        )}
      </Panel>
    </div>
  );

  function applyProfile(nextProfile: ClientAiProfile | null) {
    setInternalAiEnabled(Boolean(nextProfile?.internalAiEnabled));
    setObjective(nextProfile?.objective || 'mixed');
    setTone(nextProfile?.tone || 'consultative');
    const rules = nextProfile?.businessRules || {};
    setTargetCpl(readStringNumber(rules.targetCpl));
    setMonthlyBudget(readStringNumber(rules.monthlyBudget));
    setBusinessNotes(typeof rules.notes === 'string' ? rules.notes : '');
  }
};

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </section>
  );
}

function AnalysisBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 text-xs font-bold text-white mb-3">
        <span className="text-indigo-300">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      {children}
    </label>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">{label}</span>;
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-auto rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className="shrink-0 rounded-md px-3 py-1.5 text-[11px] font-bold transition-colors"
          style={value === option.value
            ? { color: '#c7d2fe', background: 'rgba(99,102,241,0.18)' }
            : { color: '#64748b' }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function List({ items, empty }: { items: unknown[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="text-sm leading-6 text-slate-300">
          {typeof item === 'string' ? item : JSON.stringify(item)}
        </li>
      ))}
    </ul>
  );
}

const inputClass = 'w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-400/50 disabled:opacity-50';

function calculatePeriod(preset: PeriodPreset): { start: string; end: string } {
  const today = new Date();
  const end = new Date(today);
  if (preset === 'yesterday') {
    end.setDate(today.getDate() - 1);
    return { start: toIsoDate(end), end: toIsoDate(end) };
  }
  const start = new Date(today);
  const days = preset === 'last_7d' ? 6 : preset === 'last_60d' ? 59 : 29;
  start.setDate(today.getDate() - days);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function readStringNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function importantMetricsForObjective(objective: ClientAiProfile['objective']): string[] {
  if (objective === 'sales') return ['spend', 'conversions', 'roas', 'costPerConversion'];
  if (objective === 'leads') return ['spend', 'conversions', 'costPerConversion', 'ctr'];
  if (objective === 'traffic') return ['spend', 'clicks', 'ctr', 'cpc'];
  if (objective === 'awareness') return ['spend', 'impressions', 'cpm', 'reach'];
  return ['spend', 'clicks', 'ctr', 'conversions'];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function riskLabel(value: ClientAiAnalysis['riskLevel']): string {
  if (value === 'low') return 'baixo';
  if (value === 'attention') return 'em atencao';
  if (value === 'critical') return 'critico';
  return 'normal';
}
