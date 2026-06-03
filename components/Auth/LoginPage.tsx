import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export function LoginPage({ onSwitchToRegister, onSwitchToForgotPassword }: LoginPageProps) {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError('Preencha todos os campos'); return; }
    setLoading(true);
    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) setError('Email ou senha incorretos');
        else if (authError.message.includes('Email not confirmed')) setError('Confirme seu email antes de fazer login');
        else setError(authError.message);
      }
    } catch { setError('Erro ao fazer login. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all text-sm";

  if (!isConfigured) {
    return (
      <AuthShell>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Configuração Necessária</h2>
          <p className="text-sm text-slate-500">Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="text-xl font-bold text-white mb-6 text-center">Entrar na sua conta</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="seu@email.com" disabled={loading} autoComplete="email" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-11`} placeholder="••••••••" disabled={loading} autoComplete="current-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <button type="button" onClick={onSwitchToForgotPassword} className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">
            Esqueceu a senha?
          </button>
        </div>

        {error && (
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px active:translate-y-0"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : <><LogIn className="w-4 h-4" /> Entrar</>}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/8" /></div>
        <div className="relative flex justify-center"><span className="bg-[#0f172a] px-3 text-xs text-slate-600">ou</span></div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Não tem uma conta?{' '}
        <button onClick={onSwitchToRegister} className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
          Criar conta grátis
        </button>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/8 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-700/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/25 mb-4">
            <Zap className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI</h1>
          <p className="text-slate-500 text-xs mt-1">Relatórios automáticos de Facebook Ads</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-[#0f172a]/80 backdrop-blur-xl p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
          {children}
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          © 2025 Nexus AI. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
