import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthShell } from './LoginPage';

interface ResetPasswordPageProps {
  onSwitchToLogin: () => void;
}

export function ResetPasswordPage({ onSwitchToLogin }: ResetPasswordPageProps) {
  const { updatePassword } = useAuth();
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
    if (!password || !confirmPassword) { setError('Preencha todos os campos'); return; }
    if (!isPasswordStrong) { setError('A senha não atende aos requisitos mínimos'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      const { error: authError } = await updatePassword(password);
      if (authError) setError(authError.message);
      else setSuccess(true);
    } catch { setError('Erro ao atualizar senha. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all text-sm";

  return (
    <AuthShell>
      {success ? (
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Senha Atualizada!</h2>
          <p className="text-sm text-slate-400 mb-6">Sua senha foi alterada com sucesso.</p>
          <button onClick={onSwitchToLogin} className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all">
            Ir para Login
          </button>
        </div>
      ) : (
        <>
          <button onClick={onSwitchToLogin} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors mb-5 text-xs font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para login
          </button>

          <h2 className="text-xl font-bold text-white mb-1 text-center">Nova Senha</h2>
          <p className="text-xs text-slate-500 text-center mb-5">Digite sua nova senha abaixo.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" disabled={loading} />
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`${inputClass} pr-4`} placeholder="••••••••" disabled={loading} />
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Atualizando...</> : 'Atualizar Senha'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default ResetPasswordPage;
