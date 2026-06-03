import type { AdAccount, AdAccountStatus } from '../types';
import type { ClientWorkspaceSummary } from './clientWorkspaceTypes';
import type { PlatformAccount } from './platformTypes';

export function getAdAccountApiId(account: Pick<AdAccount, 'id' | 'externalAccountId'>): string {
  return account.externalAccountId || account.id;
}

export function mapPlatformAccountToAdAccount(account: PlatformAccount): AdAccount {
  return {
    platform: account.platform,
    externalAccountId: account.externalAccountId,
    id: account.externalAccountId,
    name: account.name,
    currency: account.currency || 'BRL',
    accountStatus: (Number(account.status) || 1) as AdAccountStatus,
    isConfigured: account.isConfigured,
    whatsappTarget: account.whatsappTarget,
    selectedCampaignIds: account.selectedCampaignIds,
    lastReportSent: account.lastReportSent || undefined,
  };
}

export function getFirstReportAccountForClient(
  summary: ClientWorkspaceSummary,
  accounts: AdAccount[],
): AdAccount | null {
  const linkedAccounts = summary.linkedAccounts
    .filter((link) => link.isActive)
    .map((link) => link.account)
    .filter((account): account is PlatformAccount => Boolean(account));

  const externalIds = new Set(linkedAccounts.map((account) => account.externalAccountId));
  const matchedAccount = accounts.find((account) => externalIds.has(getAdAccountApiId(account)));
  if (matchedAccount) {
    return {
      ...matchedAccount,
      id: getAdAccountApiId(matchedAccount),
      externalAccountId: getAdAccountApiId(matchedAccount),
    };
  }

  const firstLinkedAccount = linkedAccounts[0];
  return firstLinkedAccount ? mapPlatformAccountToAdAccount(firstLinkedAccount) : null;
}
