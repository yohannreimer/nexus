/**
 * Supabase Client Configuration
 * Cliente para conexão com o banco de dados Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from './publicEnv';

// Configuração do Supabase - usar variáveis de ambiente
const supabaseUrl = getPublicEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getPublicEnv('VITE_SUPABASE_ANON_KEY');

// Só cria o cliente se as variáveis estiverem configuradas
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase configurado com sucesso');
} else {
  console.warn('⚠️ Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
}

export { supabase };

/**
 * Verifica se o Supabase está configurado
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

async function getCurrentSessionUserId(): Promise<string | null> {
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.warn('Erro ao carregar sessão Supabase:', sessionError.message);
    return null;
  }

  return sessionData.session?.user?.id || null;
}

// ==================== TYPES ====================

export interface Agency {
  id: string;
  name: string;
  logo_url?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FacebookConnection {
  id: string;
  user_id: string;
  agency_id?: string;
  facebook_user_id?: string;
  facebook_name?: string;
  facebook_email?: string;
  user_name?: string;
  access_token: string;
  token_expires_at: string;
  connected_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface AdAccount {
  id: string;
  facebook_account_id: string;
  connection_id: string;
  agency_id: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  agency_id: string;
  ad_account_id: string;
  name: string;
  whatsapp_number?: string;
  report_time?: string;
  report_period: string;
  template_id?: string;
  custom_template?: string;
  selected_campaign_ids?: string[];
  is_active: boolean;
  is_automated: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  agency_id: string;
  name: string;
  description?: string;
  template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportLog {
  id: string;
  client_id: string;
  ad_account_id: string;
  sent_at: string;
  period_start: string;
  period_end: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  message_preview?: string;
}

// ==================== AGENCY FUNCTIONS ====================

export interface AgencyConfig {
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  cnpj: string;
  defaultSendTime: string;
  webhookUrl: string;
  reportFooter: string;
}

export async function saveAgencyConfig(config: AgencyConfig): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase não configurado - saveAgencyConfig');
    return { success: false, error: 'Supabase não configurado' };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  // Verificar se já existe configuração
  const { data: existing } = await supabase
    .from('agency_config')
    .select('id')
    .eq('user_id', user.id)
    .single();

  let error;

  if (existing) {
    // Atualizar existente
    const result = await supabase
      .from('agency_config')
      .update({
        ...config,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    error = result.error;
  } else {
    // Inserir novo
    const result = await supabase
      .from('agency_config')
      .insert({
        user_id: user.id,
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    error = result.error;
  }

  if (error) {
    console.error('Erro ao salvar configuração da agência:', error);
    return { success: false, error: error.message };
  }

  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      default_webhook_url: config.webhookUrl || null,
      agency_name: config.name || null,
      agency_logo_url: config.logo || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .then(({ error: settingsError }) => {
      if (settingsError) {
        console.warn('Não foi possível sincronizar user_settings:', settingsError.message);
      }
    });

  console.log('✅ Configuração da agência salva com sucesso');
  return { success: true };
}

export async function getAgencyConfig(): Promise<AgencyConfig | null> {
  if (!supabase) {
    console.warn('Supabase não configurado - getAgencyConfig');
    return null;
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.warn('Usuário não autenticado - getAgencyConfig');
    return null;
  }

  const { data, error } = await supabase
    .from('agency_config')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Erro ao buscar configuração da agência:', error);
    }
    return null;
  }

  return data as AgencyConfig;
}

export async function getOrCreateAgency(): Promise<Agency | null> {
  if (!supabase) {
    console.warn('Supabase não configurado - getOrCreateAgency');
    return null;
  }
  
  // Por enquanto, usa uma agência padrão (depois implementar auth)
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .limit(1)
    .single();

  if (error && error.code === 'PGRST116') {
    // Não existe, criar
    const { data: newAgency, error: createError } = await supabase
      .from('agencies')
      .insert({ name: 'Minha Agência' })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar agência:', createError);
      return null;
    }
    return newAgency;
  }

  if (error) {
    console.error('Erro ao buscar agência:', error);
    return null;
  }

  return data;
}

// ==================== FACEBOOK CONNECTION FUNCTIONS ====================

export async function saveFacebookConnection(
  facebookUserId: string,
  facebookUserName: string,
  accessToken: string,
  expiresIn: number
): Promise<FacebookConnection | null> {
  if (!supabase) {
    console.warn('Supabase não configurado - saveFacebookConnection');
    return null;
  }
  
  // Buscar o Supabase Auth User ID
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Usuário não autenticado no Supabase:', authError);
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

  console.log('💾 Salvando conexão Facebook para user_id:', user.id);
  
  // Upsert usando o Supabase Auth User ID
  const { data, error } = await supabase
    .from('facebook_connections')
    .upsert({
      user_id: user.id,
      facebook_user_id: facebookUserId,
      facebook_name: facebookUserName,
      access_token: accessToken,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar conexão Facebook:', error);
    return null;
  }

  console.log('✅ Conexão Facebook salva com sucesso!');
  return data;
}

export async function getFacebookConnection(agencyId?: string): Promise<FacebookConnection | null> {
  if (!supabase) {
    console.warn('Supabase não configurado - getFacebookConnection');
    return null;
  }
  
  const userId = await getCurrentSessionUserId();
  if (!userId) {
    console.warn('Usuário não autenticado - getFacebookConnection');
    return null;
  }

  const { data, error } = await supabase
    .from('facebook_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Erro ao buscar conexão Facebook:', error);
    }
    return null;
  }

  return data;
}

export async function disconnectFacebook(agencyId?: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase não configurado - disconnectFacebook');
    return false;
  }
  
  // Buscar pelo Supabase Auth User ID
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.warn('Usuário não autenticado - disconnectFacebook');
    return false;
  }

  const { error } = await supabase
    .from('facebook_connections')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao desconectar Facebook:', error);
    return false;
  }

  return true;
}

// ==================== AD ACCOUNTS FUNCTIONS ====================

export async function saveAdAccounts(
  connectionId: string,
  agencyId: string,
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    timezone_name: string;
    account_status: number;
  }>
): Promise<AdAccount[]> {
  if (!supabase) {
    console.warn('Supabase não configurado - saveAdAccounts');
    return [];
  }
  
  const statusMap: Record<number, string> = {
    1: 'active',
    2: 'disabled',
    3: 'unsettled',
    7: 'pending_risk_review',
    8: 'pending_settlement',
    9: 'in_grace_period',
    100: 'pending_closure',
    101: 'closed',
    201: 'any_active',
    202: 'any_closed'
  };

  const accountsToInsert = accounts.map(acc => ({
    facebook_account_id: acc.id.replace('act_', ''),
    connection_id: connectionId,
    agency_id: agencyId,
    name: acc.name,
    currency: acc.currency || 'BRL',
    timezone: acc.timezone_name || 'America/Sao_Paulo',
    status: statusMap[acc.account_status] || 'unknown',
    is_active: true
  }));

  // Upsert para não duplicar
  const { data, error } = await supabase
    .from('ad_accounts')
    .upsert(accountsToInsert, {
      onConflict: 'facebook_account_id,agency_id'
    })
    .select();

  if (error) {
    console.error('Erro ao salvar contas de anúncio:', error);
    return [];
  }

  return data || [];
}

export async function getAdAccounts(agencyId: string): Promise<AdAccount[]> {
  if (!supabase) {
    console.warn('Supabase não configurado - getAdAccounts');
    return [];
  }
  
  const { data, error } = await supabase
    .from('ad_accounts')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Erro ao buscar contas de anúncio:', error);
    return [];
  }

  return data || [];
}

// ==================== CLIENTS FUNCTIONS ====================

export async function saveClient(client: Partial<Client>): Promise<{ data: Client | null; error: string | null }> {
  if (!supabase) {
    console.warn('Supabase não configurado - saveClient');
    return { data: null, error: 'Supabase não configurado' };
  }
  
  // Buscar user_id do Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('Usuário não autenticado - saveClient');
    return { data: null, error: 'Usuário não autenticado' };
  }

  // Adicionar user_id ao cliente
  const clientWithUser = {
    ...client,
    user_id: user.id,
  };

  console.log('📝 Salvando cliente:', clientWithUser);

  // Primeiro, verificar se já existe
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .eq('ad_account_id', client.ad_account_id)
    .single();

  let data, error;

  if (existing) {
    // Atualizar existente
    const result = await supabase
      .from('clients')
      .update(clientWithUser)
      .eq('id', existing.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // Inserir novo
    const result = await supabase
      .from('clients')
      .insert(clientWithUser)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('Erro ao salvar cliente:', error);
    return { data: null, error: error.message };
  }

  console.log('✅ Cliente salvo:', data);
  return { data, error: null };
}

export async function getClients(): Promise<Client[]> {
  if (!supabase) {
    console.warn('Supabase não configurado - getClients');
    return [];
  }
  
  const userId = await getCurrentSessionUserId();
  if (!userId) {
    console.warn('Usuário não autenticado - getClients');
    return [];
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }

  return data || [];
}

export async function getClientByAdAccount(adAccountId: string): Promise<Client | null> {
  if (!supabase) {
    console.warn('Supabase não configurado - getClientByAdAccount');
    return null;
  }
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('ad_account_id', adAccountId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Erro ao buscar cliente:', error);
    }
    return null;
  }

  return data;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
  if (!supabase) {
    console.warn('Supabase não configurado - updateClient');
    return null;
  }
  
  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar cliente:', error);
    return null;
  }

  return data;
}

export async function deleteClient(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase não configurado - deleteClient');
    return false;
  }
  
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar cliente:', error);
    return false;
  }

  return true;
}

// ==================== TEMPLATES FUNCTIONS ====================

export async function saveTemplate(template: Partial<MessageTemplate>): Promise<MessageTemplate | null> {
  if (!supabase) {
    console.warn('Supabase não configurado - saveTemplate');
    return null;
  }
  
  const { data, error } = await supabase
    .from('message_templates')
    .upsert(template, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar template:', error);
    return null;
  }

  return data;
}

export async function getTemplates(agencyId: string): Promise<MessageTemplate[]> {
  if (!supabase) {
    console.warn('Supabase não configurado - getTemplates');
    return [];
  }
  
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('agency_id', agencyId)
    .order('is_default', { ascending: false })
    .order('name');

  if (error) {
    console.error('Erro ao buscar templates:', error);
    return [];
  }

  return data || [];
}

export async function deleteTemplate(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase não configurado - deleteTemplate');
    return false;
  }
  
  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar template:', error);
    return false;
  }

  return true;
}

// ==================== REPORT LOGS FUNCTIONS ====================

export async function logReport(log: Partial<ReportLog>): Promise<ReportLog | null> {
  if (!supabase) {
    console.warn('Supabase não configurado - logReport');
    return null;
  }
  
  const { data, error } = await supabase
    .from('report_logs')
    .insert(log)
    .select()
    .single();

  if (error) {
    console.error('Erro ao registrar log:', error);
    return null;
  }

  return data;
}

export async function getReportLogs(clientId: string, limit = 10): Promise<ReportLog[]> {
  if (!supabase) {
    console.warn('Supabase não configurado - getReportLogs');
    return [];
  }
  
  const { data, error } = await supabase
    .from('report_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar logs:', error);
    return [];
  }

  return data || [];
}

// ==================== MIGRATION HELPER ====================

/**
 * Migra dados do localStorage para o Supabase
 */
export async function migrateFromLocalStorage(agencyId: string): Promise<{
  success: boolean;
  migrated: {
    connection: boolean;
    accounts: number;
    clients: number;
    templates: number;
  };
}> {
  const result = {
    success: false,
    migrated: {
      connection: false,
      accounts: 0,
      clients: 0,
      templates: 0
    }
  };

  if (!supabase) {
    console.warn('Supabase não configurado - migrateFromLocalStorage');
    return result;
  }

  try {
    // 1. Migrar conexão Facebook
    const fbAuthData = localStorage.getItem('fb_auth_data');
    const fbToken = localStorage.getItem('fb_access_token');
    
    if (fbAuthData && fbToken) {
      const authData = JSON.parse(fbAuthData);
      const connection = await saveFacebookConnection(
        authData.userID || 'migrated',
        authData.userName || 'Usuário Migrado',
        fbToken,
        authData.expiresIn || 5184000
      );
      
      if (connection) {
        result.migrated.connection = true;

        // 2. Migrar contas de anúncio
        if (authData.adAccounts && authData.adAccounts.length > 0) {
          const accounts = await saveAdAccounts(connection.id, agencyId, authData.adAccounts);
          result.migrated.accounts = accounts.length;

          // 3. Migrar configurações de clientes (do agency_config)
          const agencyConfig = localStorage.getItem('agency_config');
          if (agencyConfig) {
            const config = JSON.parse(agencyConfig);
            
            for (const account of accounts) {
              const accountConfig = config[account.facebook_account_id] || config[`act_${account.facebook_account_id}`];
              
              if (accountConfig) {
                await saveClient({
                  agency_id: agencyId,
                  ad_account_id: account.id,
                  name: account.name,
                  whatsapp_number: accountConfig.whatsappNumber,
                  report_time: accountConfig.reportTime,
                  report_period: accountConfig.reportPeriod || 'yesterday',
                  template_id: accountConfig.templateId,
                  custom_template: accountConfig.customTemplate,
                  selected_campaign_ids: accountConfig.selectedCampaignIds,
                  is_active: accountConfig.isActive !== false,
                  is_automated: accountConfig.isAutomated || false
                });
                result.migrated.clients++;
              }
            }
          }
        }
      }
    }

    // 4. Migrar templates customizados
    const customTemplates = localStorage.getItem('nexus_custom_templates');
    if (customTemplates) {
      const templates = JSON.parse(customTemplates);
      for (const template of templates) {
        await saveTemplate({
          agency_id: agencyId,
          name: template.name,
          description: template.description,
          template: template.template,
          is_default: false
        });
        result.migrated.templates++;
      }
    }

    result.success = true;
  } catch (error) {
    console.error('Erro na migração:', error);
  }

  return result;
}

export default supabase;

// ==================== SYNC FACEBOOK TOKEN ====================

/**
 * Sincroniza o token do Facebook do localStorage com o banco de dados do Supabase
 * Isso é necessário porque as Edge Functions buscam o token no banco
 */
export async function syncFacebookTokenToDatabase(): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase não configurado - syncFacebookTokenToDatabase');
    return false;
  }

  try {
    // 1. Verificar se usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.warn('Usuário não autenticado no Supabase');
      return false;
    }

    // 2. Buscar token do localStorage
    const fbToken = localStorage.getItem('fb_access_token');
    const fbAuthDataStr = localStorage.getItem('fb_auth_data');
    
    if (!fbToken) {
      console.warn('Token do Facebook não encontrado no localStorage');
      return false;
    }

    // 3. Extrair dados adicionais se disponíveis
    let fbUserId = 'unknown';
    let fbUserName = 'Usuário Facebook';
    let expiresIn = 5184000; // 60 dias padrão

    if (fbAuthDataStr) {
      try {
        const fbAuthData = JSON.parse(fbAuthDataStr);
        fbUserId = fbAuthData.user?.id || fbAuthData.userID || 'unknown';
        fbUserName = fbAuthData.user?.name || fbAuthData.userName || 'Usuário Facebook';
        expiresIn = fbAuthData.expiresIn || 5184000;
      } catch (e) {
        console.warn('Erro ao parsear fb_auth_data:', e);
      }
    }

    // 4. Calcular data de expiração
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

    // 5. Salvar/atualizar no banco
    const { error: upsertError } = await supabase
      .from('facebook_connections')
      .upsert({
        user_id: user.id,
        facebook_user_id: fbUserId,
        facebook_name: fbUserName,
        access_token: fbToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Erro ao sincronizar token:', upsertError);
      return false;
    }

    console.log('✅ Token do Facebook sincronizado com o banco de dados');
    return true;

  } catch (error) {
    console.error('Erro ao sincronizar token do Facebook:', error);
    return false;
  }
}

/**
 * Verifica se existe conexão do Facebook no banco de dados
 */
export async function checkFacebookConnectionInDatabase(): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const userId = await getCurrentSessionUserId();
    if (!userId) return false;

    const { data, error } = await supabase
      .from('facebook_connections')
      .select('id, token_expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;

    // Verificar se não expirou
    if (new Date(data.token_expires_at) < new Date()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
