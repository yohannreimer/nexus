import React, { useState } from 'react';
import {
  SquaresFour, CreditCard, Plugs, Sliders, SignOut, MagnifyingGlass, Bell, Lightning, PaperPlaneTilt, Brain
} from '@phosphor-icons/react';

export type MainView = 'CLIENTS' | 'AD_ACCOUNTS' | 'REPORTS' | 'AI_CENTER' | 'INTEGRATIONS' | 'SETTINGS' | 'SUPABASE_SETUP';

interface LayoutProps {
  children: React.ReactNode;
  userEmail: string;
  activeView: MainView;
  onNavigate: (view: MainView) => void;
  onLogout: () => void;
}

const principalItems = [
  { id: 'CLIENTS' as const, label: 'Clientes', icon: SquaresFour },
  { id: 'AD_ACCOUNTS' as const, label: 'Contas de Anúncio', icon: CreditCard },
  { id: 'REPORTS' as const, label: 'Relatórios', icon: PaperPlaneTilt },
  { id: 'AI_CENTER' as const, label: 'Centro IA', icon: Brain },
];

const systemItems = [
  { id: 'INTEGRATIONS' as const, label: 'Integrações', icon: Plugs },
  { id: 'SETTINGS' as const, label: 'Configurações', icon: Sliders },
];

const mobileItems = [...principalItems, ...systemItems];

export const Layout: React.FC<LayoutProps> = ({ children, userEmail, activeView, onNavigate, onLogout }) => {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: '#04060f' }}>

      {/* Sidebar */}
      <aside
        className="w-60 hidden md:flex flex-col fixed h-full z-20 border-r"
        style={{ background: 'linear-gradient(180deg, #06080f 0%, #080d1a 100%)', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}>
              <Lightning weight="fill" size={14} color="#fff" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight block leading-tight">Nexus AI</span>
              <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">Agency Pro</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#2d3a50' }}>Principal</p>

          {principalItems.map((item) => (
            <NavItem
              key={item.id}
              active={activeView === item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => onNavigate(item.id)}
            />
          ))}

          <p className="px-3 mt-6 mb-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#2d3a50' }}>Sistema</p>

          {systemItems.map((item) => (
            <NavItem
              key={item.id}
              active={activeView === item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-300 truncate">Admin</p>
              <p className="text-[10px] text-slate-600 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg transition-all"
            style={{ color: '#334155', border: '1px solid rgba(255,255,255,0.05)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#334155'; (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'; }}
          >
            <SignOut size={13} />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-60 flex flex-col min-w-0">

        {/* Header */}
        <header
          className="h-14 backdrop-blur-xl border-b flex items-center justify-between px-5 sm:px-8 sticky top-0 z-10"
          style={{ background: 'rgba(6,8,15,0.85)', borderColor: 'rgba(255,255,255,0.05)' }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Lightning weight="fill" size={13} color="#fff" />
            </div>
            <span className="font-bold text-sm text-white">Nexus AI</span>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className={`relative w-full transition-all duration-200 ${searchFocused ? 'scale-[1.01]' : ''}`}>
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: searchFocused ? '#6366f1' : '#334155' }}
              />
              <input
                type="text"
                placeholder="Buscar cliente, conta ou campanha..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="block w-full pl-9 pr-4 py-2 rounded-xl text-sm text-slate-300 placeholder-slate-700 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${searchFocused ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            <button
              className="relative p-2 rounded-lg transition-all"
              style={{ color: '#334155' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#334155'; (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            </button>
            <div className="h-5 w-px mx-1" style={{ background: 'rgba(255,255,255,0.07)' }}></div>
            <button
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all border border-transparent"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-500 hidden sm:block">Minha Conta</span>
            </button>
          </div>
        </header>

        <nav
          className="md:hidden sticky top-14 z-10 overflow-x-auto border-b"
          style={{ background: 'rgba(6,8,15,0.94)', borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex gap-1 px-4 py-2 min-w-max">
            {mobileItems.map((item) => (
              <MobileNavItem
                key={item.id}
                active={activeView === item.id}
                icon={item.icon}
                label={item.label}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 p-5 sm:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

type NavItemProps = {
  active: boolean;
  icon: React.ComponentType<{ size?: number; weight?: 'regular' | 'bold' | 'fill' }>;
  label: string;
  onClick: () => void;
};

const NavItem: React.FC<NavItemProps> = ({
  active,
  icon: Icon,
  label,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 text-xs rounded-xl transition-all text-left ${active ? 'font-semibold' : 'font-medium'}`}
      style={active ? { background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.18)' } : { color: '#334155', border: '1px solid transparent' }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLElement).style.color = '#94a3b8';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = '';
          (e.currentTarget as HTMLElement).style.color = '#334155';
        }
      }}
    >
      <Icon weight={active ? 'bold' : 'regular'} size={16} />
      <span>{label}</span>
    </button>
  );
};

const MobileNavItem: React.FC<NavItemProps> = ({
  active,
  icon: Icon,
  label,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] shrink-0 transition-all ${active ? 'font-semibold' : 'font-medium'}`}
      style={active ? { background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' } : { color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <Icon weight={active ? 'bold' : 'regular'} size={14} />
      <span>{label}</span>
    </button>
  );
};
