import React, { useState, useEffect } from 'react';
import { X, Facebook, Check, Lock, AlertTriangle, Smartphone, Target, ChevronRight, LayoutList, Loader2 } from 'lucide-react';
import { Button } from './Button';
import * as api from '../services/api';
import { AdAccount, FacebookCampaign } from '../types';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (companyName: string, adAccountId: string, whatsapp: string, selectedCampaignIds: string[]) => void;
}

type Step = 'start' | 'oauth_wait' | 'fetching_accounts' | 'select_account' | 'fetching_campaigns' | 'configure' | 'saving' | 'success';

const STEP_LABELS: Partial<Record<Step, string>> = {
  start: 'Nova Conexão',
  oauth_wait: 'Autenticando',
  fetching_accounts: 'Autenticando',
  select_account: 'Escolher Conta',
  fetching_campaigns: 'Analisando Conta',
  configure: 'Configurar Cliente',
  saving: 'Finalizando',
  success: 'Concluído',
};

const LOADING_STEPS: Step[] = ['oauth_wait', 'fetching_accounts', 'fetching_campaigns', 'saving'];

const LOADING_LABELS: Partial<Record<Step, string>> = {
  oauth_wait: 'Aguardando permissão do Facebook...',
  fetching_accounts: 'Buscando contas de anúncio...',
  fetching_campaigns: 'Carregando estrutura de campanhas...',
  saving: 'Configurando automação...',
};

export const ConnectModal: React.FC<ConnectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('start');
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('start');
      setError(null);
      setWhatsapp('');
      setSelectedCampaignIds(new Set());
    }
  }, [isOpen]);

  const handleConnectClick = async () => {
    setError(null);
    setStep('oauth_wait');
    try {
      const { loginUrl } = await api.getPlatformLoginUrl('meta');
      window.location.href = loginUrl;
    } catch (error) {
      setError(`Erro ao iniciar Meta Ads: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setStep('start');
    }
  };

  useEffect(() => {
    const checkAuthData = () => {
      const authDataStr = localStorage.getItem('fb_auth_data');
      if (authDataStr && step === 'oauth_wait') {
        try {
          const authData = JSON.parse(authDataStr);
          if (authData.adAccounts?.length > 0) {
            const mapped: AdAccount[] = authData.adAccounts.map((acc: any) => ({
              id: acc.id, name: acc.name, currency: acc.currency, timezone: acc.timezone_name, isConfigured: false,
            }));
            setAdAccounts(mapped);
            setSelectedAccount(mapped[0].id);
            setStep('select_account');
            localStorage.removeItem('fb_auth_data');
          }
        } catch {
          setError('Erro ao processar autenticação. Tente novamente.');
          setStep('start');
        }
      }
    };
    const interval = setInterval(checkAuthData, 500);
    return () => clearInterval(interval);
  }, [step]);

  const handleAccountSelected = async () => {
    setStep('fetching_campaigns');
    try {
      const camps = await api.fetchCampaigns(selectedAccount);
      setCampaigns(camps);
      setSelectedCampaignIds(new Set(camps.filter(c => c.status === 'ACTIVE').map(c => c.id)));
      setStep('configure');
    } catch {
      setError('Erro ao carregar campanhas.');
      setStep('select_account');
    }
  };

  const toggleCampaign = (id: string) => {
    const s = new Set(selectedCampaignIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedCampaignIds(s);
  };

  const handleSave = async () => {
    if (!whatsapp) { setError('Informe um número de WhatsApp.'); return; }
    if (selectedCampaignIds.size === 0) { setError('Selecione pelo menos uma campanha.'); return; }
    setStep('saving');
    const account = adAccounts.find(a => a.id === selectedAccount);
    if (!account) return;
    try {
      await api.saveAccountConfig(account.id, whatsapp, Array.from(selectedCampaignIds));
      setStep('success');
      setTimeout(() => { onSuccess(account.name, account.id, whatsapp, Array.from(selectedCampaignIds)); onClose(); }, 1500);
    } catch {
      setError('Erro ao salvar configuração.');
      setStep('configure');
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl border border-white/8 bg-[#0f172a] shadow-2xl overflow-hidden">

          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
                {step === 'success'
                  ? <Check className="w-4 h-4 text-emerald-400" />
                  : <LayoutList className="w-4 h-4 text-brand-400" />
                }
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{STEP_LABELS[step]}</h3>
                <p className="text-xs text-slate-500">Facebook Ads · OAuth 2.0</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">

            {error && (
              <div className="mb-5 bg-red-500/8 border border-red-500/20 rounded-xl p-3.5 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* STEP: start */}
            {step === 'start' && (
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center mx-auto mb-5">
                  <Facebook className="w-10 h-10 text-[#1877F2]" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">Conectar com Facebook Ads</h4>
                <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">
                  Usaremos a API oficial para ler dados das campanhas de forma segura. Permissão apenas de leitura.
                </p>
                <button
                  onClick={handleConnectClick}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-sm transition-all shadow-lg shadow-[#1877F2]/20 hover:-translate-y-px"
                >
                  <Facebook className="w-4 h-4" />
                  Iniciar Integração com Facebook
                </button>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-600">
                  <Lock className="w-3 h-3" />
                  Conexão criptografada end-to-end
                </div>
              </div>
            )}

            {/* STEP: loading */}
            {LOADING_STEPS.includes(step) && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="relative w-16 h-16 mb-5">
                  <div className="absolute inset-0 rounded-full border-2 border-white/5 border-t-brand-500 animate-spin" />
                  <div className="absolute inset-3 rounded-full bg-brand-500/10 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-300 text-center">{LOADING_LABELS[step]}</p>
                <p className="text-xs text-slate-600 mt-1">Aguarde um momento...</p>
              </div>
            )}

            {/* STEP: select_account */}
            {step === 'select_account' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Conta de Anúncios
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={e => setSelectedAccount(e.target.value)}
                    className={inputClass}
                  >
                    {adAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                    ))}
                  </select>
                </div>

                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-300">Token de Longa Duração</p>
                    <p className="text-xs text-amber-400/70 mt-0.5">Um token de 60 dias será gerado automaticamente para esta conta.</p>
                  </div>
                </div>

                <Button onClick={handleAccountSelected} className="w-full">
                  Continuar
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}

            {/* STEP: configure */}
            {step === 'configure' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    <Smartphone className="w-3.5 h-3.5 inline mr-1.5 text-emerald-400" />
                    WhatsApp do Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="5511999999999"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className={inputClass}
                    autoFocus
                  />
                  <p className="mt-1.5 text-xs text-slate-600">Código do país + DDD + Número</p>
                </div>

                <div className="border-t border-white/5" />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Target className="w-3.5 h-3.5 inline mr-1.5 text-brand-400" />
                      Campanhas Monitoradas
                    </label>
                    <span className="text-xs text-brand-400 font-medium">{selectedCampaignIds.size} selecionadas</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-white/8 bg-white/3 divide-y divide-white/5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {campaigns.map(camp => (
                      <label
                        key={camp.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCampaignIds.has(camp.id)}
                          onChange={() => toggleCampaign(camp.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/30 focus:ring-offset-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-300 block truncate">{camp.name}</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${camp.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {camp.status}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                  Salvar e Ativar Automação
                </Button>
              </div>
            )}

            {/* STEP: success */}
            {step === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Tudo Pronto!</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  A automação está configurada. O primeiro relatório será enviado no horário programado.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
