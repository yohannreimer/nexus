import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout, MainView } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ReportPreview } from './components/ReportPreview';
import { ClientCharts } from './components/ClientCharts';
import { AgencySettings } from './components/AgencySettings';
import { SupabaseSetup } from './components/SupabaseSetup';
import { AdAccountsInventoryView } from './components/AdAccountsInventoryView';
import { ClientDetailView } from './components/ClientDetailView';
import { ClientsView } from './components/ClientsView';
import { IntegrationsView } from './components/IntegrationsView';
import { ReportsHistoryView } from './components/ReportsHistoryView';
import { ClientPortalPublicView } from './components/ClientPortalPublicView';
import { AgencyIntelligenceCenter } from './components/AgencyIntelligenceCenter';
import { usePrymeiraAuth } from './contexts/PrymeiraAuthContext';
import {
  AdAccount,
  AdAccountStatus,
  AgencyClient,
  AgencyClientAccountLink,
  AgencyUser,
  Client,
  ClientReportRun,
  ClientReportSettings,
  ClientWorkspaceSummary,
  ClientPortal,
  AgencyAiBriefing,
  ClientAiAnalysis,
  ClientDailySnapshot,
  PlatformAccount,
} from './types';
import * as api from './services/api';
import { PDFGeneratorService } from './services/pdfGeneratorService';
import { useSupabase } from './hooks/useSupabase';
import { checkFacebookConnectionInDatabase } from './services/supabase';
import {
  buildAvailableAccounts,
  buildClientSummaryHealth,
  createAgencyClient,
  linkAccountToClient,
  listAgencyAiBriefings,
  listAgencyClients,
  listClientAccountLinks,
  listClientAiAnalyses,
  listClientDailySnapshots,
  listClientPortals,
  listClientReportRuns,
  listClientReportSettings,
  listWorkspacePlatformAccounts,
  markReportRunForRetry,
  syncLegacyMetaOAuthToWorkspace,
  unlinkAccountFromClient,
  upsertClientPortal,
  upsertClientReportSettings,
  type ClientReportSettingsInput,
} from './services/clientWorkspaceApi';
import type { ClientPortalSaveInput } from './components/ClientPortalTab';
import {
  getAdAccountApiId,
  mapPlatformAccountToAdAccount,
} from './services/adAccountAdapters';
import { runScheduledReportsNow } from './services/edgeFunctions';

type ViewType =
  | 'CLIENTS'
  | 'CLIENT_DETAIL'
  | 'AD_ACCOUNTS'
  | 'REPORTS'
  | 'AI_CENTER'
  | 'INTEGRATIONS'
  | 'DASHBOARD'
  | 'PREVIEW'
  | 'CHARTS'
  | 'SETTINGS'
  | 'SUPABASE_SETUP';

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true';

function decodeOAuthPayload(encodedData: string): any {
  const normalized = encodedData.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function readOAuthPayloadFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const queryAuth = urlParams.get('auth');
  if (queryAuth) return queryAuth;

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  return hashParams.get('auth') || hashParams.get('facebook_auth');
}

function readPublicPortalRoute(): { slug: string; reportDate: string | null } | null {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'portal' || !parts[1]) return null;
  return {
    slug: decodeURIComponent(parts[1]),
    reportDate: parts[2] === 'reports' && parts[3] ? decodeURIComponent(parts[3]) : null,
  };
}

function formatClientSchedule(settings: ClientReportSettings): string {
  if (settings.deliveryFrequency === 'monthly') return `Mensal dia ${settings.monthlyDay || 1} às ${settings.sendTime}`;
  if (settings.deliveryFrequency === 'weekly') {
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return `${weekDays[settings.weeklyDay ?? 1]} às ${settings.sendTime}`;
  }
  return `Diário às ${settings.sendTime}`;
}

const DEV_USER: AgencyUser = {
  id: 'dev-preview',
  name: 'João Silva',
  email: 'joao@agenciaexemplo.com.br',
  isConnectedToFacebook: true,
};

const DEV_ACCOUNTS: AdAccount[] = [
  {
    id: 'act_111111111',
    name: 'Loja Exemplo E-commerce',
    currency: 'BRL',
    accountStatus: 1,
    isConfigured: true,
    whatsappTarget: '5511999887766',
    selectedCampaignIds: ['camp_1', 'camp_2'],
    lastReportSent: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    nextReportDate: new Date(Date.now() + 1000 * 60 * 60 * 16).toISOString(),
  },
  {
    id: 'act_222222222',
    name: 'Clínica Estética Premium',
    currency: 'BRL',
    accountStatus: 1,
    isConfigured: true,
    whatsappTarget: '5521988776655',
    selectedCampaignIds: ['camp_3'],
    lastReportSent: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    nextReportDate: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'act_333333333',
    name: 'Restaurante Sabor & Arte',
    currency: 'BRL',
    accountStatus: 1,
    isConfigured: false,
    selectedCampaignIds: [],
  },
  {
    id: 'act_444444444',
    name: 'Construtora Horizonte',
    currency: 'BRL',
    accountStatus: 1,
    isConfigured: false,
    selectedCampaignIds: [],
  },
  {
    id: 'act_555555555',
    name: 'Academia FitLife (desativada)',
    currency: 'BRL',
    accountStatus: 2,
    isConfigured: false,
    selectedCampaignIds: [],
  },
];

// Componente interno que usa o PrymeiraAuthContext
const AppContent: React.FC = () => {
  const { user: authUser, isAuthenticated, loading: authLoading, signOut } = usePrymeiraAuth();
  
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AgencyUser | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [workspaceClients, setWorkspaceClients] = useState<AgencyClient[]>([]);
  const [clientAccountLinks, setClientAccountLinks] = useState<AgencyClientAccountLink[]>([]);
  const [reportSettings, setReportSettings] = useState<ClientReportSettings[]>([]);
  const [reportRuns, setReportRuns] = useState<ClientReportRun[]>([]);
  const [clientPortals, setClientPortals] = useState<ClientPortal[]>([]);
  const [clientAiAnalyses, setClientAiAnalyses] = useState<ClientAiAnalysis[]>([]);
  const [clientDailySnapshots, setClientDailySnapshots] = useState<ClientDailySnapshot[]>([]);
  const [agencyAiBriefings, setAgencyAiBriefings] = useState<AgencyAiBriefing[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // State for Views
  const [previewAccount, setPreviewAccount] = useState<AdAccount | null>(null);
  const [chartsAccount, setChartsAccount] = useState<AdAccount | null>(null);
  const [view, setView] = useState<ViewType>('CLIENTS');

  // Supabase hook
  const {
    isConfigured: supabaseConfigured,
    isLoading: supabaseLoading,
    facebookConnection,
    connectFacebook: saveToSupabase,
    refreshAll: refreshSupabase
  } = useSupabase();

  // Estado para controlar se o Facebook está conectado de verdade
  const [facebookConnected, setFacebookConnected] = useState(false);
  
  // Estado para controlar loading inicial (evita piscar interface errada)
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Estado para guardar dados do OAuth enquanto espera autenticação
  const [pendingOAuthData, setPendingOAuthData] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async () => {
    try {
      const [clients, links, settings, runs, accounts, portals, briefings, dailySnapshots] = await Promise.all([
        listAgencyClients(),
        listClientAccountLinks(),
        listClientReportSettings(),
        listClientReportRuns(),
        listWorkspacePlatformAccounts(),
        listClientPortals(),
        listAgencyAiBriefings(),
        listClientDailySnapshots(15),
      ]);
      const analyses = clients.length > 0
        ? (await Promise.all(clients.map((client) => listClientAiAnalyses(client.id)))).flat()
        : [];
      setWorkspaceClients(clients);
      setClientAccountLinks(links);
      setReportSettings(settings);
      setReportRuns(runs);
      setPlatformAccounts(accounts);
      setClientPortals(portals);
      setAgencyAiBriefings(briefings);
      setClientAiAnalyses(analyses);
      setClientDailySnapshots(dailySnapshots);
    } catch (error) {
      console.error('Erro ao carregar workspace de clientes:', error);
      setWorkspaceClients([]);
      setClientAccountLinks([]);
      setReportSettings([]);
      setReportRuns([]);
      setPlatformAccounts([]);
      setClientPortals([]);
      setAgencyAiBriefings([]);
      setClientAiAnalyses([]);
      setClientDailySnapshots([]);
    }
  }, []);

  const loadPlatformAccounts = useCallback(async () => {
    const accounts = await api.fetchPlatformAccounts();
    setAdAccounts(accounts.map(mapPlatformAccountToAdAccount));
    try {
      const dbAccounts = await listWorkspacePlatformAccounts();
      setPlatformAccounts(dbAccounts);
    } catch (error) {
      console.warn('Não foi possível carregar contas normalizadas do workspace:', error);
      setPlatformAccounts(accounts);
    }
    return accounts;
  }, []);

  // LIMPAR localStorage na inicialização - APENAS SUPABASE AGORA
  useEffect(() => {
    console.log('🧹 Limpando localStorage - usando apenas Supabase');
    localStorage.removeItem('fb_auth_data');
    localStorage.removeItem('fb_access_token');

    const query = new URLSearchParams(window.location.search);
    const googleError = query.get('google_error');
    const googleConnected = query.get('google_connected');
    const facebookError = query.get('facebook_error');
    const facebookConnected = query.get('facebook_connected');
    if (googleError) {
      alert(`Erro ao conectar Google Ads: ${googleError}`);
      window.history.replaceState({}, document.title, "/");
    } else if (facebookError) {
      alert(`Erro ao conectar Meta Ads: ${facebookError}`);
      window.history.replaceState({}, document.title, "/");
    } else if (googleConnected) {
      window.history.replaceState({}, document.title, "/");
    } else if (facebookConnected) {
      window.history.replaceState({}, document.title, "/");
    }
    
    // Verificar se tem dados do OAuth na URL e guardar
    const authData = readOAuthPayloadFromUrl();
    if (authData) {
      console.log('📦 OAuth data encontrado na URL, guardando...');
      setPendingOAuthData(authData);
      // Limpar URL imediatamente
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // Check product session and legacy connection data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🔍 App.tsx useEffect executado');
      console.log('📦 Supabase configurado:', supabaseConfigured);
      console.log('🔐 Usuário autenticado:', isAuthenticated);
      console.log('📦 Pending OAuth data:', pendingOAuthData ? 'SIM' : 'NÃO');
      
      // Se ainda está carregando auth ou supabase, esperar
      if (authLoading || supabaseLoading) {
        console.log('⏳ Aguardando carregamento...');
        return;
      }
      
      // Marcar que começou a verificar (mas ainda não terminou)
      // O loading inicial só termina no final do initializeApp

      // Se não está autenticado na Prymeira
      if (!isAuthenticated || !authUser) {
        // Mas tem dados pendentes do OAuth - mostrar mensagem
        if (pendingOAuthData) {
          console.log('⚠️ OAuth data pendente, mas usuário não autenticado. Faça login primeiro!');
        }
        console.log('❌ Usuário não autenticado na Prymeira');
        setUser(null);
        setToken(null);
        setAdAccounts([]);
        setPlatformAccounts([]);
        setWorkspaceClients([]);
        setClientAccountLinks([]);
        setReportSettings([]);
        setReportRuns([]);
        setClientDailySnapshots([]);
        setFacebookConnected(false);
        setInitialLoading(false);
        return;
      }

      // ============================================================
      // CASO 1: Tem dados pendentes do OAuth do Facebook
      // ============================================================
      if (pendingOAuthData) {
        console.log('✅ Processando dados de autenticação do Facebook...');
        try {
          const userData = decodeOAuthPayload(pendingOAuthData);
          const currentToken = userData.token;
          
          console.log('👤 Usuário Facebook:', userData.user.name);
          console.log('📊 Ad Accounts:', userData.adAccounts.length);
          
          // Salvar no Supabase (apenas conexão Facebook, sem adAccounts)
          console.log('💾 Salvando no Supabase...');
          const success = await saveToSupabase(
            userData.user.id,
            userData.user.name,
            currentToken,
            userData.expiresIn || 5184000
          );
          
          if (success) {
            console.log('✅ Dados salvos no Supabase!');
            await syncLegacyMetaOAuthToWorkspace({
              facebookUserId: userData.user.id,
              facebookUserName: userData.user.name,
              accessToken: currentToken,
              expiresIn: userData.expiresIn || 5184000,
              accounts: userData.adAccounts || [],
            });
            // Limpar dados pendentes
            setPendingOAuthData(null);
            await refreshSupabase();
          } else {
            console.error('❌ Falha ao salvar no Supabase');
          }
          
          // Configurar estado
          setToken(currentToken);
          setFacebookConnected(true);
          
          const realUser: AgencyUser = {
            id: authUser.clerkUserId,
            name: userData.user.name,
            email: authUser.email,
            isConnectedToFacebook: true,
          };
          setUser(realUser);
          
          // Usar as contas que vieram do OAuth
          const mappedAccounts: AdAccount[] = userData.adAccounts.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            currency: acc.currency,
            timezone: acc.timezone_name,
            accountStatus: acc.account_status || 1 as AdAccountStatus,
            isConfigured: false
          }));
          setAdAccounts(mappedAccounts);
          await refreshWorkspace();
          setInitialLoading(false);
          return;
          
        } catch (e) {
          console.error('❌ Erro ao decodificar dados:', e);
          setPendingOAuthData(null);
        }
      }

      // ============================================================
      // CASO 2: Verificar conexão Facebook no BANCO DE DADOS
      // ============================================================
      console.log('🔍 Verificando conexão Facebook no banco de dados...');
      
      const hasConnection = await checkFacebookConnectionInDatabase();
      console.log('📦 Conexão Facebook no banco:', hasConnection);
      
      if (hasConnection && facebookConnection) {
        console.log('✅ Facebook conectado via banco de dados');
        setFacebookConnected(true);
        setToken(facebookConnection.access_token);
        
        // Configurar usuário
        const realUser: AgencyUser = {
          id: authUser.clerkUserId,
          name: facebookConnection.facebook_name || authUser.name || authUser.email.split('@')[0] || 'Usuário',
          email: authUser.email,
          isConnectedToFacebook: true,
        };
        setUser(realUser);
        
        // Buscar contas via camada multi-plataforma
        console.log('📊 Buscando contas via camada multi-plataforma...');
        try {
          const accountsData = await loadPlatformAccounts();
          
          if (accountsData && accountsData.length > 0) {
            console.log(`✅ ${accountsData.length} contas reais encontradas`);
          } else {
            console.warn('⚠️ Nenhuma conta retornada das Edge Functions');
            setAdAccounts([]);
          }
          await refreshWorkspace();
        } catch (error) {
          console.error('❌ Erro ao buscar contas:', error);
          setAdAccounts([]);
          await refreshWorkspace();
        }
        setInitialLoading(false);
      } else {
        // ============================================================
        // CASO 3: Facebook não conectado - ainda pode haver Google Ads
        // ============================================================
        console.log('⚠️ Facebook NÃO conectado - verificando outras plataformas');
        setToken(null);
        try {
          await loadPlatformAccounts();
          setFacebookConnected(false);
          await refreshWorkspace();
        } catch {
          setFacebookConnected(false);
          setAdAccounts([]);
          await refreshWorkspace();
        }
        
        // Configurar usuário básico (sem Facebook)
        const basicUser: AgencyUser = {
            id: authUser.clerkUserId,
            name: authUser.name || authUser.email.split('@')[0] || 'Usuário',
            email: authUser.email,
            isConnectedToFacebook: false,
          };
        setUser(basicUser);
        setInitialLoading(false);
      }
    };

    // Só executar se não estiver carregando
    if (!authLoading && !supabaseLoading) {
      initializeApp();
    }
  }, [supabaseConfigured, isAuthenticated, authUser, authLoading, supabaseLoading, facebookConnection, pendingOAuthData, saveToSupabase, refreshSupabase, loadPlatformAccounts, refreshWorkspace]);

  const loadAccounts = async () => {
      await loadPlatformAccounts();
      await refreshWorkspace();
  };

  const handleOpenPreview = (account: AdAccount) => {
      setPreviewAccount(account);
      setView('PREVIEW');
  };

  const handleOpenCharts = (account: AdAccount) => {
      setChartsAccount(account);
      setView('CHARTS');
  };

  // Função para conectar ao Facebook via OAuth
  const handleConnectFacebook = async () => {
    try {
      const { loginUrl } = await api.getPlatformLoginUrl('meta');
      window.location.href = loginUrl;
    } catch (error) {
      alert(`Erro ao iniciar Meta Ads: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { loginUrl } = await api.getPlatformLoginUrl('google');
      window.location.href = loginUrl;
    } catch (error) {
      alert(`Erro ao iniciar Google Ads: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const availableAccounts = useMemo(
    () => buildAvailableAccounts(platformAccounts, workspaceClients, clientAccountLinks),
    [platformAccounts, workspaceClients, clientAccountLinks],
  );

  const clientSummaries: ClientWorkspaceSummary[] = useMemo(() => workspaceClients.map((client) => {
    const links = clientAccountLinks.filter((link) => link.clientId === client.id && link.isActive);
    const settings = reportSettings.find((item) => item.clientId === client.id) || null;
    return {
      client,
      settings,
      linkedAccounts: links,
      accountCount: links.length,
      metaAccountCount: links.filter((link) => link.platform === 'meta').length,
      googleAccountCount: links.filter((link) => link.platform === 'google').length,
      nextSendLabel: settings?.deliveryEnabled ? formatClientSchedule(settings) : 'Não configurado',
      health: buildClientSummaryHealth(links, settings),
    };
  }), [workspaceClients, clientAccountLinks, reportSettings]);

  const selectedClientSummary = useMemo(
    () => clientSummaries.find((item) => item.client.id === selectedClientId) || null,
    [clientSummaries, selectedClientId],
  );

  const selectedClientPortal = useMemo(
    () => clientPortals.find((item) => item.clientId === selectedClientId) || null,
    [clientPortals, selectedClientId],
  );

  const selectedClientReportRuns = useMemo(
    () => reportRuns.filter((item) => item.clientId === selectedClientId),
    [reportRuns, selectedClientId],
  );

  const handleMainNavigate = (nextView: MainView) => {
    setPreviewAccount(null);
    setChartsAccount(null);
    if (nextView !== 'CLIENTS') setSelectedClientId(null);
    setView(nextView);
  };

  const handleCreateClient = async () => {
    const name = window.prompt('Nome do cliente');
    if (!name?.trim()) return;

    try {
      const client = await createAgencyClient({ name: name.trim() });
      await refreshWorkspace();
      setSelectedClientId(client.id);
      setView('CLIENT_DETAIL');
    } catch (error) {
      alert(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleLinkAccount = async (clientId: string, account: PlatformAccount) => {
    try {
      await linkAccountToClient(clientId, account);
      await refreshWorkspace();
    } catch (error) {
      alert(`Erro ao vincular conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleUnlinkAccount = async (linkId: string) => {
    try {
      await unlinkAccountFromClient(linkId);
      await refreshWorkspace();
    } catch (error) {
      alert(`Erro ao desvincular conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleSaveReportSettings = async (clientId: string, input: ClientReportSettingsInput) => {
    try {
      await upsertClientReportSettings(clientId, input);
      await refreshWorkspace();
    } catch (error) {
      alert(`Erro ao salvar automação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const handleSaveClientPortal = async (clientId: string, input: ClientPortalSaveInput) => {
    try {
      await upsertClientPortal({ clientId, ...input });
      await upsertClientReportSettings(clientId, { portalMode: input.mode });
      await refreshWorkspace();
    } catch (error) {
      alert(`Erro ao salvar portal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const handleRetryReportRun = async (runId: string) => {
    await markReportRunForRetry(runId);
    const runs = await listClientReportRuns();
    setReportRuns(runs);
  };

  const handleRunScheduledReportsNow = async () => {
    const result = await runScheduledReportsNow({ dryRun: false });
    const runs = await listClientReportRuns();
    setReportRuns(runs);
    return result;
  };

  const handleGeneratePDF = async () => {
    if (!chartsAccount) return;
    
    try {
      // Buscar insights via camada multi-plataforma
      const insights = await api.fetchPlatformInsights(chartsAccount.platform || 'meta', getAdAccountApiId(chartsAccount), { datePreset: 'last_30d' });

      // Buscar configurações da agência do Supabase
      const { getAgencyConfig } = await import('./services/supabase');
      const agencyConfig = await getAgencyConfig();

      // Formatar dados para o PDF
      const campaigns = insights.data.map(c => ({
        name: c.campaignName,
        spend: c.spend,
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: c.ctr,
        cpc: c.cpc,
        purchases: c.conversions || 0,
      }));

      // Encontrar destaques
      const sortedByCtr = [...insights.data].sort((a, b) => b.ctr - a.ctr);
      const sortedByCpc = [...insights.data].sort((a, b) => a.cpc - b.cpc);
      const sortedBySpend = [...insights.data].sort((a, b) => b.spend - a.spend);

      // Gerar PDF
      await PDFGeneratorService.downloadPDF({
        clientName: chartsAccount.name,
        period: 'Últimos 30 dias',
        generatedAt: new Date().toLocaleString('pt-BR'),
        summary: {
          total_spend: insights.totals.spend,
          total_impressions: insights.totals.impressions,
          total_clicks: insights.totals.clicks,
          total_reach: insights.totals.impressions,
          avg_ctr: insights.totals.ctr,
          avg_cpc: insights.totals.cpc,
          avg_cpm: insights.totals.cpm,
          total_purchases: insights.totals.conversions || 0,
          total_conversations: 0,
          cost_per_purchase: insights.totals.costPerConversion || undefined,
        },
        highlights: {
          best_ctr: { name: sortedByCtr[0]?.campaignName || '-', value: sortedByCtr[0]?.ctr || 0 },
          best_cpc: { name: sortedByCpc[0]?.campaignName || '-', value: sortedByCpc[0]?.cpc || 0 },
          top_spend: { name: sortedBySpend[0]?.campaignName || '-', value: sortedBySpend[0]?.spend || 0 },
          most_sales: { name: '-', value: 0 },
        },
        campaigns
      }, agencyConfig);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique se você está conectado ao Facebook.');
    }
  };

  // Adapter para transformar AdAccount em Client (compatibilidade com o componente antigo ReportPreview)
  const getClientFromAccount = (acc: AdAccount): Client => ({
      id: getAdAccountApiId(acc),
      name: 'Gestor',
      companyName: acc.name,
      whatsapp: acc.whatsappTarget || '',
      adAccountId: getAdAccountApiId(acc),
      platform: acc.platform || 'meta',
      status: 'active',
      tokenExpiresAt: new Date().toISOString(),
      selectedCampaignIds: acc.selectedCampaignIds || []
  });

  // RENDER

  // DEV BYPASS — pula login e mostra o dashboard com dados mock
  if (DEV_BYPASS) {
    return (
      <>
        {(view === 'CLIENTS' || view === 'DASHBOARD') && (
          <Layout userEmail={DEV_USER.email} onLogout={() => {}} activeView="CLIENTS" onNavigate={(nextView) => setView(nextView)}>
            <Dashboard
              connectedToFB={true}
              accounts={DEV_ACCOUNTS}
              onConnectFacebook={() => {}}
              onConnectGoogle={() => {}}
              onConfigureAccount={() => {}}
              onPreviewReport={handleOpenPreview}
              onViewCharts={handleOpenCharts}
            />
          </Layout>
        )}
        {view === 'PREVIEW' && previewAccount && (
          <ReportPreview client={getClientFromAccount(previewAccount)} whatsappNumber={previewAccount.whatsappTarget || ''} onBack={() => setView('CLIENTS')} />
        )}
        {view === 'CHARTS' && chartsAccount && (
          <ClientCharts client={{ id: chartsAccount.id, name: chartsAccount.name, platform: chartsAccount.platform }} onBack={() => setView('CLIENTS')} onGeneratePDF={handleGeneratePDF} />
        )}
        {view === 'SETTINGS' && <AgencySettings onBack={() => setView('CLIENTS')} />}
      </>
    );
  }

  // Loading da autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Loading inicial - aguardar verificação do Facebook
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verificando conexões...</p>
        </div>
      </div>
    );
  }

  // Usuário autenticado via Prymeira - criar AgencyUser a partir do authUser
  const authenticatedUser: AgencyUser = {
    id: authUser?.clerkUserId || '',
    name: authUser?.name || authUser?.email.split('@')[0] || 'Usuário',
    email: authUser?.email || '',
    isConnectedToFacebook: facebookConnected,
  };

  const handleAuthLogout = async () => {
    await signOut();
    setToken(null);
    setUser(null);
    setFacebookConnected(false);
    setAdAccounts([]);
    setPlatformAccounts([]);
    setWorkspaceClients([]);
    setClientAccountLinks([]);
    setReportSettings([]);
    setReportRuns([]);
    setClientPortals([]);
    setAgencyAiBriefings([]);
    setClientAiAnalyses([]);
    setClientDailySnapshots([]);
  };

  const activeLayoutView: MainView = view === 'AD_ACCOUNTS' || view === 'REPORTS' || view === 'AI_CENTER' || view === 'INTEGRATIONS' || view === 'SETTINGS' || view === 'SUPABASE_SETUP'
    ? view
    : 'CLIENTS';

  return (
    <>
        {view !== 'PREVIEW' && view !== 'CHARTS' && (
            <Layout 
                userEmail={authenticatedUser.email} 
                onLogout={handleAuthLogout}
                activeView={activeLayoutView}
                onNavigate={handleMainNavigate}
            >
                {view === 'CLIENTS' && (
                  <ClientsView
                    clients={clientSummaries}
                    onCreateClient={handleCreateClient}
                    onOpenClient={(clientId) => {
                      setSelectedClientId(clientId);
                      setView('CLIENT_DETAIL');
                    }}
                  />
                )}

                {view === 'CLIENT_DETAIL' && selectedClientSummary && (
                  <ClientDetailView
                    summary={selectedClientSummary}
                    portal={selectedClientPortal}
                    reportRuns={selectedClientReportRuns}
                    availableAccounts={availableAccounts}
                    onBack={() => setView('CLIENTS')}
                    onLinkAccount={(account) => handleLinkAccount(selectedClientSummary.client.id, account)}
                    onUnlinkAccount={handleUnlinkAccount}
                    onSaveReportSettings={handleSaveReportSettings}
                    onSaveClientPortal={handleSaveClientPortal}
                  />
                )}

                {view === 'CLIENT_DETAIL' && !selectedClientSummary && (
                  <ClientsView
                    clients={clientSummaries}
                    onCreateClient={handleCreateClient}
                    onOpenClient={(clientId) => {
                      setSelectedClientId(clientId);
                      setView('CLIENT_DETAIL');
                    }}
                  />
                )}

                {view === 'AD_ACCOUNTS' && (
                  <AdAccountsInventoryView
                    accounts={availableAccounts}
                    onOpenLinkedClient={(clientId) => {
                      setSelectedClientId(clientId);
                      setView('CLIENT_DETAIL');
                    }}
                    onPreviewAccount={(account) => handleOpenPreview(mapPlatformAccountToAdAccount(account))}
                    onViewCharts={(account) => handleOpenCharts(mapPlatformAccountToAdAccount(account))}
                  />
                )}

                {view === 'REPORTS' && (
                  <ReportsHistoryView
                    runs={reportRuns}
                    clients={workspaceClients}
                    onRetryRun={handleRetryReportRun}
                    onRunNow={handleRunScheduledReportsNow}
                  />
                )}

                {view === 'AI_CENTER' && (
                  <AgencyIntelligenceCenter
                    clients={clientSummaries}
                    runs={reportRuns}
                    analyses={clientAiAnalyses}
                    briefings={agencyAiBriefings}
                    dailySnapshots={clientDailySnapshots}
                    onOpenClient={(clientId) => {
                      setSelectedClientId(clientId);
                      setView('CLIENT_DETAIL');
                    }}
                    onOpenReports={() => setView('REPORTS')}
                  />
                )}

                {view === 'INTEGRATIONS' && (
                  <IntegrationsView
                    metaConnected={facebookConnected || platformAccounts.some((account) => account.platform === 'meta')}
                    googleConnected={adAccounts.some((account) => account.platform === 'google') || platformAccounts.some((account) => account.platform === 'google')}
                    onConnectMeta={handleConnectFacebook}
                    onConnectGoogle={handleConnectGoogle}
                  />
                )}

                {view === 'DASHBOARD' && (
                  <Dashboard 
                    connectedToFB={authenticatedUser.isConnectedToFacebook}
                    accounts={adAccounts}
                    onConnectFacebook={handleConnectFacebook}
                    onConnectGoogle={handleConnectGoogle}
                    onConfigureAccount={() => { /* Não usado - gerenciado internamente no Dashboard */ }}
                    onPreviewReport={handleOpenPreview}
                    onViewCharts={handleOpenCharts}
                  />
                )}

                {view === 'SETTINGS' && (
                  <AgencySettings onBack={() => setView('CLIENTS')} />
                )}

                {view === 'SUPABASE_SETUP' && (
                  <SupabaseSetup onComplete={() => {
                      refreshSupabase();
                      refreshWorkspace();
                      setView('CLIENTS');
                  }} />
                )}
            </Layout>
        )}

        {view === 'PREVIEW' && previewAccount && (
            <ReportPreview 
                client={getClientFromAccount(previewAccount)}
                whatsappNumber={previewAccount.whatsappTarget || ''}
                onBack={() => setView(selectedClientId ? 'CLIENT_DETAIL' : 'CLIENTS')}
            />
        )}

        {view === 'CHARTS' && chartsAccount && (
            <ClientCharts
                client={{ id: getAdAccountApiId(chartsAccount), name: chartsAccount.name, platform: chartsAccount.platform }}
                onBack={() => setView(selectedClientId ? 'CLIENT_DETAIL' : 'CLIENTS')}
                onGeneratePDF={handleGeneratePDF}
            />
        )}
    </>
  );
};

// Componente principal
const App: React.FC = () => {
  const publicPortalRoute = readPublicPortalRoute();
  if (publicPortalRoute) {
    return <ClientPortalPublicView slug={publicPortalRoute.slug} reportDate={publicPortalRoute.reportDate} />;
  }

  return <AppContent />;
};

export default App;
