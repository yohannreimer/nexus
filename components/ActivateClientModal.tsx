import React, { useState } from 'react';
import { X, Save, Smartphone, Clock, Zap } from 'lucide-react';
import { AdAccount } from '../types';
import { Button } from './Button';

interface ActivateClientModalProps {
  account: AdAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountId: string, whatsapp: string, sendTime: string) => void;
}

export const ActivateClientModal: React.FC<ActivateClientModalProps> = ({ account, isOpen, onClose, onSave }) => {
  const [whatsapp, setWhatsapp] = useState('');
  const [sendTime, setSendTime] = useState('08:00');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!account || !whatsapp) { alert('Por favor, preencha o número do WhatsApp'); return; }
    setLoading(true);
    await onSave(account.id, whatsapp, sendTime);
    setLoading(false);
    onClose();
  };

  if (!isOpen || !account) return null;

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl border border-white/8 bg-[#0f172a] shadow-2xl overflow-hidden">

          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
                <Zap className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ativar Cliente</h3>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">{account.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="bg-brand-500/8 border border-brand-500/15 rounded-xl p-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure o básico para começar a enviar relatórios automáticos. Você pode personalizar tudo depois em <strong className="text-slate-200">Editar</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                <Smartphone className="w-3.5 h-3.5 inline mr-1.5 text-emerald-400" />
                WhatsApp de Destino *
              </label>
              <input
                type="text"
                placeholder="Ex: 5511999999999"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className={inputClass}
                autoFocus
              />
              <p className="mt-1.5 text-xs text-slate-600">Código do país + DDD + Número (sem espaços ou hífen)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                <Clock className="w-3.5 h-3.5 inline mr-1.5 text-brand-400" />
                Horário de Envio Automático
              </label>
              <input
                type="time"
                value={sendTime}
                onChange={e => setSendTime(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-slate-600">Horário diário de envio (fuso: São Paulo)</p>
            </div>

            <div className="bg-white/3 border border-white/6 rounded-xl p-4 space-y-1.5">
              <p className="text-xs text-slate-500"><span className="text-slate-400 font-medium">Período padrão:</span> Relatório do dia anterior</p>
              <p className="text-xs text-slate-500"><span className="text-slate-400 font-medium">Campanhas:</span> Todas as campanhas ativas</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/6 flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} isLoading={loading} disabled={!whatsapp} icon={<Zap className="w-3.5 h-3.5" />}>
              Ativar Cliente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
