import React, { useMemo, useState } from 'react';
import { ChartLineUp, FacebookLogo, FileText, LinkSimple, MagnifyingGlass } from '@phosphor-icons/react';
import type { AvailableAccount } from '../services/clientWorkspaceTypes';

type PlatformFilter = 'all' | 'meta' | 'google';

interface AdAccountsInventoryViewProps {
  accounts: AvailableAccount[];
  onOpenLinkedClient: (clientId: string) => void;
  onPreviewAccount: (account: AvailableAccount) => void;
  onViewCharts: (account: AvailableAccount) => void;
}

export const AdAccountsInventoryView: React.FC<AdAccountsInventoryViewProps> = ({
  accounts,
  onOpenLinkedClient,
  onPreviewAccount,
  onViewCharts,
}) => {
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const filtered = useMemo(
    () => accounts.filter((account) => platform === 'all' || account.platform === platform),
    [accounts, platform],
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Contas de Anúncio</h1>
          <p className="text-[11px] mt-1" style={{ color: '#475569' }}>
            Inventário de contas importadas e vínculo com clientes.
          </p>
        </div>
        <PlatformTabs value={platform} onChange={setPlatform} />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <div className="rounded-xl p-5 text-sm text-slate-500" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            Nenhuma conta encontrada para este filtro.
          </div>
        )}
        {filtered.map((account) => (
          <div
            key={`${account.platform}-${account.id}`}
            className="rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3"
            style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 sm:w-24">
              {account.platform === 'meta' ? <FacebookLogo size={15} weight="fill" color="#93c5fd" /> : <MagnifyingGlass size={15} weight="bold" color="#86efac" />}
              <span className="text-[10px] font-bold uppercase" style={{ color: account.platform === 'meta' ? '#93c5fd' : '#86efac' }}>
                {account.platform}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-100 truncate">{account.name}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#475569', fontFamily: 'monospace' }}>
                {account.externalAccountId}
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md self-start sm:self-auto" style={{ color: statusColor(account.status), background: 'rgba(255,255,255,0.04)' }}>
              {account.status || 'unknown'}
            </span>
            {account.linkedClientId ? (
              <button
                onClick={() => onOpenLinkedClient(account.linkedClientId as string)}
                className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg"
                style={{ color: '#c4b5fd', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.22)' }}
              >
                <LinkSimple size={12} weight="bold" />
                {account.linkedClientName || 'Cliente'}
              </button>
            ) : (
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg self-start sm:self-auto" style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                Sem cliente
              </span>
            )}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                onClick={() => onPreviewAccount(account)}
                className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg"
                style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.24)' }}
              >
                <FileText size={12} weight="bold" />
                Simular
              </button>
              <button
                onClick={() => onViewCharts(account)}
                className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg"
                style={{ color: '#93c5fd', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)' }}
              >
                <ChartLineUp size={12} weight="bold" />
                Gráficos
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function PlatformTabs({ value, onChange }: { value: PlatformFilter; onChange: (value: PlatformFilter) => void }) {
  return (
    <div className="flex gap-1.5 self-start sm:self-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 4 }}>
      {(['all', 'meta', 'google'] as const).map((id) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all"
          style={value === id ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: '#64748b' }}
        >
          {id === 'all' ? 'Todas' : id === 'meta' ? 'Meta' : 'Google'}
        </button>
      ))}
    </div>
  );
}

function statusColor(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('active') || normalized.includes('enabled')) return '#86efac';
  if (normalized.includes('paused')) return '#93c5fd';
  if (normalized.includes('error') || normalized.includes('disabled')) return '#fca5a5';
  return '#cbd5e1';
}
