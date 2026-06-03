import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdAccountApiId, getFirstReportAccountForClient, mapPlatformAccountToAdAccount } from '../services/adAccountAdapters';
import type { AdAccount } from '../types';
import type { AgencyClientAccountLink, ClientWorkspaceSummary } from '../services/clientWorkspaceTypes';
import type { PlatformAccount } from '../services/platformTypes';

test('mapPlatformAccountToAdAccount uses external id for report API calls', () => {
  const result = mapPlatformAccountToAdAccount(platformAccount('db-uuid', 'google', '2276917403'));

  assert.equal(result.id, '2276917403');
  assert.equal(result.externalAccountId, '2276917403');
});

test('getFirstReportAccountForClient falls back to linked account external id', () => {
  const summary = clientSummary([
    link('link-1', 'client-1', 'db-uuid', 'google', platformAccount('db-uuid', 'google', '2276917403')),
  ]);

  const result = getFirstReportAccountForClient(summary, []);

  assert.equal(result?.id, '2276917403');
  assert.equal(result?.externalAccountId, '2276917403');
  assert.equal(result?.platform, 'google');
});

test('getFirstReportAccountForClient normalizes matched cached account ids', () => {
  const summary = clientSummary([
    link('link-1', 'client-1', 'db-uuid', 'google', platformAccount('db-uuid', 'google', '2276917403')),
  ]);
  const cached: AdAccount = {
    id: 'db-uuid',
    externalAccountId: '2276917403',
    platform: 'google',
    name: 'Google Ads',
    currency: 'BRL',
    accountStatus: 1,
    isConfigured: false,
  };

  const result = getFirstReportAccountForClient(summary, [cached]);

  assert.equal(getAdAccountApiId(result!), '2276917403');
  assert.equal(result?.id, '2276917403');
});

function platformAccount(id: string, platform: 'meta' | 'google', externalAccountId: string): PlatformAccount {
  return {
    id,
    platform,
    externalAccountId,
    name: platform === 'google' ? 'Google Ads' : 'Meta Ads',
    currency: 'BRL',
    status: 'active',
    isConfigured: false,
    selectedCampaignIds: [],
  };
}

function clientSummary(links: AgencyClientAccountLink[]): ClientWorkspaceSummary {
  return {
    client: {
      id: 'client-1',
      userId: 'user-1',
      name: 'Cliente A',
      status: 'active',
      primaryWhatsapp: null,
      internalOwner: null,
      notes: null,
      metadata: {},
      createdAt: '2026-05-15T00:00:00.000Z',
      updatedAt: '2026-05-15T00:00:00.000Z',
    },
    settings: null,
    linkedAccounts: links,
    accountCount: links.length,
    metaAccountCount: links.filter((item) => item.platform === 'meta').length,
    googleAccountCount: links.filter((item) => item.platform === 'google').length,
    nextSendLabel: 'Não configurado',
    health: 'automation_off',
  };
}

function link(
  id: string,
  clientId: string,
  accountId: string,
  platform: 'meta' | 'google',
  account: PlatformAccount,
): AgencyClientAccountLink {
  return {
    id,
    userId: 'user-1',
    clientId,
    accountId,
    platform,
    account,
    isActive: true,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  };
}
