import { AdAccount, FacebookCampaign } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import * as edgeFunctions from './edgeFunctions';
import { getPublicEnv, isPublicEnvEnabled } from './publicEnv';

// CONFIGURAÇÃO
const FB_APP_ID = getPublicEnv('VITE_FACEBOOK_APP_ID') || 'SEU_APP_ID_AQUI';
const SUPABASE_URL = getPublicEnv('VITE_SUPABASE_URL');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getFacebookLoginUrl = () => {
  // Se Supabase está configurado, usar a Edge Function como redirect
  if (isSupabaseConfigured() && SUPABASE_URL) {
    const redirectUri = `${SUPABASE_URL}/functions/v1/facebook-oauth`;
    const scope = 'ads_read,read_insights,business_management';
    const state = Math.random().toString(36).substring(7);
    return `https://www.facebook.com/v23.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}&response_type=code`;
  }
  
  // Fallback para redirect local (ambiente de desenvolvimento sem Supabase)
  const REDIRECT_URI = window.location.origin;
  const scope = 'ads_read,read_insights';
  const state = Math.random().toString(36).substring(7);
  return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${scope}&response_type=code`;
};

export const exchangeCodeForToken = async (code: string): Promise<{ success: boolean; tempToken: string }> => {
  console.log(`[API] Trocando code por token...`);
  // Com Edge Functions, o OAuth é tratado diretamente pela função facebook-oauth
  // Este método é mantido por compatibilidade mas não é mais usado
  await delay(500);
  return { 
    success: true, 
    tempToken: "handled_by_edge_function"
  };
};

/**
 * Retorna todas as contas de anúncio vinculadas ao perfil do gestor.
 */
export const fetchAllAdAccounts = async (): Promise<AdAccount[]> => {
  console.log(`[API] Buscando portfolio de contas...`);
  
  // Se Supabase está configurado, buscar das Edge Functions
  if (isSupabaseConfigured()) {
    try {
      const accounts = await edgeFunctions.fetchAdAccounts();
      console.log(`✅ ${accounts.length} contas carregadas via Edge Function`);
      
      return accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        currency: acc.currency,
        accountStatus: acc.accountStatus as AdAccount['accountStatus'],
        isConfigured: acc.isConfigured,
        whatsappTarget: acc.whatsappTarget,
        selectedCampaignIds: acc.selectedCampaignIds,
        lastReportSent: acc.lastReportSent || undefined,
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar contas via Edge Function:', error);
      // Fallback para dados mockados em caso de erro
    }
  }

  // Fallback: dados mockados para desenvolvimento
  await delay(1200);
  return [
    { 
        id: 'act_123456789', 
        name: 'Pizzaria do João - Matriz', 
        currency: 'BRL', 
        accountStatus: 1,
        isConfigured: true,
        whatsappTarget: '5511999999999',
        selectedCampaignIds: ['123'],
        lastReportSent: 'Hoje, 08:00'
    },
    { 
        id: 'act_987654321', 
        name: 'Dr. Silva - Odontologia', 
        currency: 'BRL', 
        accountStatus: 1,
        isConfigured: false,
        whatsappTarget: '',
        selectedCampaignIds: []
    },
    { 
        id: 'act_555666777', 
        name: 'E-commerce Roupas Fitness', 
        currency: 'BRL', 
        accountStatus: 1,
        isConfigured: false,
        whatsappTarget: '',
        selectedCampaignIds: []
    },
  ];
};

export const fetchCampaigns = async (adAccountId: string): Promise<FacebookCampaign[]> => {
    console.log(`[API] Buscando campanhas da conta ${adAccountId}...`);

    if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
      const { fetchPlatformCampaigns } = await import('./platformApi');
      const campaigns = await fetchPlatformCampaigns('meta', adAccountId);
      return campaigns.map((campaign) => ({
        id: campaign.externalCampaignId || campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective || campaign.channelType || undefined,
      }));
    }
    
    // Se Supabase está configurado, usar Edge Functions
    if (isSupabaseConfigured()) {
      try {
        const campaigns = await edgeFunctions.fetchCampaigns(adAccountId);
        console.log(`✅ ${campaigns.length} campanhas carregadas via Edge Function`);
        
        return campaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          daily_budget: c.dailyBudget?.toString(),
          lifetime_budget: c.lifetimeBudget?.toString(),
        }));
      } catch (error) {
        console.error('❌ Erro ao buscar campanhas via Edge Function:', error);
        return [
          { id: 'error_1', name: `[ERRO] ${error instanceof Error ? error.message : 'Erro desconhecido'}`, status: 'PAUSED', objective: 'Verifique sua conexão' }
        ];
      }
    }
    
    // Fallback legado sem backend configurado.
    console.error('❌ Backend de campanhas não configurado');
    return [
      { id: 'error_1', name: '[ERRO] Backend de campanhas não configurado', status: 'PAUSED', objective: 'Verifique as variáveis de ambiente' }
    ];
}

export const saveAccountConfig = async (accountId: string, whatsapp: string, campaignIds: string[]): Promise<boolean> => {
    console.log(`[API] Salvando config da conta ${accountId}...`, { whatsapp, campaignIds });

    if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
      return true;
    }
    
    // Se Supabase está configurado, salvar no banco
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        // Atualizar ou criar configuração da conta
        const { error } = await supabase
          .from('ad_accounts')
          .upsert({
            user_id: user.id,
            ad_account_id: accountId,
            whatsapp_target: whatsapp,
            selected_campaign_ids: campaignIds,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,ad_account_id' });

        if (error) throw error;
        
        console.log('✅ Configuração salva no Supabase');
        return true;
      } catch (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        return false;
      }
    }
    
    // Fallback: salvar no localStorage
    await delay(1000);
    return true;
};

// Função para buscar insights (usa Edge Functions)
export const fetchInsights = async (
  accountId: string,
  options: {
    campaignIds?: string[];
    datePreset?: string;
    dateStart?: string;
    dateEnd?: string;
  } = {}
) => {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    const { fetchPlatformInsights } = await import('./platformApi');
    return fetchPlatformInsights('meta', accountId, options);
  }

  if (isSupabaseConfigured()) {
    return edgeFunctions.fetchInsights(accountId, options);
  }
  
  // Fallback: dados mockados
  throw new Error('Insights requerem conexão com Supabase');
};

// Função para enviar webhook (usa Edge Functions)
export const sendWebhook = async (params: {
  webhookUrl?: string;
  whatsappNumber?: string;
  reportContent: string;
  clientName?: string;
  adAccountId?: string;
  adAccountName?: string;
}) => {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    const webhookUrl = params.webhookUrl || getPublicEnv('VITE_N8N_WEBHOOK_URL');
    if (!webhookUrl) throw new Error('Webhook não configurado');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(`Webhook retornou status ${response.status}`);
    return response.json().catch(() => ({ ok: true }));
  }

  if (isSupabaseConfigured()) {
    return edgeFunctions.sendWebhook(params);
  }
  
  throw new Error('Webhook não configurado');
};

export {
  fetchPlatformAccounts,
  fetchPlatformCampaigns,
  fetchPlatformInsights,
  getPlatformLoginUrl,
} from './platformApi';
