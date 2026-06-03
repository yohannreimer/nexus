import { calculateTotals } from './platformMetrics';
import type { AdPlatform, PlatformInsight, PlatformInsightTotals, PlatformInsightsResponse } from './platformTypes';

export type ClientAnalysisAccountInput = {
  accountId: string;
  accountName: string;
  platform: AdPlatform;
  insights: PlatformInsight[];
  dailyData: PlatformInsightsResponse['dailyData'];
};

export type ClientAnalysisError = {
  accountName: string;
  platform: AdPlatform;
  message: string;
};

export type ClientAnalysisAccountRow = PlatformInsightTotals & {
  accountId: string;
  accountName: string;
  platform: AdPlatform;
  campaigns: number;
};

export type ClientAnalysisPlatformRow = PlatformInsightTotals & {
  platform: AdPlatform;
  accounts: number;
  campaigns: number;
};

export type ClientAnalysisCampaignRow = PlatformInsight & {
  accountName: string;
};

export type ClientAnalysisDailyRow = {
  date: string;
  dateFormatted: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
};

export type ClientAnalysisModel = {
  totals: PlatformInsightTotals;
  accountRows: ClientAnalysisAccountRow[];
  platformRows: ClientAnalysisPlatformRow[];
  campaignRows: ClientAnalysisCampaignRow[];
  dailyRows: ClientAnalysisDailyRow[];
  errors: ClientAnalysisError[];
};

export function buildClientAnalysisModel(
  accounts: ClientAnalysisAccountInput[],
  errors: ClientAnalysisError[],
): ClientAnalysisModel {
  const allInsights = accounts.flatMap((account) => account.insights);
  const accountRows = accounts.map((account) => ({
    ...calculateTotals(account.insights),
    accountId: account.accountId,
    accountName: account.accountName,
    platform: account.platform,
    campaigns: account.insights.length,
  })).sort((a, b) => b.spend - a.spend);

  const platformRows = (['meta', 'google'] as AdPlatform[])
    .map((platform) => {
      const platformAccounts = accounts.filter((account) => account.platform === platform);
      const platformInsights = platformAccounts.flatMap((account) => account.insights);
      return {
        ...calculateTotals(platformInsights),
        platform,
        accounts: platformAccounts.length,
        campaigns: platformInsights.length,
      };
    })
    .filter((row) => row.accounts > 0 || row.campaigns > 0);

  const accountNameByKey = new Map(accounts.map((account) => [`${account.platform}:${account.accountId}`, account.accountName]));
  const campaignRows = allInsights
    .map((insight) => ({
      ...insight,
      accountName: accountNameByKey.get(`${insight.platform}:${insight.accountId}`) || insight.accountId,
    }))
    .sort((a, b) => b.spend - a.spend);

  return {
    totals: calculateTotals(allInsights),
    accountRows,
    platformRows,
    campaignRows,
    dailyRows: buildDailyRows(accounts),
    errors,
  };
}

function buildDailyRows(accounts: ClientAnalysisAccountInput[]): ClientAnalysisDailyRow[] {
  const byDate = new Map<string, ClientAnalysisDailyRow>();

  accounts.flatMap((account) => account.dailyData || []).forEach((day) => {
    const current = byDate.get(day.date) || {
      date: day.date,
      dateFormatted: day.dateFormatted || day.date,
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      conversions: 0,
    };

    current.spend += day.spend;
    current.impressions += day.impressions;
    current.clicks += day.clicks;
    current.conversions += day.conversions || 0;
    current.ctr = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0;
    current.cpc = current.clicks > 0 ? current.spend / current.clicks : 0;
    byDate.set(day.date, current);
  });

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
