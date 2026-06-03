import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, Loader2, AlertCircle, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthShell } from './LoginPage';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName || !email || !password || !confirmPassword) { setError('Preencha todos os campos'); return; }
    if (!isPasswordStrong) { setError('A senha não atende aos requisitos mínimos'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      const { error: authError } = await signUp(email, password, fullName);
      if (authError) {
        if (authError.message.includes('already registered')) setError('Este email já está cadastrado');
        else if (authError.message.includes('valid email')) setError('Email inválido');
        else setError(authError.message);
      } else { setSuccess(true); }
    } catch { setError('Erro ao criar conta. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all text-sm";

  if (success) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Conta Criada!</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Enviamos um email de confirmação para <span className="text-white font-medium">{email}</span>. Clique no link para ativar.
          </p>
          <button onClick={onSwitchToLogin} className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all">
            Ir para Login
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="text-xl font-bold text-white mb-5 text-center">Criar conta grátis</h2>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="Seu nome" disabled={loading} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="seu@email.com" disabled={loading} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-11`} placeholder="••••••••" disabled={loading} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {Object.entries({ 'Min. 8 caracteres': passwordChecks.length, 'Maiúscula': passwordChecks.uppercase, 'Minúscula': passwordChecks.lowercase, 'Número': passwordChecks.number }).map(([label, ok]) => (
                <div key={label} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Confirmar Senha</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="••••••••" disabled={loading} />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-400">As senhas não coincidem</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isPasswordStrong || password !== confirmPassword}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</> : <><UserPlus className="w-4 h-4" /> Criar Conta</>}
        </button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/8" /></div>
        <div className="relative flex justify-center"><span className="bg-[#0f172a] px-3 text-xs text-slate-600">ou</span></div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Já tem uma conta?{' '}
        <button onClick={onSwitchToLogin} className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
          Entrar
        </button>
      </p>
    </AuthShell>
  );
}

export default RegisterPage;
