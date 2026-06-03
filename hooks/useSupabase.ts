/**
 * useSupabase Hook - Versão Simplificada
 * Hook React para gerenciar conexão Facebook via Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isSupabaseConfigured,
  FacebookConnection,
  getFacebookConnection,
  saveFacebookConnection,
  disconnectFacebook,
  getClients,
  migrateFromLocalStorage,
  getOrCreateAgency,
} from '../services/supabase';

interface UseSupabaseReturn {
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Facebook
  facebookConnection: FacebookConnection | null;
  adAccounts: unknown[];
  clients: unknown[];
  templates: unknown[];
  connectFacebook: (facebookUserId: string, facebookUserName: string, accessToken: string, expiresIn: number) => Promise<boolean>;
  disconnectFacebookAccount: () => Promise<boolean>;
  migrateData: () => Promise<{ success: boolean; migrated: { connection: boolean; accounts: number; clients: number; templates: number } }>;
  
  // Refresh
  refreshAll: () => Promise<void>;
}

export function useSupabase(): UseSupabaseReturn {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facebookConnection, setFacebookConnection] = useState<FacebookConnection | null>(null);
  const [adAccounts] = useState<unknown[]>([]);
  const [clients, setClients] = useState<unknown[]>([]);
  const [templates] = useState<unknown[]>([]);

  // Verifica se Supabase está configurado
  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Busca conexão Facebook
      const connection = await getFacebookConnection();
      const loadedClients = await getClients();
      setFacebookConnection(connection);
      setClients(loadedClients);
      console.log('📦 Conexão Facebook carregada:', connection ? 'SIM' : 'NÃO');

    } catch (err: any) {
      console.warn('Dados legados Supabase indisponíveis:', err?.message || err);
      setFacebookConnection(null);
      setClients([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Conectar Facebook
  const connectFacebook = useCallback(async (
    facebookUserId: string,
    facebookUserName: string,
    accessToken: string,
    expiresIn: number
  ): Promise<boolean> => {
    try {
      console.log('🔄 useSupabase.connectFacebook chamado');
      
      const connection = await saveFacebookConnection(
        facebookUserId,
        facebookUserName,
        accessToken,
        expiresIn
      );

      if (!connection) {
        console.error('❌ saveFacebookConnection retornou null');
        return false;
      }

      setFacebookConnection(connection);
      console.log('✅ useSupabase.connectFacebook sucesso');
      return true;
    } catch (err) {
      console.error('Erro ao conectar Facebook:', err);
      return false;
    }
  }, []);

  // Desconectar Facebook
  const disconnectFacebookAccount = useCallback(async (): Promise<boolean> => {
    const success = await disconnectFacebook();
    if (success) {
      setFacebookConnection(null);
    }
    return success;
  }, []);

  // Refresh All
  const refreshAll = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const migrateData = useCallback(async () => {
    const emptyResult = {
      success: false,
      migrated: { connection: false, accounts: 0, clients: 0, templates: 0 }
    };

    try {
      const agency = await getOrCreateAgency();
      if (!agency) return emptyResult;
      return migrateFromLocalStorage(agency.id);
    } catch (err) {
      console.error('Erro ao migrar dados:', err);
      return emptyResult;
    }
  }, []);

  return {
    isConfigured,
    isLoading,
    error,
    facebookConnection,
    adAccounts,
    clients,
    templates,
    connectFacebook,
    disconnectFacebookAccount,
    migrateData,
    refreshAll,
  };
}

export default useSupabase;
