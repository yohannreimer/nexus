import React from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { getPublicEnv } from '../services/publicEnv';

interface LoginProps {
  // A prop onLogin não é mais necessária, pois o fluxo é gerenciado pelo redirecionamento
}

export const Login: React.FC<LoginProps> = () => {

  const handleFacebookLogin = () => {
    const appId = getPublicEnv('VITE_FACEBOOK_APP_ID');
    const redirectUri = getPublicEnv('VITE_FACEBOOK_REDIRECT_URI');
    const scope = 'ads_read,read_insights';
    
    if (!appId || !redirectUri) {
      alert('Erro de configuração: As variáveis de ambiente do Facebook não foram definidas. Verifique seu arquivo .env');
      return '#';
    }

    return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Hero/Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
             <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-brand-600/20 rounded-full blur-3xl"></div>
             <div className="absolute bottom-[10%] -left-[10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl"></div>
         </div>

         <div className="relative z-10">
            <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <div className="w-8 h-8 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                </div>
                AdReport AI
            </div>
         </div>

         <div className="relative z-10 max-w-md">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
                Transforme dados em conversas que vendem.
            </h2>
            <p className="text-slate-400 text-lg mb-8">
                A plataforma #1 para agências de tráfego automatizarem reports via WhatsApp usando Inteligência Artificial.
            </p>
            <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-brand-500" />
                    <span>Conexão Múltiplas Contas (MCC)</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-brand-500" />
                    <span>Análise de ROAS e CPC em tempo real</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-brand-500" />
                    <span>White-label para sua agência</span>
                </div>
            </div>
         </div>

         <div className="relative z-10 text-sm text-slate-500">
            © 2024 AdReport AI SaaS. All rights reserved.
         </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Conecte sua conta</h1>
                <p className="mt-2 text-slate-500">Para começar, conecte seu perfil do Facebook que tem acesso às contas de anúncio.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                <div className="grid grid-cols-1 gap-3">
                    <a href={handleFacebookLogin()} className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1877F2] px-3 py-3 text-sm font-medium text-white shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-[#166e_e1] transition-colors">
                        <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24" fill="white">
                            <path d="M12.0003 20.45c-5.0575 0-9.1503-4.0928-9.1503-9.15 0-4.135 2.7226-7.6666 6.5333-8.8188V7.245H7.2415v4.055h2.1418v12.3422c.839.131 1.705.208 2.617.208.9118 0 1.778-.077 2.617-.208V11.3h3.328l.5305-4.055h-3.8585V5.3978c0-1.1047.323-1.987 1.8813-1.987l1.5648.002V.607c-.5595-.074-1.7428-.169-3.3133-.169-3.3823 0-5.572 2.064-5.572 5.726v3.136H6.852v4.055h3.598v12.3422c3.8107-1.1522 6.5333-4.6838 6.5333-8.8188 0-5.0572-4.0928-9.15-9.1503-9.15z" />
                        </svg>
                        <span className="font-semibold">Conectar com Facebook</span>
                    </a>
                </div>
            </div>

            <p className="text-center text-sm text-slate-500">
                Ao continuar, você concorda com nossos <a href="#" className="font-semibold text-brand-600 hover:text-brand-500">Termos de Serviço</a>.
            </p>
        </div>
      </div>
    </div>
  );
};
