import React, { useEffect, useState } from 'react';
import { ArrowLeft, CaretDown, Clock, Gear, PaperPlaneTilt, Robot } from '@phosphor-icons/react';
import type {
  AvailableAccount,
  ClientDeliveryFrequency,
  ClientPortal,
  ClientReportMode,
  ClientReportPeriod,
  ClientReportRun,
  ClientWorkspaceSummary,
} from '../services/clientWorkspaceTypes';
import type { ClientReportSettingsInput } from '../services/clientWorkspaceApi';
import { FullAnalysisTab, AnalysisTab } from './FullAnalysisTab';
import { LinkedAccountsTab } from './LinkedAccountsTab';
import { ClientPortalSaveInput, ClientPortalTab } from './ClientPortalTab';
import { ClientAiAnalystTab } from './ClientAiAnalystTab';

type ClientTab = 'summary' | 'executive' | 'analysis' | 'ai' | 'accounts' | 'automation' | 'portal' | 'settings';

interface ClientDetailViewProps {
  summary: ClientWorkspaceSummary;
  portal: ClientPortal | null;
  reportRuns: ClientReportRun[];
  availableAccounts: AvailableAccount[];
  onBack: () => void;
  onLinkAccount: (account: AvailableAccount) => void;
  onUnlinkAccount: (linkId: string) => void;
  onSaveReportSettings: (clientId: string, input: ClientReportSettingsInput) => Promise<void>;
  onSaveClientPortal: (clientId: string, input: ClientPortalSaveInput) => Promise<void>;
}

const tabs: Array<{ id: ClientTab; label: string }> = [
  { id: 'summary', label: 'Resumo' },
  { id: 'executive', label: 'Relatório Executivo' },
  { id: 'analysis', label: 'Análise Completa' },
  { id: 'ai', label: 'IA Analista' },
  { id: 'accounts', label: 'Contas Vinculadas' },
  { id: 'automation', label: 'Automações' },
  { id: 'portal', label: 'Portal do Cliente' },
  { id: 'settings', label: 'Configurações' },
];

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  summary,
  portal,
  reportRuns,
  availableAccounts,
  onBack,
  onLinkAccount,
  onUnlinkAccount,
  onSaveReportSettings,
  onSaveClientPortal,
}) => {
  const [tab, setTab] = useState<ClientTab>('summary');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('overview');

  const openAnalysisTab = (nextTab: AnalysisTab) => {
    setAnalysisTab(nextTab);
    setTab('analysis');
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft size={13} weight="bold" />
        Voltar
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight truncate">{summary.client.name}</h1>
          <p className="text-[11px] mt-1" style={{ color: '#475569' }}>
            {summary.accountCount} contas vinculadas · Próximo envio: {summary.nextSendLabel}
          </p>
        </div>
        <button
          onClick={() => openAnalysisTab('simulation')}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg"
          style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <PaperPlaneTilt size={12} weight="bold" />
          Gerar relatório
        </button>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 4 }}>
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className="px-3 py-1.5 text-[11px] font-semibold rounded-md whitespace-nowrap"
            style={tab === item.id ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: '#64748b' }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <SummaryPanel summary={summary} />}
      {tab === 'executive' && <ExecutivePanel summary={summary} onPreviewReport={() => openAnalysisTab('simulation')} onOpenCharts={() => openAnalysisTab('charts')} />}
      {tab === 'analysis' && <FullAnalysisTab summary={summary} initialTab={analysisTab} />}
      {tab === 'ai' && <ClientAiAnalystTab summary={summary} reportRuns={reportRuns} />}
      {tab === 'accounts' && <LinkedAccountsTab summary={summary} availableAccounts={availableAccounts} onLinkAccount={onLinkAccount} onUnlinkAccount={onUnlinkAccount} />}
      {tab === 'automation' && <AutomationPanel summary={summary} onSave={onSaveReportSettings} />}
      {tab === 'portal' && <ClientPortalTab summary={summary} portal={portal} onSave={(input) => onSaveClientPortal(summary.client.id, input)} />}
      {tab === 'settings' && <SettingsPanel summary={summary} />}
    </div>
  );
};

function SummaryPanel({ summary }: { summary: ClientWorkspaceSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Metric label="Contas" value={String(summary.accountCount)} />
      <Metric label="Meta" value={String(summary.metaAccountCount)} />
      <Metric label="Google" value={String(summary.googleAccountCount)} />
      <Metric label="Próximo envio" value={summary.nextSendLabel} />
      {summary.totals && (
        <>
          <Metric label="Investimento" value={formatCurrency(summary.totals.spend)} />
          <Metric label="Cliques" value={formatNumber(summary.totals.clicks)} />
          <Metric label="CTR" value={`${summary.totals.ctr.toFixed(2)}%`} />
          <Metric label="Conversões" value={formatNumber(summary.totals.conversions)} />
        </>
      )}
    </div>
  );
}

function ExecutivePanel({
  summary,
  onPreviewReport,
  onOpenCharts,
}: {
  summary: ClientWorkspaceSummary;
  onPreviewReport: () => void;
  onOpenCharts: () => void;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white">Relatório Executivo</h2>
          <p className="text-xs text-slate-500 mt-1">Resumo consolidado para {summary.client.name}.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenCharts}
            className="px-3 py-2 text-[11px] font-bold rounded-lg"
            style={{ color: '#93c5fd', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)' }}
          >
            Ver gráficos
          </button>
          <button
            onClick={onPreviewReport}
            className="px-3 py-2 text-[11px] font-bold rounded-lg"
            style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            Simular
          </button>
        </div>
      </div>
    </div>
  );
}

function AutomationPanel({
  summary,
  onSave,
}: {
  summary: ClientWorkspaceSummary;
  onSave: (clientId: string, input: ClientReportSettingsInput) => Promise<void>;
}) {
  const settings = summary.settings;
  const [deliveryEnabled, setDeliveryEnabled] = useState(Boolean(settings?.deliveryEnabled));
  const [deliveryFrequency, setDeliveryFrequency] = useState<ClientDeliveryFrequency>(settings?.deliveryFrequency || 'daily');
  const [weeklyDay, setWeeklyDay] = useState(settings?.weeklyDay ?? 1);
  const [monthlyDay, setMonthlyDay] = useState(settings?.monthlyDay ?? 1);
  const [sendTime, setSendTime] = useState(settings?.sendTime || '08:00');
  const [defaultPeriod, setDefaultPeriod] = useState<ClientReportPeriod>(settings?.defaultPeriod || 'last_30d');
  const [defaultReportMode, setDefaultReportMode] = useState<ClientReportMode>(settings?.defaultReportMode || 'executive');
  const [timezone, setTimezone] = useState(settings?.timezone || 'America/Sao_Paulo');
  const [deliveryTarget, setDeliveryTarget] = useState(settings?.deliveryTarget || summary.client.primaryWhatsapp || '');
  const [webhookUrl, setWebhookUrl] = useState(settings?.webhookUrl || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDeliveryEnabled(Boolean(settings?.deliveryEnabled));
    setDeliveryFrequency(settings?.deliveryFrequency || 'daily');
    setWeeklyDay(settings?.weeklyDay ?? 1);
    setMonthlyDay(settings?.monthlyDay ?? 1);
    setSendTime(settings?.sendTime || '08:00');
    setDefaultPeriod(settings?.defaultPeriod || 'last_30d');
    setDefaultReportMode(settings?.defaultReportMode || 'executive');
    setTimezone(settings?.timezone || 'America/Sao_Paulo');
    setDeliveryTarget(settings?.deliveryTarget || summary.client.primaryWhatsapp || '');
    setWebhookUrl(settings?.webhookUrl || '');
  }, [settings, summary.client.primaryWhatsapp]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(summary.client.id, {
        deliveryEnabled,
        deliveryFrequency,
        weeklyDay,
        monthlyDay,
        sendTime,
        defaultPeriod,
        defaultReportMode,
        timezone,
        deliveryTarget: deliveryTarget.trim() || null,
        webhookUrl: webhookUrl.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const enabled = deliveryEnabled;
  return (
    <div className="rounded-xl p-5 space-y-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: enabled ? '#a5b4fc' : '#64748b', background: 'rgba(255,255,255,0.04)' }}>
          <Robot size={20} weight="bold" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Automações</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure o envio recorrente do relatório consolidado deste cliente.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color: enabled ? '#86efac' : '#fbbf24', background: 'rgba(255,255,255,0.04)' }}>
            <Clock size={12} weight="bold" />
            {enabled ? automationLabel(deliveryFrequency, weeklyDay, monthlyDay, sendTime) : 'Automação desativada'}
          </div>
        </div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
          <input
            type="checkbox"
            checked={deliveryEnabled}
            onChange={(event) => setDeliveryEnabled(event.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
          />
          Envio automático
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Frequência">
          <StyledSelect value={deliveryFrequency} onChange={(event) => setDeliveryFrequency(event.target.value as ClientDeliveryFrequency)}>
            <option value="daily">Diário</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </StyledSelect>
        </Field>

        {deliveryFrequency === 'weekly' && (
          <Field label="Dia da semana">
            <StyledSelect value={weeklyDay} onChange={(event) => setWeeklyDay(Number(event.target.value))}>
              {weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </StyledSelect>
          </Field>
        )}

        {deliveryFrequency === 'monthly' && (
          <Field label="Dia do mês">
            <input type="number" min={1} max={31} value={monthlyDay} onChange={(event) => setMonthlyDay(clamp(Number(event.target.value), 1, 31))} className={inputClass} />
          </Field>
        )}

        <Field label="Horário">
          <input type="time" value={sendTime} onChange={(event) => setSendTime(event.target.value)} className={inputClass} />
        </Field>

        <Field label="Período padrão">
          <StyledSelect value={defaultPeriod} onChange={(event) => setDefaultPeriod(event.target.value as ClientReportPeriod)}>
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="last_7d">Últimos 7 dias</option>
            <option value="last_30d">Últimos 30 dias</option>
            <option value="last_60d">Últimos 60 dias</option>
            <option value="custom">Custom</option>
          </StyledSelect>
        </Field>

        <Field label="Tipo de relatório">
          <StyledSelect value={defaultReportMode} onChange={(event) => setDefaultReportMode(event.target.value as ClientReportMode)}>
            <option value="executive">Executivo</option>
            <option value="analytical">Analítico</option>
          </StyledSelect>
        </Field>

        <Field label="Fuso horário">
          <StyledSelect value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            <option value="America/Sao_Paulo">America/Sao_Paulo</option>
            <option value="America/Fortaleza">America/Fortaleza</option>
            <option value="America/Manaus">America/Manaus</option>
            <option value="America/Rio_Branco">America/Rio_Branco</option>
          </StyledSelect>
        </Field>

        <Field label="WhatsApp de destino">
          <input value={deliveryTarget} onChange={(event) => setDeliveryTarget(event.target.value)} placeholder="5511999999999" className={inputClass} />
        </Field>

        <Field label="Webhook opcional">
          <input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://..." className={inputClass} />
        </Field>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <p className="text-[11px] text-slate-600">
          A rotina mensal usa o dia configurado. Se um mês tiver menos dias, o agendador deve usar o último dia válido do mês.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-[11px] font-bold rounded-lg disabled:opacity-60"
          style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          {saving ? 'Salvando...' : 'Salvar automação'}
        </button>
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-400/50';
const selectClass = `${inputClass} appearance-none pr-9 cursor-pointer`;
const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function StyledSelect({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={selectClass}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          backgroundColor: 'rgba(2, 6, 23, 0.62)',
          backgroundImage: 'none',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        {children}
      </select>
      <CaretDown
        size={13}
        weight="bold"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

function automationLabel(frequency: string, weeklyDay: number, monthlyDay: number, sendTime: string): string {
  if (frequency === 'weekly') return `Semanal, ${weekDays[weeklyDay] || 'Segunda'} às ${sendTime}`;
  if (frequency === 'monthly') return `Mensal, dia ${monthlyDay} às ${sendTime}`;
  return `Diário às ${sendTime}`;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function SettingsPanel({ summary }: { summary: ClientWorkspaceSummary }) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}>
          <Gear size={20} weight="bold" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Configurações</h2>
          <p className="text-xs text-slate-500 mt-1">Status: {statusLabel(summary.client.status)} · Responsável: {summary.client.internalOwner || 'Não definido'}</p>
          {summary.client.primaryWhatsapp && (
            <p className="text-[11px] text-slate-600 mt-2">WhatsApp: {summary.client.primaryWhatsapp}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>{label}</div>
      <div className="text-xl font-bold text-white mt-2 truncate">{value}</div>
    </div>
  );
}

function statusLabel(status: ClientWorkspaceSummary['client']['status']): string {
  if (status === 'active') return 'Ativo';
  if (status === 'paused') return 'Pausado';
  return 'Arquivado';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}
