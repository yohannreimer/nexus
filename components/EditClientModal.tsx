import React, { useState, useEffect } from 'react';
import {
  X, FloppyDisk, Sliders, Target, FileText, PaperPlaneTilt, Eye,
  WhatsappLogo, Clock, Robot, Check, BracketsCurly, ChatCircleDots,
  ArrowsClockwise, Calendar, ListBullets
} from '@phosphor-icons/react';
import { AdAccount } from '../types';
import { Button } from './Button';
import { fetchCampaigns, fetchInsights, sendWebhook } from '../services/api';
import { DEFAULT_TEMPLATES, processTemplate, getAllTemplates, saveCustomTemplate, saveClientTemplate, getClientTemplate, MessageTemplate } from '../services/messageTemplates';
import { isPublicEnvEnabled } from '../services/publicEnv';

interface Campaign { id: string; name: string; status: string; objective?: string; }
interface EditClientModalProps { account: AdAccount | null; isOpen: boolean; onClose: () => void; onSave: (config: any) => void; }
type TabType = 'config' | 'campaigns' | 'template' | 'send' | 'preview';

const TABS: { id: TabType; Icon: any; label: string }[] = [
  { id: 'config', Icon: Sliders, label: 'Configuração' },
  { id: 'campaigns', Icon: Target, label: 'Campanhas' },
  { id: 'template', Icon: FileText, label: 'Template' },
  { id: 'send', Icon: PaperPlaneTilt, label: 'Envio Manual' },
  { id: 'preview', Icon: Eye, label: 'Preview HTML' },
];

const PANEL: React.CSSProperties = { background: '#08101e', border: '1px solid rgba(255,255,255,0.06)' };
const FIELD_LABEL_STYLE: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#334155', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 };
const INPUT_STYLE: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 13px', fontSize: 12, color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", width: '100%' };

export const EditClientModal: React.FC<EditClientModalProps> = ({ account, isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<TabType>('config');
  const [whatsapp, setWhatsapp] = useState('');
  const [sendTime, setSendTime] = useState('08:00');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [isAutomated, setIsAutomated] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default_daily');
  const [customTemplate, setCustomTemplate] = useState('');
  const [reportPeriod, setReportPeriod] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'>('yesterday');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [customTemplateId, setCustomTemplateId] = useState('default_daily');
  const [sendingCustom, setSendingCustom] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [loadingPreviewMessage, setLoadingPreviewMessage] = useState(false);
  const [realReportData, setRealReportData] = useState<any>(null);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (isOpen && account) {
      setPreviewMessage(''); setRealReportData(null); setTemplatesLoaded(false);
      loadAccountConfig(); loadCampaigns(); loadTemplates();
    }
  }, [isOpen, account]);

  useEffect(() => { if (isOpen && account && templatesLoaded && templates.length > 0) fetchRealPreviewData(); }, [templatesLoaded, isOpen, account]);
  useEffect(() => { if ((activeTab === 'send' || activeTab === 'template') && templatesLoaded && templates.length > 0) fetchRealPreviewData(); }, [reportPeriod, customStartDate, customEndDate, activeTab, templatesLoaded, templates]);
  useEffect(() => {
    if (realReportData && templates.length > 0 && (activeTab === 'send' || activeTab === 'template')) {
      const tId = activeTab === 'send' ? customTemplateId : selectedTemplateId;
      const t = templates.find(t => t.id === tId) || templates[0];
      if (t) setPreviewMessage(processTemplate(t.template, realReportData));
    }
  }, [customTemplateId, selectedTemplateId, realReportData, templates, activeTab]);

  const loadAccountConfig = async () => {
    if (!account) return;
    try {
      if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) return;
      const { getClientByAdAccount, isSupabaseConfigured } = await import('../services/supabase');
      if (isSupabaseConfigured()) {
        const client = await getClientByAdAccount(account.id);
        if (client) {
          setWhatsapp(client.whatsapp_number || ''); setSendTime(client.report_time || '08:00');
          setIsAutomated(client.is_automated || false);
          if (client.template_id) { setSelectedTemplateId(client.template_id); setCustomTemplateId(client.template_id); }
          if (client.selected_campaign_ids?.length) setSelectedCampaigns(new Set(client.selected_campaign_ids));
          return;
        }
      }
    } catch (e) { console.error(e); }
    const tid = getClientTemplate(account.id);
    if (tid) { setSelectedTemplateId(tid); setCustomTemplateId(tid); const t = getAllTemplates().find(t => t.id === tid); if (t) setCustomTemplate(t.template); }
  };

  const loadCampaigns = async () => {
    if (!account) return; setLoadingCampaigns(true);
    try { setCampaigns(await fetchCampaigns(account.id)); } catch (e) { console.error(e); } finally { setLoadingCampaigns(false); }
  };

  const loadTemplates = () => {
    const all = getAllTemplates(); setTemplates(all);
    let t = all.find(t => t.id === selectedTemplateId) || all[0];
    if (t) { setSelectedTemplateId(t.id); setCustomTemplateId(t.id); setCustomTemplate(t.template); }
    setTemplatesLoaded(true);
  };

  const handleSave = async () => {
    if (!account || !whatsapp) { alert('Por favor, preencha o WhatsApp'); return; }
    setLoading(true);
    if (!isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
      const { saveClient, isSupabaseConfigured } = await import('../services/supabase');
      if (isSupabaseConfigured()) {
      await saveClient({ name: account.name, ad_account_id: account.id, whatsapp_number: whatsapp, report_time: sendTime, template_id: selectedTemplateId, is_automated: isAutomated, selected_campaign_ids: Array.from(selectedCampaigns) });
      }
    }
    saveClientTemplate(account.id, selectedTemplateId);
    await onSave({ whatsappNumber: whatsapp, sendTime, selectedCampaigns: Array.from(selectedCampaigns), templateId: selectedTemplateId, customTemplate });
    setLoading(false); onClose();
  };

  const fetchRealPreviewData = async () => {
    if (!account) return;
    setLoadingPreviewMessage(true); setPreviewMessage('Carregando dados reais...');
    try {
      const presetMap: Record<string, string> = { today: 'today', yesterday: 'yesterday', last7days: 'last_7d', last30days: 'last_30d' };
      const params = reportPeriod === 'custom' ? { dateStart: customStartDate, dateEnd: customEndDate } : { datePreset: presetMap[reportPeriod] || 'yesterday' };
      const insights = await fetchInsights(account.id, params);
      const cs = insights.data.map((c: any) => ({ name: c.campaignName, spend: c.spend, impressions: c.impressions, clicks: c.clicks, ctr: c.ctr, cpc: c.cpc, purchases: c.purchases || 0, leads: c.leads || 0 }));
      const hi: any = {};
      if (cs.length) {
        const bCtr = cs.reduce((b: any, c: any) => (!b || c.ctr > b.ctr) ? c : b, null);
        if (bCtr?.ctr > 0) hi.best_ctr = { name: bCtr.name, value: bCtr.ctr };
        const wc = cs.filter((c: any) => c.clicks > 0 && c.cpc > 0);
        if (wc.length) { const bCpc = wc.reduce((b: any, c: any) => (!b || c.cpc < b.cpc) ? c : b, null); if (bCpc) hi.best_cpc = { name: bCpc.name, value: bCpc.cpc }; }
        const ts = cs.reduce((b: any, c: any) => (!b || c.spend > b.spend) ? c : b, null);
        if (ts?.spend > 0) hi.top_spend = { name: ts.name, value: ts.spend };
      }
      const labels: Record<string, string> = { today: 'Hoje', yesterday: 'Ontem', last7days: 'Últimos 7 dias', last30days: 'Últimos 30 dias' };
      const periodLabel = reportPeriod === 'custom' ? `${new Date(customStartDate).toLocaleDateString('pt-BR')} a ${new Date(customEndDate).toLocaleDateString('pt-BR')}` : (labels[reportPeriod] || 'Ontem');
      const reportData = { accountName: account.name, period: reportPeriod, periodLabel, summary: { total_spend: insights.totals.spend, total_impressions: insights.totals.impressions, total_clicks: insights.totals.clicks, total_reach: insights.totals.reach || 0, total_campaigns: cs.length, avg_ctr: insights.totals.ctr, avg_cpc: insights.totals.cpc, avg_cpm: insights.totals.cpm || 0, total_purchases: insights.totals.purchases || 0, total_conversations: insights.totals.messaging || 0 }, highlights: hi, alerts: [], campaigns: cs };
      setRealReportData(reportData);
      if (!insights.totals.spend && !insights.totals.impressions) { setPreviewMessage(`📭 *Sem dados no período "${periodLabel}"*\n\nTente selecionar um período diferente.`); return; }
      const t = templates.find(t => t.id === (activeTab === 'send' ? customTemplateId : selectedTemplateId)) || templates[0];
      if (t) setPreviewMessage(processTemplate(t.template, reportData));
    } catch (e: any) { setPreviewMessage(`⚠️ Erro: ${e.message}`); setRealReportData(null); }
    finally { setLoadingPreviewMessage(false); }
  };

  const handleSendCustomReport = async () => {
    if (!account) return; setSendingCustom(true);
    try {
      if (!previewMessage || previewMessage.includes('Carregando') || previewMessage.includes('⚠️')) throw new Error('Aguarde o carregamento dos dados');
      await sendWebhook({ whatsappNumber: whatsapp, reportContent: previewMessage, clientName: account.name, adAccountId: account.id, adAccountName: account.name });
      alert('✅ Relatório enviado com sucesso!');
    } catch (e: any) { alert(`❌ Erro: ${e.message}`); }
    finally { setSendingCustom(false); }
  };

  const handleLoadPreview = async () => {
    if (!account) return; setLoadingPreview(true);
    try {
      const insights = await fetchInsights(account.id, { datePreset: 'yesterday' });
      setPreviewHtml(`<div style="padding:20px;font-family:system-ui"><h2>Relatório ${account?.name}</h2><p><b>Período:</b> Ontem</p><hr/><p><b>Gasto:</b> R$ ${insights.totals.spend.toFixed(2)}</p><p><b>Impressões:</b> ${insights.totals.impressions.toLocaleString()}</p><p><b>Cliques:</b> ${insights.totals.clicks}</p><p><b>CTR:</b> ${insights.totals.ctr.toFixed(2)}%</p><p><b>CPC:</b> R$ ${insights.totals.cpc.toFixed(2)}</p></div>`);
    } catch (e: any) { setPreviewHtml(`<div style="padding:40px;text-align:center;color:#ef4444;font-family:system-ui"><h3>Erro ao Gerar Preview</h3><p>${e.message}</p></div>`); }
    finally { setLoadingPreview(false); }
  };

  const getExampleData = () => ({ accountName: account?.name || 'Cliente', period: 'yesterday', periodLabel: 'Ontem', summary: { date: new Date().toLocaleDateString('pt-BR'), total_spend: 1250.50, total_impressions: 45000, total_clicks: 890, total_reach: 38000, total_campaigns: 5, avg_ctr: 1.98, avg_cpc: 1.41, avg_cpm: 27.79, total_purchases: 23, total_conversations: 45, cost_per_purchase: 54.37 }, highlights: { best_ctr: { name: 'Camp. Black Friday', value: 3.45 }, best_cpc: { name: 'Camp. Leads', value: 0.85 }, top_spend: { name: 'Camp. Principal', value: 450 } }, alerts: [], campaigns: [] });

  if (!isOpen || !account) return null;

  const accentInitials = account.name.substring(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
          style={{ background: '#07101e', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #6366f1 30%, #818cf8 70%, transparent)' }} />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                {accentInitials}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{account.name}</p>
                <p className="text-[10px] text-slate-600">{account.id} · Configurações da conta</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Tab nav */}
          <div className="flex px-5 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {TABS.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all"
                style={{
                  color: activeTab === id ? '#818cf8' : '#334155',
                  borderBottom: `2px solid ${activeTab === id ? '#6366f1' : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                <Icon size={14} weight={activeTab === id ? 'bold' : 'regular'} />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ── TAB: Config ── */}
            {activeTab === 'config' && (
              <div className="grid grid-cols-2 gap-5 max-w-2xl">
                <div>
                  <div style={FIELD_LABEL_STYLE}>
                    <WhatsappLogo size={13} color="#22c55e" />
                    WhatsApp de Destino *
                  </div>
                  <input
                    type="text"
                    placeholder="5511999999999"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    style={INPUT_STYLE}
                  />
                  <p className="mt-1.5 text-[10px]" style={{ color: '#1e2a3a' }}>Código do país + DDD + número, sem espaços</p>
                </div>

                <div>
                  <div style={FIELD_LABEL_STYLE}>
                    <Clock size={13} color="#818cf8" />
                    Horário de Envio
                  </div>
                  <input
                    type="time"
                    value={sendTime}
                    onChange={e => setSendTime(e.target.value)}
                    style={INPUT_STYLE}
                  />
                  <p className="mt-1.5 text-[10px]" style={{ color: '#1e2a3a' }}>Fuso horário: São Paulo (BRT)</p>
                </div>

                {/* Automation toggle — full row */}
                <div className="col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: isAutomated ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)' }}>
                        <Robot size={18} color={isAutomated ? '#22c55e' : '#475569'} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Envio Automático</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {isAutomated ? `Ativado — relatório diário às ${sendTime}` : 'Desativado — somente envio manual'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsAutomated(!isAutomated)}
                      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
                      style={{ background: isAutomated ? '#22c55e' : 'rgba(255,255,255,0.12)' }}
                    >
                      <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200" style={{ transform: isAutomated ? 'translateX(20px)' : 'translateX(0)' }} />
                    </button>
                  </div>
                  {isAutomated && (
                    <p className="mt-3 pt-3 text-[10px] text-slate-600" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      Relatório do dia anterior enviado para <span className="text-slate-400">{whatsapp || '(configure o WhatsApp)'}</span> às <span className="text-slate-400">{sendTime}</span> · via WhatsApp
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB: Campaigns ── */}
            {activeTab === 'campaigns' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-slate-500">Selecione as campanhas incluídas nos relatórios</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCampaigns(new Set(campaigns.map(c => c.id)))}
                      disabled={loadingCampaigns}
                      className="px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                    >
                      Todas ({campaigns.length})
                    </button>
                    <button
                      onClick={() => setSelectedCampaigns(new Set(campaigns.filter(c => c.status === 'ACTIVE').map(c => c.id)))}
                      disabled={loadingCampaigns}
                      className="px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                    >
                      Só ativas ({campaigns.filter(c => c.status === 'ACTIVE').length})
                    </button>
                  </div>
                </div>

                {loadingCampaigns ? (
                  <div className="text-center py-10 text-slate-600 text-sm">Carregando campanhas...</div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 text-sm">Nenhuma campanha encontrada</div>
                ) : (
                  <div className="rounded-xl overflow-hidden max-h-80 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    {campaigns.map(campaign => {
                      const checked = selectedCampaigns.has(campaign.id);
                      return (
                        <label
                          key={campaign.id}
                          className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                          style={{ background: checked ? 'rgba(99,102,241,0.04)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: checked ? '#6366f1' : 'transparent', border: `1.5px solid ${checked ? '#6366f1' : 'rgba(255,255,255,0.12)'}` }}
                          >
                            {checked && <Check size={10} color="#fff" weight="bold" />}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const s = new Set(selectedCampaigns);
                              s.has(campaign.id) ? s.delete(campaign.id) : s.add(campaign.id);
                              setSelectedCampaigns(s);
                            }}
                            className="sr-only"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-300 truncate">{campaign.name}</p>
                            <p className="text-[10px] text-slate-700">{campaign.objective || 'Sem objetivo'}</p>
                          </div>
                          <span
                            className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-full shrink-0"
                            style={campaign.status === 'ACTIVE'
                              ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e' }
                              : { background: 'rgba(255,255,255,0.04)', color: '#475569' }}
                          >
                            {campaign.status === 'ACTIVE' ? 'Ativa' : campaign.status}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 px-3 py-2 rounded-lg text-xs text-slate-600" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>{selectedCampaigns.size}</span> de {campaigns.length} campanhas selecionadas
                </div>
              </div>
            )}

            {/* ── TAB: Template ── */}
            {activeTab === 'template' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div style={FIELD_LABEL_STYLE}><ListBullets size={13} />Template</div>
                    <select
                      value={selectedTemplateId}
                      onChange={e => { setSelectedTemplateId(e.target.value); const t = templates.find(t => t.id === e.target.value); if (t) setCustomTemplate(t.template); }}
                      style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                    >
                      {templates.map(t => <option key={t.id} value={t.id} style={{ background: '#0f172a' }}>{t.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div style={FIELD_LABEL_STYLE}><FileText size={13} />Editar template</div>
                      <button
                        onClick={() => { const name = prompt('Nome do novo template:'); if (name) { const nt: MessageTemplate = { id: `custom_${Date.now()}`, name, description: 'Template customizado', template: customTemplate, createdAt: new Date().toISOString() }; saveCustomTemplate(nt); setTemplates(getAllTemplates()); setSelectedTemplateId(nt.id); alert('✅ Template salvo!'); } }}
                        className="flex items-center gap-1 text-[10px] font-semibold transition-all"
                        style={{ color: '#6366f1' }}
                      >
                        Salvar como novo
                      </button>
                    </div>
                    <textarea
                      value={customTemplate}
                      onChange={e => setCustomTemplate(e.target.value)}
                      rows={10}
                      style={{ ...INPUT_STYLE, resize: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.7 }}
                    />
                  </div>

                  <div>
                    <div style={FIELD_LABEL_STYLE}><BracketsCurly size={13} />Variáveis disponíveis</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['{{gasto_total}}','{{impressoes_total}}','{{cliques_total}}','{{ctr_medio}}','{{cpc_medio}}','{{melhor_ctr_campanha}}','{{alertas_lista}}','{{detalhes_campanhas}}'].map(v => (
                        <code
                          key={v}
                          className="text-[9px] px-2 py-1 rounded"
                          style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.12)' }}
                        >
                          {v}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>

                {/* WhatsApp preview */}
                <div>
                  <div style={FIELD_LABEL_STYLE}><ChatCircleDots size={13} />Preview da mensagem</div>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: '#1a2b36' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                        {accentInitials}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{account.name}</p>
                        <p className="text-[10px] text-slate-600">Nexus AI Bot · online</p>
                      </div>
                    </div>
                    <div className="p-4 min-h-[300px] max-h-[400px] overflow-y-auto" style={{ background: '#111b21' }}>
                      <div className="rounded-t-xl rounded-br-xl rounded-bl-sm p-3 max-w-xs ml-auto" style={{ background: '#1f2c33' }}>
                        <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {processTemplate(customTemplate, realReportData || getExampleData())}
                        </pre>
                        <p className="text-[10px] text-slate-600 mt-2 text-right">08:00 ✓✓</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Send ── */}
            {activeTab === 'send' && (
              <div className="space-y-5 max-w-xl">
                <div className="px-4 py-3 rounded-xl text-xs text-slate-500" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  Envie um relatório personalizado para qualquer período — sem esperar o automático.
                </div>

                <div>
                  <div style={FIELD_LABEL_STYLE}><Calendar size={13} />Período do relatório</div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[['today','Hoje'],['yesterday','Ontem'],['last7days','7 dias'],['last30days','30 dias'],['custom','Custom']].map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setReportPeriod(val as any)}
                        className="py-2 text-[10px] font-semibold rounded-lg transition-all"
                        style={reportPeriod === val
                          ? { background: 'rgba(99,102,241,0.15)', border: '1.5px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }
                          : { background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.07)', color: '#475569' }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {reportPeriod === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div style={{ ...FIELD_LABEL_STYLE, marginBottom: 4 }}>Data Início</div>
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} max={customEndDate} style={INPUT_STYLE} />
                      </div>
                      <div>
                        <div style={{ ...FIELD_LABEL_STYLE, marginBottom: 4 }}>Data Fim</div>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} min={customStartDate} max={new Date().toISOString().split('T')[0]} style={INPUT_STYLE} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div style={FIELD_LABEL_STYLE}><ListBullets size={13} />Template</div>
                  <select value={customTemplateId} onChange={e => setCustomTemplateId(e.target.value)} style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
                    {templates.map(t => <option key={t.id} value={t.id} style={{ background: '#0f172a' }}>{t.name}</option>)}
                  </select>
                </div>

                <div className="px-3 py-2 rounded-lg text-xs text-slate-600" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-slate-400 font-medium">WhatsApp:</span> {whatsapp || 'Não configurado'} &nbsp;·&nbsp;
                  <span className="text-slate-400 font-medium">Campanhas:</span> {selectedCampaigns.size} selecionadas
                </div>

                {/* WA preview */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div style={FIELD_LABEL_STYLE}><ChatCircleDots size={13} />Preview</div>
                    {loadingPreviewMessage && <span className="text-[10px] text-indigo-400 animate-pulse">Carregando...</span>}
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3 px-3 py-2" style={{ background: '#1a2b36' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                        {accentInitials}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-200">{account.name}</p>
                        <p className="text-[9px] text-slate-600">Nexus AI Bot</p>
                      </div>
                    </div>
                    <div className="p-4 min-h-[150px] max-h-[250px] overflow-y-auto" style={{ background: '#111b21' }}>
                      {loadingPreviewMessage ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-slate-600">
                          <ArrowsClockwise size={14} className="animate-spin" />
                          <span className="text-xs">Buscando dados do Facebook...</span>
                        </div>
                      ) : (
                        <div className="rounded-t-xl rounded-br-xl rounded-bl-sm p-3 max-w-xs ml-auto" style={{ background: '#1f2c33' }}>
                          <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">{previewMessage || 'Selecione um período...'}</pre>
                          <p className="text-[9px] text-slate-600 mt-2 text-right">{realReportData ? '✅ Dados reais' : '⌛'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSendCustomReport}
                  disabled={!whatsapp || selectedCampaigns.size === 0 || sendingCustom}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', opacity: (!whatsapp || selectedCampaigns.size === 0) ? 0.4 : 1 }}
                >
                  <PaperPlaneTilt size={16} weight="bold" />
                  {sendingCustom ? 'Enviando...' : 'Enviar Relatório Agora'}
                </button>
              </div>
            )}

            {/* ── TAB: Preview ── */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-300">Preview HTML Completo (Ontem)</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLoadPreview}
                      disabled={loadingPreview}
                      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                    >
                      <Eye size={12} />
                      {loadingPreview ? 'Carregando...' : 'Carregar'}
                    </button>
                    <button
                      onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(`<html><head><title>${account?.name}</title></head><body>${previewHtml}</body></html>`); w.document.close(); } }}
                      disabled={!previewHtml}
                      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569', opacity: !previewHtml ? 0.4 : 1 }}
                    >
                      PDF
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border overflow-y-auto max-h-[500px] bg-white p-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {previewHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  ) : (
                    <div className="text-center py-16 text-slate-400">
                      <Eye size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Clique em "Carregar" para visualizar o relatório</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={onClose} disabled={loading} className="px-4 py-2 text-xs font-semibold rounded-xl transition-all" style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#475569' }}>
              Fechar
            </button>
            <button
              onClick={handleSave}
              disabled={!whatsapp || loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all"
              style={{ background: '#6366f1', opacity: !whatsapp ? 0.4 : 1 }}
            >
              <FloppyDisk size={14} weight="bold" />
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
