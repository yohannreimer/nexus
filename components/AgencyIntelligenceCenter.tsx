import React, { useMemo } from 'react';
import { ArrowRight, Brain, CheckCircle, Lightning, Pulse, WarningCircle } from '@phosphor-icons/react';
import type {
  AgencyAiBriefing,
  ClientAiAnalysis,
  ClientDailySnapshot,
  ClientReportRun,
  ClientWorkspaceSummary,
} from '../services/clientWorkspaceTypes';
import { evaluatePortfolioHealth, type PortfolioAlert, type PortfolioOpportunity } from '../services/portfolioHealth';

interface AgencyIntelligenceCenterProps {
  clients: ClientWorkspaceSummary[];
  runs: ClientReportRun[];
  analyses: ClientAiAnalysis[];
  briefings: AgencyAiBriefing[];
  dailySnapshots: ClientDailySnapshot[];
  onOpenClient: (clientId: string) => void;
  onOpenReports: () => void;
}

export const AgencyIntelligenceCenter: React.FC<AgencyIntelligenceCenterProps> = ({
  clients,
  runs,
  analyses,
  briefings,
  dailySnapshots,
  onOpenClient,
  onOpenReports,
}) => {
  const health = useMemo(() => evaluatePortfolioHealth({ clients, runs, analyses, dailySnapshots }), [analyses, clients, dailySnapshots, runs]);
  const latestBriefing = briefings[0] || null;
  const clientNameById = useMemo(
    () => new Map(clients.map((item) => [item.client.id, item.client.name])),
    [clients],
  );
  const totalClients = clients.length || 1;
  const healthyCount = health.summary.healthy;
  const attentionCount = health.summary.attention + health.summary.critical + health.summary.integration_broken;
  const latestSnapshotDate = dailySnapshots.reduce<string | null>((latest, item) => {
    if (!latest || item.date > latest) return item.date;
    return latest;
  }, null);
  const monitoredClients = new Set(dailySnapshots.map((item) => item.clientId)).size;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <Brain size={14} weight="bold" className="text-indigo-300" />
            Centro IA
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-2">Briefing da Manha</h1>
          <p className="text-[11px] text-slate-500 mt-1">
            {healthyCount} saudaveis · {attentionCount} precisam de atencao · {health.opportunities.length} oportunidades · {monitoredClients} com memoria diaria
          </p>
        </div>
        <button
          onClick={onOpenReports}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg"
          style={{ color: '#93c5fd', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)' }}
        >
          Ver relatorios
          <ArrowRight size={13} weight="bold" />
        </button>
      </div>

      <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}>
            <Lightning size={19} weight="bold" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white">Briefing da Manha</h2>
            <p className="text-sm leading-7 text-slate-300 mt-3 whitespace-pre-line">
              {latestBriefing?.generatedText || buildDeterministicBriefing(health.alerts.length, health.opportunities.length, clients.length)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <HealthMetric label="Saudaveis" value={health.summary.healthy} total={totalClients} tone="#86efac" />
        <HealthMetric label="Atencao" value={health.summary.attention} total={totalClients} tone="#fbbf24" />
        <HealthMetric label="Criticos" value={health.summary.critical} total={totalClients} tone="#fca5a5" />
        <HealthMetric label="Sem dados" value={health.summary.no_data} total={totalClients} tone="#93c5fd" />
        <HealthMetric label="Integracao" value={health.summary.integration_broken} total={totalClients} tone="#fb7185" />
        <HealthMetric label="Automacao off" value={health.summary.automation_off} total={totalClients} tone="#c084fc" />
      </section>

      <section className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Monitoramento diario</div>
            <div className="text-sm font-bold text-white mt-1">
              {monitoredClients} de {clients.length} clientes com leitura recente
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <MiniStat label="Snapshots" value={String(dailySnapshots.length)} />
            <MiniStat label="Ultima leitura" value={latestSnapshotDate ? formatDate(latestSnapshotDate) : 'Sem dados'} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Header icon={<WarningCircle size={16} weight="bold" />} title="Alertas Internos" />
          <div className="space-y-2 mt-4">
            {health.alerts.length === 0 && <EmptyLine text="Nenhum alerta interno agora." />}
            {health.alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                clientName={clientNameById.get(alert.clientId) || 'Cliente removido'}
                onOpenClient={onOpenClient}
                onOpenReports={onOpenReports}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Header icon={<Pulse size={16} weight="bold" />} title="Oportunidades" />
          <div className="space-y-2 mt-4">
            {health.opportunities.length === 0 && <EmptyLine text="Nenhuma oportunidade forte detectada ainda." />}
            {health.opportunities.map((opportunity) => (
              <OpportunityRow
                key={opportunity.id}
                opportunity={opportunity}
                clientName={clientNameById.get(opportunity.clientId) || 'Cliente removido'}
                onOpenClient={onOpenClient}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl p-5" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Header icon={<CheckCircle size={16} weight="bold" />} title="Fila de Acoes" />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 mt-4">
          {health.actionQueue.length === 0 && <EmptyLine text="Fila limpa por enquanto." />}
          {health.actionQueue.slice(0, 9).map((alert) => (
            <button
              key={alert.id}
              onClick={() => alert.action === 'resend_report' ? onOpenReports() : onOpenClient(alert.clientId)}
              className="text-left rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.05]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-xs font-bold text-white">{clientNameById.get(alert.clientId) || 'Cliente removido'}</div>
              <div className="text-[11px] text-slate-500 mt-1">{alert.title}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

function HealthMetric({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const percentage = Math.round((value / total) * 100);
  return (
    <div className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{label}</div>
      <div className="text-2xl font-bold text-white mt-2">{value}</div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-900 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: tone }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2 min-w-[120px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{label}</div>
      <div className="text-xs font-bold text-slate-200 mt-1">{value}</div>
    </div>
  );
}

function Header({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-indigo-300">{icon}</span>
      <h2 className="text-sm font-bold text-white">{title}</h2>
    </div>
  );
}

function AlertRow({
  alert,
  clientName,
  onOpenClient,
  onOpenReports,
}: {
  alert: PortfolioAlert;
  clientName: string;
  onOpenClient: (clientId: string) => void;
  onOpenReports: () => void;
}) {
  const tone = alert.severity === 'critical' ? '#fca5a5' : alert.severity === 'warning' ? '#fbbf24' : '#93c5fd';
  return (
    <button
      onClick={() => alert.action === 'resend_report' ? onOpenReports() : onOpenClient(alert.clientId)}
      className="w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.05]"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate">{clientName}</div>
          <div className="text-[11px] font-bold mt-1" style={{ color: tone }}>{alert.title}</div>
          <div className="text-[11px] text-slate-500 mt-1">{alert.description}</div>
        </div>
        <ArrowRight size={13} weight="bold" className="text-slate-600 shrink-0 mt-1" />
      </div>
    </button>
  );
}

function OpportunityRow({
  opportunity,
  clientName,
  onOpenClient,
}: {
  opportunity: PortfolioOpportunity;
  clientName: string;
  onOpenClient: (clientId: string) => void;
}) {
  return (
    <button
      onClick={() => onOpenClient(opportunity.clientId)}
      className="w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.05]"
      style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}
    >
      <div className="text-xs font-bold text-white">{clientName}</div>
      <div className="text-[11px] font-bold text-emerald-300 mt-1">{opportunity.title}</div>
      <div className="text-[11px] text-slate-500 mt-1">{opportunity.description}</div>
    </button>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function buildDeterministicBriefing(alertCount: number, opportunityCount: number, clientCount: number): string {
  if (clientCount === 0) return 'Cadastre clientes e vincule contas para montar o briefing automatico da carteira.';
  if (alertCount === 0 && opportunityCount === 0) return `Carteira com ${clientCount} clientes sem alertas criticos neste momento.`;
  return `Hoje a carteira tem ${alertCount} alertas internos e ${opportunityCount} oportunidades detectadas. Priorize a fila de acoes abaixo antes de revisar novos relatorios.`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
