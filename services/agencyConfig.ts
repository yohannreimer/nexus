import { callNexusApi } from './nexusApi';
import { isPublicEnvEnabled } from './publicEnv';

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

type DbAgencyConfig = {
  name?: string | null;
  logo?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  cnpj?: string | null;
  default_send_time?: string | null;
  webhook_url?: string | null;
  report_footer?: string | null;
};

export const defaultAgencyConfig: AgencyConfig = {
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
  reportFooter: 'Relatório gerado automaticamente por {{agency_name}}',
};

export async function getAgencyConfig(): Promise<AgencyConfig | null> {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    const result = await callNexusApi<{ data: DbAgencyConfig | null }>('/api/workspace/agency-settings');
    return result.data ? mapAgencyConfig(result.data) : null;
  }

  const legacy = await import('./supabase');
  return legacy.getAgencyConfig();
}

export async function saveAgencyConfig(config: AgencyConfig): Promise<{ success: boolean; error?: string }> {
  if (isPublicEnvEnabled('VITE_PRYMEIRA_AUTH_ENABLED')) {
    await callNexusApi('/api/workspace/agency-settings', { method: 'PUT', body: config });
    return { success: true };
  }

  const legacy = await import('./supabase');
  return legacy.saveAgencyConfig(config);
}

function mapAgencyConfig(row: DbAgencyConfig): AgencyConfig {
  return {
    name: row.name || '',
    logo: row.logo || '',
    primaryColor: row.primary_color || defaultAgencyConfig.primaryColor,
    secondaryColor: row.secondary_color || defaultAgencyConfig.secondaryColor,
    email: row.email || '',
    phone: row.phone || '',
    website: row.website || '',
    address: row.address || '',
    cnpj: row.cnpj || '',
    defaultSendTime: row.default_send_time || defaultAgencyConfig.defaultSendTime,
    webhookUrl: row.webhook_url || '',
    reportFooter: row.report_footer || defaultAgencyConfig.reportFooter,
  };
}
