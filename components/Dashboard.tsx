import React, { useState } from 'react';
import { AdAccount } from '../types';
import {
  PencilSimple, ChartBar, Play, Lightning, FacebookLogo,
  CheckCircle, Phone, Robot, PaperPlaneTilt, HourglassHigh, MagnifyingGlass
} from '@phosphor-icons/react';
import { ActivateClientModal } from './ActivateClientModal';
import { EditClientModal } from './EditClientModal';
import { saveClient, isSupabaseConfigured } from '../services/supabase';

interface DashboardProps {
  connectedToFB: boolean;
  accounts: AdAccount[];
  onConnectFacebook: () => void;
  onConnectGoogle?: () => void;
  onConfigureAccount: (account: AdAccount) => void;
  onPreviewReport: (account: AdAccount) => void;
  onViewCharts?: (account: AdAccount) => void;
}

const ACCENT_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#a855f7'];
const MOCK_SPEND = ['R$1.840', 'R$960', '', '', ''];
const MOCK_CTR = ['1,43%', '1,90%', '', '', ''];
const MOCK_CHANGE = ['+12%', '+5%', '', '', ''];

function Sparkline({ color = '#6366f1', seed = 0 }: { color?: string; seed?: number }) {
  const pts = [
    [18, 22, 25, 14, 17, 8, 11],
    [20, 15, 17, 9, 11, 5, 7],
    [12, 18, 14, 20, 16, 22, 18],
    [8, 11, 9, 14, 12, 17, 15],
    [22, 18, 20, 15, 17, 12, 14],
  ][seed % 5];
  const w = 72, h = 32;
  const poly = pts.map((y, i) => `${(i / (pts.length - 1)) * w},${y}`).join(' ');
  const fill = `${poly} ${w},${h} 0,${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sg${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline points={fill} fill={`url(#sg${seed})`} stroke="none" />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatSendTime(raw: string | undefined): string {
  if (!raw) return '—';
  if (raw.includes('T')) {
    try {
      return new Date(raw).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  }
  return raw;
}

export const Dashboard: React.FC<DashboardProps> = ({
  connectedToFB,
  accounts,
  onConnectFacebook,
  onConnectGoogle,
  onPreviewReport,
  onViewCharts,
}) => {
  const [filter, setFilter] = useState<'all' | 'configured' | 'pending'>('all');
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);

  const handleEditClient = (account: AdAccount) => { setSelectedAccount(account); setEditModalOpen(true); };
  const handleActivateClient = (account: AdAccount) => { setSelectedAccount(account); setActivateModalOpen(true); };

  const handleSaveActivation = async (accountId: string, whatsapp: string, sendTime: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (isSupabaseConfigured()) {
      const result = await saveClient({ ad_account_id: accountId, name: account?.name || accountId, whatsapp_number: whatsapp, report_time: sendTime, report_period: 'yesterday', is_active: true });
      if (!result.data) alert(`Erro ao salvar: ${result.error}`);
    }
    const idx = accounts.findIndex(a => a.id === accountId);
    if (idx >= 0) accounts[idx].isConfigured = true;
  };

  const filteredAccounts = accounts.filter(acc => {
    if (filter === 'configured') return acc.isConfigured;
    if (filter === 'pending') return !acc.isConfigured;
    return true;
  });

  const totalActive = accounts.filter(a => a.isConfigured).length;
  const totalPending = accounts.filter(a => !a.isConfigured && a.accountStatus === 1).length;

  const activeAccounts = filteredAccounts.filter(a => a.isConfigured && a.accountStatus === 1);
  const pendingAccounts = filteredAccounts.filter(a => !a.isConfigured && a.accountStatus === 1);
  const blockedAccounts = filteredAccounts.filter(a => a.accountStatus !== 1);

  if (!connectedToFB) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="relative w-full max-w-3xl">
          <div className="rounded-2xl p-8 overflow-hidden" style={{ background: '#08101e', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />
            <div className="mb-7 text-center">
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Conecte suas plataformas de mídia</h2>
              <p className="text-slate-400 leading-relaxed max-w-xl mx-auto text-sm">Importe contas, campanhas e métricas de Google Ads e Meta Ads para automatizar relatórios dos clientes.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button onClick={onConnectGoogle} className="group rounded-xl p-5 text-left transition-all" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', width: 48, height: 48 }}>
                    <MagnifyingGlass size={26} color="#22c55e" weight="bold" />
                  </div>
                  <CheckCircle size={18} color="#22c55e" weight="fill" />
                </div>
                <div className="mt-5 text-sm font-bold text-white">Google Ads</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">Search, Performance Max, YouTube e Display.</div>
                <div className="mt-5 text-xs font-semibold text-emerald-300">Conectar Google</div>
              </button>
              <button onClick={onConnectFacebook} className="group rounded-xl p-5 text-left transition-all" style={{ background: 'rgba(24,119,242,0.07)', border: '1px solid rgba(24,119,242,0.2)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl flex items-center justify-center" style={{ background: 'rgba(24,119,242,0.12)', width: 48, height: 48 }}>
                    <FacebookLogo weight="fill" size={26} color="#60a5fa" />
                  </div>
                  <CheckCircle size={18} color="#60a5fa" weight="fill" />
                </div>
                <div className="mt-5 text-sm font-bold text-white">Meta Ads</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">Facebook, Instagram, Leads e Mensagens.</div>
                <div className="mt-5 text-xs font-semibold text-blue-300">Conectar Meta</div>
              </button>
              <div className="hidden rounded-xl p-5 text-left" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="rounded-xl flex items-center justify-center" style={{ background: 'rgba(24,119,242,0.08)', width: 48, height: 48 }}>
                  <FacebookLogo weight="fill" size={26} color="#334155" />
                </div>
                <div className="mt-5 text-sm font-bold text-slate-500">Meta Ads</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-600">Integração em standby enquanto validamos o fluxo Google.</div>
                <div className="mt-5 text-xs font-semibold text-slate-600">Pausado</div>
              </div>
            </div>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-5 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><CheckCircle size={13} color="#22c55e" weight="fill" />OAuth oficial</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={13} color="#22c55e" weight="fill" />Leitura somente · Seguro</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Portfolio de Clientes</h1>
          <p className="text-[11px] mt-1" style={{ color: '#334155' }}>Gerencie a automação de relatórios das suas {accounts.length} contas.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex gap-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 4 }}>
            {([['all','Todas'],['configured','Ativas'],['pending','Pendentes']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} className="px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all"
                style={filter === id ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' } : { color: '#334155', border: '1px solid transparent' }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={onConnectFacebook} className="px-3 py-2 text-[11px] font-semibold rounded-lg transition-all inline-flex items-center gap-1.5" style={{ color: '#93c5fd', border: '1px solid rgba(24,119,242,0.2)', background: 'rgba(24,119,242,0.07)' }}>
              <FacebookLogo size={13} weight="fill" />
              Meta
            </button>
            <button onClick={onConnectGoogle} className="px-3 py-2 text-[11px] font-semibold rounded-lg transition-all inline-flex items-center gap-1.5" style={{ color: '#86efac', border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.07)' }}>
              <MagnifyingGlass size={13} weight="bold" />
              Google
            </button>
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {[
          { label: 'Total de Contas', value: accounts.length, color: '#f8fafc', sub: 'Gerenciadas pela agência', icon: <ChartBar size={18} /> },
          { label: 'Automações Ativas', value: totalActive, color: '#818cf8', sub: `${totalActive > 0 ? '↑ ativo' : 'Nenhuma ativa'}`, icon: <Robot size={18} /> },
          { label: 'Relatórios Enviados', value: 48, color: '#818cf8', sub: 'Últimos 30 dias', icon: <PaperPlaneTilt size={18} /> },
          { label: 'Pendentes', value: totalPending, color: '#f59e0b', sub: 'Aguardando configuração', icon: <HourglassHigh size={18} /> },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4 relative overflow-hidden" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent)' }} />
            <div className="absolute right-3 top-3 opacity-10" style={{ color: '#94a3b8' }}>{stat.icon}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#334155' }}>{stat.label}</div>
            <div className="text-2xl font-bold leading-none" style={{ color: stat.color, fontFamily: 'monospace', letterSpacing: -1 }}>{stat.value}</div>
            <div className="text-[10px] mt-1.5" style={{ color: '#475569' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Active clients */}
      {activeAccounts.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#334155' }}>Clientes Ativos</span>
          </div>
          <div className="flex flex-col gap-2">
            {activeAccounts.map((account, idx) => {
              const realIdx = accounts.indexOf(account);
              const color = ACCENT_COLORS[realIdx % ACCENT_COLORS.length];
              const nextTime = formatSendTime(account.nextReportDate || account.lastReportSent);
              const spend = MOCK_SPEND[realIdx] || '—';
              const ctr = MOCK_CTR[realIdx] || '—';
              const change = MOCK_CHANGE[realIdx] || '';

              return (
                <div
                  key={account.id}
                  className="rounded-xl flex items-center gap-4 px-4 py-3 relative overflow-hidden transition-all cursor-pointer"
                  style={{ background: '#0d1220', border: '1px solid rgba(99,102,241,0.18)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.35)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.18)'}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, ${color}, transparent 60%)` }} />

                  {/* Status dot */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
                    {account.name.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-100 truncate">{account.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: '#334155', fontFamily: 'monospace' }}>{account.id}</span>
                      <span className="w-1 h-1 rounded-full" style={{ background: '#1e2535', flexShrink: 0 }} />
                      <span className="text-[10px]" style={{ color: '#334155' }}>Próx. envio: {nextTime}</span>
                      {account.whatsappTarget && (
                        <>
                          <span className="w-1 h-1 rounded-full" style={{ background: '#1e2535', flexShrink: 0 }} />
                          <Phone size={10} style={{ color: '#6366f1', flexShrink: 0 }} />
                          <span className="text-[10px]" style={{ color: '#6366f1' }}>{account.whatsappTarget}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sparkline */}
                  <Sparkline color={color} seed={realIdx} />

                  {/* Metric */}
                  <div className="text-right shrink-0 min-w-[80px]">
                    <div className="text-sm font-bold text-slate-100" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: -0.5 }}>{spend}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: '#475569' }}>
                      {change && <span style={{ color: '#22c55e' }}>{change}</span>}
                      {change && ctr && ' · '}
                      {ctr && `CTR ${ctr}`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleEditClient(account); }}
                      className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onViewCharts?.(account); }}
                      className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                    >
                      Gráficos
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onPreviewReport(account); }}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', color: '#818cf8' }}
                    >
                      Simular
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending clients */}
      {pendingAccounts.length > 0 && (
        <div className="mb-5">
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#334155' }}>Pendentes — Aguardando configuração</span>
          </div>
          <div className="flex flex-col gap-2">
            {pendingAccounts.map((account, idx) => {
              const realIdx = accounts.indexOf(account);
              const color = ACCENT_COLORS[realIdx % ACCENT_COLORS.length];
              return (
                <div
                  key={account.id}
                  className="rounded-xl flex items-center gap-4 px-4 py-3 relative overflow-hidden"
                  style={{ background: '#0a0d18', border: '1px solid rgba(255,255,255,0.04)', opacity: 0.7 }}
                >
                  {/* Status dot */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#f59e0b' }} />

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#1e2a3a', color: '#334155' }}>
                    {account.name.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: '#334155' }}>{account.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: '#1e2535' }}>Configure WhatsApp e campanhas para ativar</div>
                  </div>

                  {/* Activate button */}
                  <button
                    onClick={() => handleActivateClient(account)}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ml-auto shrink-0"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
                  >
                    <Lightning weight="fill" size={10} style={{ display: 'inline', marginRight: 4 }} />
                    Ativar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Blocked accounts */}
      {blockedAccounts.length > 0 && (
        <div>
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#334155' }}>Bloqueadas / Desativadas</span>
          </div>
          <div className="flex flex-col gap-2">
            {blockedAccounts.map(account => (
              <div key={account.id} className="rounded-xl flex items-center gap-4 px-4 py-3" style={{ background: '#0a0d18', border: '1px solid rgba(255,255,255,0.03)', opacity: 0.35 }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#1e2535' }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#141c2a', color: '#1e2a3a' }}>
                  {account.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: '#1e2535' }}>{account.name}</div>
                  <div className="text-[10px]" style={{ color: '#111827' }}>Conta inativa no Facebook</div>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: '#7f1d1d', border: '1px solid rgba(239,68,68,0.1)' }}>BLOQUEADA</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ActivateClientModal account={selectedAccount} isOpen={activateModalOpen} onClose={() => setActivateModalOpen(false)} onSave={handleSaveActivation} />
      <EditClientModal account={selectedAccount} isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} onSave={async () => {}} />
    </div>
  );
};
