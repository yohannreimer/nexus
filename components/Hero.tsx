import React from 'react';
import { Facebook, Shield, TrendingUp, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface HeroProps {
  onConnect: () => void;
}

const FEATURES = [
  {
    icon: Shield,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10 border-brand-500/20',
    title: 'Conexão Oficial',
    desc: 'Token OAuth de 60 dias via API oficial. Sem gambiarras, permissão apenas de leitura.',
  },
  {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Análise de ROI',
    desc: 'A IA identifica o que vende e o que gasta. Alertas automáticos de ROAS baixo.',
  },
  {
    icon: Zap,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'IA Humanizada',
    desc: 'Relatórios em linguagem natural com emojis. Seu cliente vai achar que foi você.',
  },
];

export const Hero: React.FC<HeroProps> = ({ onConnect }) => {
  return (
    <div className="relative min-h-screen bg-[#020617] flex flex-col justify-center overflow-hidden">

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-brand-500/8 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full bg-violet-500/6 blur-3xl" />
        <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/6 blur-3xl" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">

        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-300">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            <Sparkles className="w-3 h-3" />
            Powered by Gemini 2.0 · Novo
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.05]">
            Seus relatórios de tráfego,{' '}
            <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-violet-400 to-indigo-400">
              no piloto automático.
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Elimine o trabalho manual. Conecte o Facebook Ads e deixe nossa IA enviar
            análises executivas diárias via WhatsApp para cada cliente da sua agência.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
          <button
            onClick={onConnect}
            className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-base transition-all shadow-2xl shadow-[#1877F2]/25 hover:-translate-y-0.5 hover:shadow-[#1877F2]/35"
          >
            <Facebook className="w-5 h-5" />
            Começar Gratuitamente
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/15 text-slate-300 font-semibold text-base transition-all backdrop-blur-sm">
            Ver Demonstração
          </button>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap justify-center gap-6 mb-20 text-center">
          {[
            { value: '2 min', label: 'para configurar' },
            { value: '60 dias', label: 'token OAuth' },
            { value: '100%', label: 'automático' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-2xl font-extrabold font-mono text-white">{value}</span>
              <span className="text-xs text-slate-500 mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div
              key={title}
              className="relative group rounded-2xl border border-white/6 bg-white/3 backdrop-blur-sm p-6 hover:bg-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${bg} group-hover:scale-105 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
