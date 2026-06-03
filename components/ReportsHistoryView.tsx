import React, { useMemo, useState } from 'react';
import { ArrowClockwise, CheckCircle, Clock, LinkSimple, PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react';
import type { AgencyClient, ClientReportRun } from '../services/clientWorkspaceTypes';

interface ReportsHistoryViewProps {
  runs: ClientReportRun[];
  clients: AgencyClient[];
  onRetryRun: (runId: string) => Promise<void>;
  onRunNow: () => Promise<{
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
  }>;
}

export const ReportsHistoryView: React.FC<ReportsHistoryViewProps> = ({ runs, clients, onRetryRun, onRunNow }) => {
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [runningNow, setRunningNow] = useState(false);
  const [runNowResult, setRunNowResult] = useState<string | null>(null);

  const handleRetry = async (runId: string) => {
    setRetryingRunId(runId);
    setRetryError(null);
    try {
      await onRetryRun(runId);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Erro ao marcar relatório para reenvio.');
    } finally {
      setRetryingRunId(null);
    }
  };

  const handleRunNow = async () => {
    setRunningNow(true);
    setRetryError(null);
    setRunNowResult(null);
    try {
      const result = await onRunNow();
      setRunNowResult(`Processados: ${result.processed} · Enviados: ${result.sent} · Falhas: ${result.failed} · Ignorados: ${result.skipped}`);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Erro ao rodar relatórios agora.');
    } finally {
      setRunningNow(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Relatórios</h1>
          <p className="text-[11px] mt-1" style={{ color: '#475569' }}>Histórico de relatórios gerados e enviados.</p>
        </div>
        <button
          type="button"
          onClick={handleRunNow}
          disabled={runningNow}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg disabled:opacity-60"
          style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <ArrowClockwise size={13} weight="bold" className={runningNow ? 'animate-spin' : ''} />
          {runningNow ? 'Rodando...' : 'Rodar agora'}
        </button>
      </div>
      {retryError && (
        <div className="mb-3 rounded-lg px-3 py-2 text-[11px]" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)' }}>
          {retryError}
        </div>
      )}
      {runNowResult && (
        <div className="mb-3 rounded-lg px-3 py-2 text-[11px]" style={{ color: '#86efac', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.14)' }}>
          {runNowResult}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {runs.length === 0 && (
          <div className="rounded-xl p-5 text-sm text-slate-500" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            Nenhum relatório gerado ainda.
          </div>
        )}
        {runs.map((run) => (
          <div key={run.id} className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{clientById.get(run.clientId) || 'Cliente removido'}</div>
                <div className="text-[10px] mt-1" style={{ color: '#64748b' }}>
                  {formatDate(run.periodStart)} até {formatDate(run.periodEnd)} · {executionLabel(run.executionType)} · {modeLabel(run.reportMode)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  <MetaItem label="Criado" value={formatDateTime(run.createdAt)} />
                  <MetaItem label="Enviado" value={run.sentAt ? formatDateTime(run.sentAt) : '-'} />
                  <MetaItem label="Tentativas" value={String(run.attemptCount)} />
                  <MetaItem label="Avisos" value={String(run.warnings.length)} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.04)' }}>
                  {run.platformsIncluded.length ? run.platformsIncluded.join(' + ') : 'sem plataforma'}
                </span>
                <StatusBadge status={run.status} />
                {run.portalSnapshotUrl && (
                  <a
                    href={run.portalSnapshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md"
                    style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.18)' }}
                  >
                    <LinkSimple size={12} weight="bold" />
                    Snapshot
                  </a>
                )}
                {run.status === 'failed' && run.executionType === 'scheduled' && (
                  <button
                    type="button"
                    onClick={() => handleRetry(run.id)}
                    disabled={retryingRunId === run.id}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md transition-opacity disabled:opacity-50"
                    style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <ArrowClockwise size={12} weight="bold" className={retryingRunId === run.id ? 'animate-spin' : ''} />
                    {retryingRunId === run.id ? 'Marcando' : 'Repetir'}
                  </button>
                )}
              </div>
            </div>
            {run.errorMessage && (
              <div className="mt-3 text-[11px] rounded-lg px-3 py-2" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.06)' }}>
                {run.errorMessage}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#475569' }}>{label}</div>
      <div className="text-[10px] mt-1 truncate" style={{ color: '#cbd5e1' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ClientReportRun['status'] }) {
  const icon = status === 'failed'
    ? <WarningCircle size={12} weight="fill" />
    : status === 'sent' || status === 'sent_with_warnings'
      ? <PaperPlaneTilt size={12} weight="fill" />
      : status === 'pending' || status === 'processing'
        ? <Clock size={12} weight="fill" />
        : <CheckCircle size={12} weight="fill" />;
  const tone = statusTone(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md"
      style={{
        color: tone,
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      {icon}
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: ClientReportRun['status']): string {
  if (status === 'pending') return 'Pendente';
  if (status === 'processing') return 'Processando';
  if (status === 'generated') return 'Gerado';
  if (status === 'sent') return 'Enviado';
  if (status === 'sent_with_warnings') return 'Enviado com avisos';
  if (status === 'failed') return 'Falhou';
  return status;
}

function statusTone(status: ClientReportRun['status']): string {
  if (status === 'failed') return '#fca5a5';
  if (status === 'sent' || status === 'sent_with_warnings') return '#86efac';
  if (status === 'pending' || status === 'processing') return '#fbbf24';
  return '#93c5fd';
}

function executionLabel(type: ClientReportRun['executionType']): string {
  return type === 'scheduled' ? 'Agendado' : 'Manual';
}

function modeLabel(mode: ClientReportRun['reportMode']): string {
  return mode === 'executive' ? 'Executivo' : 'Analítico';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
