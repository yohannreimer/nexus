import type { AdPlatform, PlatformAccount, PlatformCampaign, PlatformInsightsResponse } from './platformTypes';
import { getPublicEnv } from './publicEnv';

const API_BASE_URL = getPublicEnv('VITE_NEXUS_API_URL');

export type NexusApiTokenProvider = () => Promise<string | null>;

let tokenProvider: NexusApiTokenProvider | null = null;

export function setNexusApiTokenProvider(provider: NexusApiTokenProvider) {
  tokenProvider = provider;
}

export async function callNexusApi<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
  }
): Promise<T> {
  const token = await tokenProvider?.();
  if (!token) {
    throw new Error('Sessão Prymeira não disponível');
  }

  const method = options?.method || 'GET';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = await response.json().catch(() => null) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error(json && 'error' in json && json.error ? json.error : `Erro na API Nexus ${response.status}`);
  }

  return json as T;
}

export async function saveWorkspaceAdConnection(input: {
  platform: 'meta' | 'google';
  externalUserId?: string | null;
  externalUserName?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
}): Promise<{ ok: boolean; workspace_id: string; connection_id?: string }> {
  return callNexusApi('/api/workspace/ad-connections', { method: 'POST', body: input });
}

export async function getWorkspacePlatformLoginUrl(
  platform: AdPlatform,
  redirectTo?: string,
): Promise<{ loginUrl: string; expiresAt?: string }> {
  const params = new URLSearchParams();
  if (redirectTo) params.set('redirect_to', redirectTo);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return callNexusApi(`/api/workspace/oauth/${platform}/login-url${suffix}`);
}

export async function fetchWorkspacePlatformCampaigns(
  platform: AdPlatform,
  accountId: string,
): Promise<PlatformCampaign[]> {
  const params = new URLSearchParams({ platform, account_id: accountId });
  const result = await callNexusApi<{ data: PlatformCampaign[] }>(`/api/workspace/platform-campaigns?${params.toString()}`);
  return result.data;
}

export async function fetchWorkspacePlatformInsights(
  platform: AdPlatform,
  accountId: string,
  options: {
    campaignIds?: string[];
    datePreset?: string;
    dateStart?: string;
    dateEnd?: string;
  } = {},
): Promise<PlatformInsightsResponse> {
  const params = new URLSearchParams({ platform, account_id: accountId });
  if (options.campaignIds?.length) params.set('campaign_ids', options.campaignIds.join(','));
  if (options.datePreset) params.set('date_preset', options.datePreset);
  if (options.dateStart && options.dateEnd) {
    params.set('date_start', options.dateStart);
    params.set('date_end', options.dateEnd);
  }
  return callNexusApi(`/api/workspace/platform-insights?${params.toString()}`);
}

type WorkspacePlatformAccountRow = {
  id: string;
  platform: PlatformAccount['platform'];
  external_account_id: string;
  name: string;
  currency: string | null;
  timezone: string | null;
  status: string | null;
  is_active: boolean | null;
  metadata: Record<string, unknown> | null;
};

export async function fetchWorkspacePlatformAccounts(): Promise<PlatformAccount[]> {
  const result = await callNexusApi<{ data: WorkspacePlatformAccountRow[] }>('/api/workspace/platform-accounts');

  return result.data.map((row) => ({
    id: row.id,
    platform: row.platform,
    externalAccountId: row.external_account_id,
    name: row.name,
    currency: row.currency || 'BRL',
    timezone: row.timezone || undefined,
    status: row.status || 'active',
    isConfigured: Boolean(row.is_active),
    selectedCampaignIds: [],
    metadata: row.metadata || {},
  }));
}
