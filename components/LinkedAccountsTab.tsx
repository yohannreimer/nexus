import React from 'react';
import { FacebookLogo, LinkSimple, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { AvailableAccount, ClientWorkspaceSummary } from '../services/clientWorkspaceTypes';
import type { AdPlatform } from '../services/platformTypes';

interface LinkedAccountsTabProps {
  summary: ClientWorkspaceSummary;
  availableAccounts: AvailableAccount[];
  onLinkAccount: (account: AvailableAccount) => void;
  onUnlinkAccount: (linkId: string) => void;
}

export const LinkedAccountsTab: React.FC<LinkedAccountsTabProps> = ({
  summary,
  availableAccounts,
  onLinkAccount,
  onUnlinkAccount,
}) => {
  const unlinkedAccounts = availableAccounts.filter((account) => !account.linkedClientId);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white">Contas vinculadas</h2>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}>
            {summary.linkedAccounts.length}
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          {summary.linkedAccounts.length === 0 && (
            <div className="text-xs text-slate-500">Nenhuma conta vinculada a este cliente.</div>
          )}
          {summary.linkedAccounts.map((link) => (
            <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <AccountLabel platform={link.platform} name={link.account?.name || link.accountId} detail={link.account?.externalAccountId || link.accountId} />
              <button
                onClick={() => onUnlinkAccount(link.id)}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-md"
                style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)' }}
              >
                <X size={11} weight="bold" />
                Desvincular
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl p-4" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white">Contas disponíveis</h2>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.04)' }}>
            {unlinkedAccounts.length}
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          {unlinkedAccounts.length === 0 && (
            <div className="text-xs text-slate-500">Todas as contas importadas já estão vinculadas.</div>
          )}
          {unlinkedAccounts.map((account) => (
            <div key={`${account.platform}-${account.id}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <AccountLabel platform={account.platform} name={account.name} detail={account.externalAccountId} />
              <button
                onClick={() => onLinkAccount(account)}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-md"
                style={{ color: '#c7d2fe', background: 'rgba(99,102,241,0.12)' }}
              >
                <LinkSimple size={11} weight="bold" />
                Vincular
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

function AccountLabel({ platform, name, detail }: { platform: AdPlatform; name: string; detail: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {platform === 'meta' ? <FacebookLogo size={15} weight="fill" color="#93c5fd" /> : <MagnifyingGlass size={15} weight="bold" color="#86efac" />}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-100 truncate">{name}</div>
        <div className="text-[10px] truncate" style={{ color: '#475569', fontFamily: 'monospace' }}>{detail}</div>
      </div>
    </div>
  );
}
