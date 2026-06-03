import React from 'react';
import { Plus, Robot, UserCircle } from '@phosphor-icons/react';
import type { ClientWorkspaceSummary } from '../services/clientWorkspaceTypes';

interface ClientsViewProps {
  clients: ClientWorkspaceSummary[];
  onCreateClient: () => void;
  onOpenClient: (clientId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ clients, onCreateClient, onOpenClient }) => {
  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-xl p-7 text-center max-w-md" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-11 h-11 mx-auto rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>
            <UserCircle size={24} weight="fill" />
          </div>
          <h1 className="text-xl font-bold text-white">Crie seu primeiro cliente</h1>
          <p className="mt-2 text-sm text-slate-500">Agrupe contas Meta e Google para gerar relatórios unificados.</p>
          <button
            onClick={onCreateClient}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg"
            style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <Plus size={13} weight="bold" />
            Criar cliente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Clientes</h1>
          <p className="text-[11px] mt-1" style={{ color: '#475569' }}>Gerencie relatórios unificados por cliente.</p>
        </div>
        <button
          onClick={onCreateClient}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg"
          style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <Plus size={12} weight="bold" />
          Criar cliente
        </button>
      </div>

      <div className="grid gap-3">
        {clients.map((item) => (
          <button
            key={item.client.id}
            onClick={() => onOpenClient(item.client.id)}
            className="text-left rounded-xl p-4 transition-all"
            style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                    {item.client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{item.client.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>
                      {item.accountCount} contas · Meta {item.metaAccountCount} · Google {item.googleAccountCount}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color: automationColor(item), background: 'rgba(255,255,255,0.04)' }}>
                  <Robot size={12} weight="bold" />
                  {item.nextSendLabel}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color: healthColor(item.health), background: 'rgba(255,255,255,0.04)' }}>
                  {healthLabel(item.health)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

function healthLabel(health: ClientWorkspaceSummary['health']): string {
  if (health === 'ok') return 'Tudo certo';
  if (health === 'needs_accounts') return 'Sem contas';
  if (health === 'automation_off') return 'Automação off';
  return 'Atenção';
}

function healthColor(health: ClientWorkspaceSummary['health']): string {
  if (health === 'ok') return '#86efac';
  if (health === 'needs_accounts') return '#fbbf24';
  if (health === 'automation_off') return '#93c5fd';
  return '#fca5a5';
}

function automationColor(item: ClientWorkspaceSummary): string {
  return item.settings?.deliveryEnabled ? '#a5b4fc' : '#64748b';
}
