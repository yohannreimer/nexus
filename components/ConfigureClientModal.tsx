import React, { useState, useEffect } from 'react';
import { X, Save, Target, Smartphone, Check, Clock, Calendar, FileText, Eye, Sparkles, Send } from 'lucide-react';
import { AdAccount, FacebookCampaign } from '../types';
import { Button } from './Button';
import * as api from '../services/api';
import { 
  getAllTemplates, 
  saveClientTemplate, 
  getClientTemplate, 
  saveCustomTemplate,
  processTemplate,
  MessageTemplate,
  TEMPLATE_VARIABLES
} from '../services/messageTemplates';

interface ConfigureClientModalProps {
  account: AdAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountId: string, whatsapp: string, campaignIds: string[]) => void;
}

export const ConfigureClientModal: React.FC<ConfigureClientModalProps> = ({ account, isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'template' | 'preview'>('config');
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [sendTime, setSendTime] = useState('08:00');
  const [reportPeriod, setReportPeriod] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'last60days' | 'custom'>('yesterday');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  
  // Template states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default_daily');
  const [customTemplate, setCustomTemplate] = useState<string>('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  useEffect(() => {
    if (isOpen && account) {
        setWhatsapp(account.whatsappTarget || '');
        if (account.selectedCampaignIds) {
            setSelectedCampaignIds(new Set(account.selectedCampaignIds));
        } else {
            setSelectedCampaignIds(new Set());
        }
        fetchCampaigns(account.id);
        
        // Carrega templates
        setTemplates(getAllTemplates());
        
        // Carrega template salvo do cliente
        const clientTemplateId = getClientTemplate(account.id);
        if (clientTemplateId) {
            setSelectedTemplateId(clientTemplateId);
            const template = getAllTemplates().find(t => t.id === clientTemplateId);
            if (template) {
                setCustomTemplate(template.template);
            }
        } else {
            const defaultTemplate = getAllTemplates().find(t => t.id === 'default_daily');
            if (defaultTemplate) {
                setCustomTemplate(defaultTemplate.template);
            }
        }
    }
  }, [isOpen, account]);

  const fetchCampaigns = async (accId: string) => {
      setLoadingCampaigns(true);
      try {
        const result = await api.fetchCampaigns(accId);
        setCampaigns(result);
        // Se for nova configuração, seleciona as ativas por padrão
        if ((!account?.selectedCampaignIds || account.selectedCampaignIds.length === 0)) {
            const active = result.filter(c => c.status === 'ACTIVE').map(c => c.id);
            setSelectedCampaignIds(new Set(active));
        }
      } catch (error) {
          console.error("Failed to load campaigns");
      } finally {
          setLoadingCampaigns(false);
      }
  };

  const handleSave = async () => {
      if (!account) return;
      setLoading(true);
      
      // Salva configuração da conta
      await api.saveAccountConfig(account.id, whatsapp, Array.from(selectedCampaignIds));
      
      // Salva template selecionado para este cliente
      saveClientTemplate(account.id, selectedTemplateId);
      
      onSave(account.id, whatsapp, Array.from(selectedCampaignIds));
      setLoading(false);
      onClose();
  };

  const handleTemplateChange = (templateId: string) => {
      setSelectedTemplateId(templateId);
      const template = templates.find(t => t.id === templateId);
      if (template) {
          setCustomTemplate(template.template);
          setIsEditingTemplate(false);
      }
  };

  const handleSaveAsNewTemplate = () => {
      const newTemplate: MessageTemplate = {
          id: `custom_${Date.now()}`,
          name: `Template Customizado ${new Date().toLocaleDateString()}`,
          description: 'Template criado pelo usuário',
          template: customTemplate,
          createdAt: new Date().toISOString()
      };
      
      saveCustomTemplate(newTemplate);
      setTemplates(getAllTemplates());
      setSelectedTemplateId(newTemplate.id);
      alert('✅ Template salvo com sucesso!');
  };

  const getMockReportData = () => {
      // Mock de campanhas com diferentes objetivos para preview
      const mockCampaigns = [
          {
              name: 'Black Friday Vendas',
              objective: 'OUTCOME_SALES',
              insights: {
                  spend: '185.50',
                  clicks: '423',
                  impressions: '12500',
                  ctr: '3.38',
                  actions: [
                      { action_type: 'purchase', value: '23' }
                  ]
              }
          },
          {
              name: 'Remarketing Carrinho',
              objective: 'OUTCOME_SALES',
              insights: {
                  spend: '95.30',
                  clicks: '312',
                  impressions: '8200',
                  ctr: '3.80',
                  actions: [
                      { action_type: 'purchase', value: '18' }
                  ]
              }
          },
          {
              name: 'Tráfego Blog',
              objective: 'OUTCOME_TRAFFIC',
              insights: {
                  spend: '120.43',
                  clicks: '580',
                  impressions: '18500',
                  ctr: '3.13',
                  actions: []
              }
          },
          {
              name: 'Visitantes Site',
              objective: 'OUTCOME_TRAFFIC',
              insights: {
                  spend: '78.50',
                  clicks: '294',
                  impressions: '10669',
                  ctr: '2.76',
                  actions: []
              }
          },
          {
              name: 'WhatsApp Conversas',
              objective: 'OUTCOME_LEADS',
              insights: {
                  spend: '102.50',
                  clicks: '189',
                  impressions: '6800',
                  ctr: '2.78',
                  actions: [
                      { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '78' }
                  ]
              }
          }
      ];

      return {
          summary: {
              date: new Date().toLocaleDateString('pt-BR'),
              total_spend: 582.23,
              total_impressions: 49869,
              total_clicks: 1609,
              total_reach: 38542,
              avg_ctr: 3.23,
              avg_cpc: 0.36,
              avg_cpm: 11.68,
              total_campaigns: campaigns.length || 9,
              total_purchases: 47,
              total_conversations: 123,
              cost_per_purchase: 12.39,
              cost_per_conversation: 4.73
          },
          highlights: {
              best_ctr: { name: 'Campanha Conversão Site', value: 5.8 },
              best_cpc: { name: 'Remarketing 30D', value: 0.28 },
              top_spend: { name: 'Black Friday Mega Promoção', value: 185.50 },
              most_sales: { name: 'Carrinho Abandonado', value: 23 }
          },
          alerts: [
              { campaign: 'Teste Criativos A/B', issue: 'CTR baixo', ctr: 1.2, cpc: 0.45 }
          ],
          periodLabel: reportPeriod === 'yesterday' ? 'Ontem' : 'Últimos 7 dias',
          campaigns: mockCampaigns
      };
  };

  const toggleCampaign = (id: string) => {
      const newSet = new Set(selectedCampaignIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedCampaignIds(newSet);
  };

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        
        <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:w-full sm:max-w-lg">
                
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Configurar Automação</h3>
                            <p className="text-xs text-slate-500">{account.name} ({account.id})</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                activeTab === 'config'
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                Configuração
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('template')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                activeTab === 'template'
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Template
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                activeTab === 'preview'
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Preview
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                    
                    {/* ABA 1: CONFIGURAÇÃO */}
                    {activeTab === 'config' && (
                        <>
                            {/* WhatsApp Section */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-green-600" /> WhatsApp de Destino
                                    </div>
                                </label>
                                <input 
                                    type="text"
                                    placeholder="Ex: 5511999999999"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    className="block w-full rounded-lg border-slate-300 py-2.5 px-4 focus:border-brand-500 focus:ring-brand-500 sm:text-sm shadow-sm border"
                                />
                                <p className="mt-1.5 text-xs text-slate-500">
                                    Formato: Código do país + DDD + Número (sem espaços ou caracteres especiais)
                                </p>
                            </div>

                            {/* Send Time Section */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-purple-600" /> Horário de Envio
                                    </div>
                                </label>
                                <input 
                                    type="time"
                                    value={sendTime}
                                    onChange={(e) => setSendTime(e.target.value)}
                                    className="block w-full rounded-lg border-slate-300 py-2.5 px-4 focus:border-brand-500 focus:ring-brand-500 sm:text-sm shadow-sm border"
                                />
                                <p className="mt-1.5 text-xs text-slate-500">
                                    Horário em que o relatório será enviado automaticamente (fuso: São Paulo)
                                </p>
                            </div>

                            {/* Report Period Section */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-orange-600" /> Período do Relatório
                                    </div>
                                </label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    {[
                                        { value: 'yesterday', label: 'Ontem' },
                                        { value: 'today', label: 'Hoje' },
                                        { value: 'last7days', label: '7 dias' },
                                        { value: 'last30days', label: '30 dias' },
                                        { value: 'last60days', label: '60 dias' },
                                        { value: 'custom', label: 'Personalizado' }
                                    ].map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setReportPeriod(option.value as any)}
                                            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                                                reportPeriod === option.value
                                                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                
                                {reportPeriod === 'custom' && (
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Data Inicial</label>
                                            <input 
                                                type="date"
                                                value={customStartDate}
                                                onChange={(e) => setCustomStartDate(e.target.value)}
                                                max={customEndDate || new Date().toISOString().split('T')[0]}
                                                className="block w-full rounded-lg border-slate-300 py-1.5 px-2 text-sm focus:border-brand-500 focus:ring-brand-500 shadow-sm border"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Data Final</label>
                                            <input 
                                                type="date"
                                                value={customEndDate}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                min={customStartDate}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="block w-full rounded-lg border-slate-300 py-1.5 px-2 text-sm focus:border-brand-500 focus:ring-brand-500 shadow-sm border"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <p className="mt-1.5 text-xs text-slate-500">
                                    {reportPeriod === 'custom' && customStartDate && customEndDate 
                                        ? `Período: ${new Date(customStartDate).toLocaleDateString('pt-BR')} até ${new Date(customEndDate).toLocaleDateString('pt-BR')}`
                                        : 'Dados que serão incluídos no relatório automático'}
                                </p>
                            </div>

                            <div className="border-t border-slate-100"></div>

                            {/* Campaigns Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <Target className="w-4 h-4 text-blue-600" /> Seleção de Campanhas
                                        </div>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allActiveIds = campaigns
                                                .filter(c => c.status === 'ACTIVE')
                                                .map(c => c.id);
                                            setSelectedCampaignIds(new Set(allActiveIds));
                                        }}
                                        disabled={loadingCampaigns || campaigns.length === 0}
                                        className="text-xs font-medium text-brand-600 hover:text-brand-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ✓ Selecionar Todas Ativas ({campaigns.filter(c => c.status === 'ACTIVE').length})
                                    </button>
                                </div>
                                
                                {loadingCampaigns ? (
                                    <div className="py-8 text-center text-slate-400 text-sm bg-slate-50 rounded-lg">
                                        Carregando campanhas...
                                    </div>
                                ) : (
                                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50">
                                        {campaigns.map(camp => (
                                            <div 
                                                key={camp.id} 
                                                onClick={() => toggleCampaign(camp.id)}
                                                className={`flex items-center p-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${selectedCampaignIds.has(camp.id) ? 'bg-blue-50/50' : 'hover:bg-white'}`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${
                                                    selectedCampaignIds.has(camp.id) ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'
                                                }`}>
                                                    {selectedCampaignIds.has(camp.id) && <Check className="w-3 h-3" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{camp.name}</p>
                                                    <p className={`text-[10px] font-bold tracking-wider ${camp.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`}>
                                                        {camp.status}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="mt-2 text-xs text-right text-slate-500">
                                    {selectedCampaignIds.size} campanhas selecionadas
                                </p>
                            </div>
                        </>
                    )}

                    {/* ABA 2: TEMPLATE */}
                    {activeTab === 'template' && (
                        <>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-amber-900 text-sm">Templates Personalizáveis</h4>
                                        <p className="text-xs text-amber-700 mt-1">
                                            Escolha um template pré-definido ou crie o seu próprio. Use variáveis como <code className="bg-amber-100 px-1 rounded">{'{{gasto_total}}'}</code> para dados dinâmicos.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Seletor de Template */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Escolher Template</label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => handleTemplateChange(e.target.value)}
                                    disabled={isEditingTemplate}
                                    className="block w-full rounded-lg border-slate-300 py-2.5 px-4 focus:border-brand-500 focus:ring-brand-500 sm:text-sm shadow-sm border disabled:opacity-50"
                                >
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} {t.isDefault ? '(Padrão)' : '(Personalizado)'}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1.5 text-xs text-slate-500">
                                    {templates.find(t => t.id === selectedTemplateId)?.description}
                                </p>
                            </div>

                            {/* Editor de Template */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-slate-700">Mensagem</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                                    >
                                        {isEditingTemplate ? '✓ Concluir Edição' : '✏️ Editar'}
                                    </button>
                                </div>
                                <textarea
                                    value={customTemplate}
                                    onChange={(e) => setCustomTemplate(e.target.value)}
                                    disabled={!isEditingTemplate}
                                    rows={12}
                                    className="block w-full rounded-lg border-slate-300 py-2.5 px-4 focus:border-brand-500 focus:ring-brand-500 sm:text-sm shadow-sm border font-mono text-xs disabled:bg-slate-50"
                                    placeholder="Digite seu template personalizado aqui..."
                                />
                                {isEditingTemplate && (
                                    <div className="mt-3 flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleSaveAsNewTemplate}
                                            icon={<Save className="w-4 h-4" />}
                                            className="text-xs"
                                        >
                                            Salvar como Novo Template
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('preview')}
                                            className="text-xs text-brand-600 hover:text-brand-700 underline"
                                        >
                                            Ver Preview →
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Variáveis Disponíveis */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Variáveis Disponíveis</h4>
                                
                                {/* Variáveis POR CAMPANHA (Destaque) */}
                                <div className="mb-3 pb-3 border-b border-slate-200">
                                    <p className="text-[10px] font-semibold text-brand-600 uppercase mb-2">🎯 Por Campanha/Objetivo (NOVO)</p>
                                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                                        <div className="flex items-start gap-2">
                                            <code className="bg-brand-100 px-1.5 py-0.5 rounded text-brand-700 font-mono shrink-0 text-[10px]">{'{{detalhes_por_campanha}}'}</code>
                                            <span className="text-slate-600 text-[10px]">Lista cada campanha individual</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <code className="bg-brand-100 px-1.5 py-0.5 rounded text-brand-700 font-mono shrink-0 text-[10px]">{'{{resumo_por_objetivo}}'}</code>
                                            <span className="text-slate-600 text-[10px]">Agrupa por tipo (Vendas, Tráfego, Leads)</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <code className="bg-brand-100 px-1.5 py-0.5 rounded text-brand-700 font-mono shrink-0 text-[10px]">{'{{campanhas_vendas}}'}</code>
                                            <span className="text-slate-600 text-[10px]">Só campanhas de Vendas</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <code className="bg-brand-100 px-1.5 py-0.5 rounded text-brand-700 font-mono shrink-0 text-[10px]">{'{{campanhas_trafego}}'}</code>
                                            <span className="text-slate-600 text-[10px]">Só campanhas de Tráfego</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <code className="bg-brand-100 px-1.5 py-0.5 rounded text-brand-700 font-mono shrink-0 text-[10px]">{'{{campanhas_leads}}'}</code>
                                            <span className="text-slate-600 text-[10px]">Só campanhas de Leads</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Variáveis Gerais */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {Object.entries(TEMPLATE_VARIABLES).slice(0, 8).map(([key, desc]) => (
                                        <div key={key} className="flex items-start gap-2">
                                            <code className="bg-white px-1.5 py-0.5 rounded text-brand-600 font-mono shrink-0">{key}</code>
                                            <span className="text-slate-600 text-[11px]">{desc}</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => alert(JSON.stringify(TEMPLATE_VARIABLES, null, 2))}
                                    className="text-xs text-brand-600 hover:text-brand-700 mt-2 underline"
                                >
                                    Ver todas as variáveis
                                </button>
                            </div>
                        </>
                    )}

                    {/* ABA 3: PREVIEW */}
                    {activeTab === 'preview' && (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-blue-900 text-sm">Preview da Mensagem</h4>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Veja como ficará a mensagem com dados de exemplo
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Simulação WhatsApp */}
                            <div className="flex flex-col h-[500px] bg-white rounded-lg shadow overflow-hidden border border-slate-200">
                                {/* Header WhatsApp */}
                                <div className="bg-[#075E54] p-3 flex items-center text-white shadow-md">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#075E54] font-bold text-sm overflow-hidden">
                                        <img src="https://ui-avatars.com/api/?name=Nexus+AI&background=6366f1&color=fff" alt="Bot" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-bold">Nexus AI - Relatórios 🤖</p>
                                        <p className="text-xs opacity-90">Online</p>
                                    </div>
                                </div>
                                
                                {/* Mensagem */}
                                <div className="flex-grow bg-[#E5DDD5] p-4 overflow-y-auto relative">
                                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')"}}></div>
                                    
                                    <div className="flex flex-col space-y-2 relative z-10">
                                        <div className="self-start bg-white rounded-lg rounded-tl-none shadow-sm p-3 max-w-[90%] text-slate-800 text-sm">
                                            <div className="whitespace-pre-wrap font-sans leading-relaxed">
                                                {processTemplate(customTemplate, getMockReportData())}
                                            </div>
                                            <div className="text-[10px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                                                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                <Check className="w-3 h-3 text-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Input Falso */}
                                <div className="bg-[#f0f0f0] p-2 flex items-center">
                                    <div className="flex-grow bg-white rounded-full px-4 py-2 text-sm text-slate-400 border border-slate-200">
                                        Mensagem gerada automaticamente...
                                    </div>
                                    <button className="ml-2 bg-[#00A884] p-2 rounded-full text-white shadow-sm">
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSave} isLoading={loading} icon={<Save className="w-4 h-4" />}>
                        Salvar Configuração
                    </Button>
                </div>

            </div>
        </div>
    </div>
  );
};