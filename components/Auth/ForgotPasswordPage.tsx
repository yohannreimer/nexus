import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthShell } from './LoginPage';

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordPage({ onSwitchToLogin }: ForgotPasswordPageProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) { setError('Preencha o email'); return; }
    setLoading(true);
    try {
      const { error: authError } = await resetPassword(email);
      if (authError) setError(authError.message);
      else setSuccess(true);
    } catch { setError('Erro ao enviar email. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell>
      <button onClick={onSwitchToLogin} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors mb-6 text-xs font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para login
      </button>

      {success ? (
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Email Enviado!</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Enviamos um link de recuperação para <span className="text-white font-medium">{email}</span>. Verifique sua caixa de entrada e spam.
          </p>
          <button onClick={onSwitchToLogin} className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all">
            Voltar para Login
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold text-white mb-1 text-center">Recuperar Senha</h2>
          <p className="text-xs text-slate-500 text-center mb-6">Digite seu email e enviaremos um link de redefinição.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all text-sm"
                  placeholder="seu@email.com"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Enviar Link de Recuperação'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default ForgotPasswordPage;
