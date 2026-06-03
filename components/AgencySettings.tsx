import React, { useState, useEffect } from 'react';
import {
  Settings, Building2, Palette, Clock, Save, Upload,
  Check, X, Image as ImageIcon, Globe, Mail, Phone, Loader2
} from 'lucide-react';
import { Button } from './Button';
import { saveAgencyConfig, getAgencyConfig, AgencyConfig } from '../services/supabase';

interface AgencySettingsProps {
  onBack: () => void;
}

export const AgencySettings: React.FC<AgencySettingsProps> = ({ onBack }) => {
  const [config, setConfig] = useState<AgencyConfig>({
    name: '',
    logo: '',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    email: '',
    phone: '',
    website: '',
    address: '',
    cnpj: '',
    defaultSendTime: '08:00',
    webhookUrl: '',
    reportFooter: 'Relatório gerado automaticamente por {{agency_name}}'
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'reports'>('general');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const savedConfig = await getAgencyConfig();
      if (savedConfig) setConfig(savedConfig);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveAgencyConfig(config);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Erro ao salvar: ' + result.error);
      }
    } catch (e) {
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setConfig(prev => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: 'general', label: 'Dados Gerais', icon: Building2 },
    { id: 'branding', label: 'Marca & Visual', icon: Palette },
    { id: 'reports', label: 'Relatórios', icon: Settings },
  ];

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm";
  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2";

  return (
    <div className="min-h-screen bg-[#020617]">
      {loading && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-brand-400 animate-spin" />
            <p className="text-sm text-slate-500">Carregando configurações...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#0d1117]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg border border-white/8 text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Configurações da Agência</h1>
              <p className="text-xs text-slate-600">Personalize sua agência e relatórios</p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            isLoading={saving}
            size="sm"
            icon={saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            className={saved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' : ''}
          >
            {saved ? 'Salvo!' : 'Salvar'}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-8">

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/3 p-1 rounded-xl border border-white/6 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="rounded-2xl border border-white/6 bg-white/3 backdrop-blur-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Informações da Agência</h3>
                <p className="text-xs text-slate-600">Esses dados aparecem nos relatórios PDF enviados aos clientes.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}><Building2 className="w-3.5 h-3.5 inline mr-1.5" />Nome da Agência</label>
                  <input type="text" value={config.name} onChange={e => setConfig(p => ({ ...p, name: e.target.value }))} placeholder="Sua Agência Digital" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><Mail className="w-3.5 h-3.5 inline mr-1.5" />E-mail</label>
                  <input type="email" value={config.email} onChange={e => setConfig(p => ({ ...p, email: e.target.value }))} placeholder="contato@agencia.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><Phone className="w-3.5 h-3.5 inline mr-1.5" />Telefone / WhatsApp</label>
                  <input type="text" value={config.phone} onChange={e => setConfig(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><Globe className="w-3.5 h-3.5 inline mr-1.5" />Website</label>
                  <input type="url" value={config.website} onChange={e => setConfig(p => ({ ...p, website: e.target.value }))} placeholder="https://www.suaagencia.com.br" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Endereço</label>
                  <input type="text" value={config.address} onChange={e => setConfig(p => ({ ...p, address: e.target.value }))} placeholder="Rua Exemplo, 123 - Cidade/UF" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CNPJ</label>
                  <input type="text" value={config.cnpj} onChange={e => setConfig(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Identidade Visual</h3>
                <p className="text-xs text-slate-600">Configure logo e cores para personalizar os relatórios.</p>
              </div>

              {/* Logo upload */}
              <div>
                <label className={labelClass}><ImageIcon className="w-3.5 h-3.5 inline mr-1.5" />Logo da Agência</label>
                <div className="flex items-center gap-6">
                  <div className="w-28 h-28 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center bg-white/3 overflow-hidden">
                    {config.logo ? (
                      <img src={config.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
                        <span className="text-xs text-slate-600">Sem logo</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                    <Button variant="secondary" size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => document.getElementById('logo-upload')?.click()}>
                      Upload Logo
                    </Button>
                    <p className="text-xs text-slate-600 mt-2">PNG, JPG ou SVG. Máx. 2MB</p>
                    {config.logo && (
                      <button onClick={() => setConfig(p => ({ ...p, logo: '' }))} className="text-xs text-red-400 hover:text-red-300 mt-1.5 transition-colors">
                        Remover logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}><Palette className="w-3.5 h-3.5 inline mr-1.5" />Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.primaryColor} onChange={e => setConfig(p => ({ ...p, primaryColor: e.target.value }))} className="w-11 h-11 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                    <input type="text" value={config.primaryColor} onChange={e => setConfig(p => ({ ...p, primaryColor: e.target.value }))} className={`${inputClass} flex-1 font-mono`} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}><Palette className="w-3.5 h-3.5 inline mr-1.5" />Cor Secundária</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.secondaryColor} onChange={e => setConfig(p => ({ ...p, secondaryColor: e.target.value }))} className="w-11 h-11 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                    <input type="text" value={config.secondaryColor} onChange={e => setConfig(p => ({ ...p, secondaryColor: e.target.value }))} className={`${inputClass} flex-1 font-mono`} />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className={labelClass}>Preview</label>
                <div className="rounded-xl p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` }}>
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="relative">
                    <h4 className="text-base font-bold mb-1">{config.name || 'Sua Agência'}</h4>
                    <p className="text-sm opacity-80">Relatório de Performance — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Configurações de Relatórios</h3>
                <p className="text-xs text-slate-600">Personalize como os relatórios são gerados e enviados.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}><Clock className="w-3.5 h-3.5 inline mr-1.5" />Horário Padrão de Envio</label>
                  <input type="time" value={config.defaultSendTime} onChange={e => setConfig(p => ({ ...p, defaultSendTime: e.target.value }))} className={inputClass} />
                  <p className="text-xs text-slate-600 mt-1.5">Padrão para novos clientes</p>
                </div>
              </div>

              <div>
                <label className={labelClass}>Rodapé dos Relatórios</label>
                <textarea
                  value={config.reportFooter}
                  onChange={e => setConfig(p => ({ ...p, reportFooter: e.target.value }))}
                  rows={3}
                  placeholder="Texto que aparecerá no rodapé dos relatórios PDF"
                  className={`${inputClass} resize-none`}
                />
                <p className="text-xs text-slate-600 mt-1.5">
                  Use <code className="bg-white/8 px-1 py-0.5 rounded text-brand-400">{'{{agency_name}}'}</code> para inserir o nome da agência
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
