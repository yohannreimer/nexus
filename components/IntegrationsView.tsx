import React from 'react';
import { CheckCircle, FacebookLogo, MagnifyingGlass, Plugs, WarningCircle } from '@phosphor-icons/react';

interface IntegrationsViewProps {
  metaConnected: boolean;
  googleConnected: boolean;
  onConnectMeta: () => void;
  onConnectGoogle: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  metaConnected,
  googleConnected,
  onConnectMeta,
  onConnectGoogle,
}) => {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Integrações</h1>
          <p className="text-[11px] mt-1" style={{ color: '#475569' }}>
            Conecte plataformas para importar contas, campanhas e métricas.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#334155' }}>
          <Plugs size={15} />
          OAuth oficial
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <IntegrationCard
          title="Meta Ads"
          description="Facebook, Instagram, campanhas de leads e mensagens."
          connected={metaConnected}
          accent="#60a5fa"
          icon={<FacebookLogo weight="fill" size={26} color="#60a5fa" />}
          onConnect={onConnectMeta}
        />
        <IntegrationCard
          title="Google Ads"
          description="Search, Performance Max, YouTube e Display."
          connected={googleConnected}
          accent="#86efac"
          icon={<MagnifyingGlass weight="bold" size={26} color="#86efac" />}
          onConnect={onConnectGoogle}
        />
      </div>
    </div>
  );
};

function IntegrationCard(props: {
  title: string;
  description: string;
  connected: boolean;
  accent: string;
  icon: React.ReactNode;
  onConnect: () => void;
}) {
  return (
    <section className="rounded-xl p-5 relative overflow-hidden" style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, ${props.accent}, transparent 70%)` }} />
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl flex items-center justify-center" style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.04)' }}>
          {props.icon}
        </div>
        <StatusBadge connected={props.connected} />
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-bold text-white">{props.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{props.description}</p>
      </div>

      <button
        onClick={props.onConnect}
        className="mt-5 px-3 py-2 text-[11px] font-bold rounded-lg transition-all"
        style={{
          color: props.connected ? '#cbd5e1' : '#c7d2fe',
          background: props.connected ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.14)',
          border: props.connected ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(99,102,241,0.25)',
        }}
      >
        {props.connected ? 'Reconectar' : 'Conectar'}
      </button>
    </section>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md"
      style={{
        color: connected ? '#86efac' : '#fbbf24',
        background: connected ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
        border: connected ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(245,158,11,0.18)',
      }}
    >
      {connected ? <CheckCircle size={12} weight="fill" /> : <WarningCircle size={12} weight="fill" />}
      {connected ? 'Conectado' : 'Pendente'}
    </span>
  );
}
