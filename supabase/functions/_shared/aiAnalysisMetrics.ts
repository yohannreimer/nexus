export type AiMetricPlatform = 'meta' | 'google';

export type AiMetricInsight = {
  platform: AiMetricPlatform;
  accountId: string;
  campaignId: string | null;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number | null;
  conversionValue: number;
  roas: number | null;
};

export type AiMetricDailyRow = {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type AiMetricAccountInput = {
  accountId: string;
  accountName: string;
  platform: AiMetricPlatform;
  insights: AiMetricInsight[];
  dailyData: AiMetricDailyRow[];
};

export type AiMetricError = {
  accountName: string;
  platform: AiMetricPlatform;
  message: string;
};

export type AiMetricTotals = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number | null;
  conversionValue: number;
  roas: number | null;
};

export function normalizeProviderInsight(row: Record<string, unknown>, platform: AiMetricPlatform, accountId: string): AiMetricInsight {
  const spend = numberValue(row.spend);
  const conversions = numberValue(row.conversions)
    || numberValue(row.leads) + numberValue(row.purchases) + numberValue(row.messaging);
  const conversionValue = numberValue(row.conversionValue);

  return {
    platform,
    accountId,
    campaignId: readOptionalString(row.campaignId || row.campaign_id),
    campaignName: readOptionalString(row.campaignName || row.campaign_name) || 'Campanha sem nome',
    spend,
    impressions: integerValue(row.impressions),
    clicks: integerValue(row.clicks),
    ctr: numberValue(row.ctr),
    cpc: numberValue(row.cpc),
    cpm: numberValue(row.cpm),
    conversions,
    costPerConversion: row.costPerConversion || row.cost_per_conversion
      ? numberValue(row.costPerConversion || row.cost_per_conversion)
      : conversions > 0 ? spend / conversions : null,
    conversionValue,
    roas: row.roas ? numberValue(row.roas) : spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
  };
}

export function buildAiAnalysisMetrics(accounts: AiMetricAccountInput[], errors: AiMetricError[]) {
  const allInsights = accounts.flatMap((account) => account.insights);
  const totals = calculateTotals(allInsights);

  const accountRows = accounts.map((account) => ({
    ...calculateTotals(account.insights),
    accountId: account.accountId,
    accountName: account.accountName,
    platform: account.platform,
    campaigns: account.insights.length,
  })).sort((a, b) => b.spend - a.spend);

  const platformRows = (['meta', 'google'] as AiMetricPlatform[])
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
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 25);

  return {
    totals,
    accountRows,
    platformRows,
    campaignRows,
    dailyRows: buildDailyRows(accounts),
    errors,
    dataQuality: {
      hasLiveMetrics: allInsights.length > 0 && (totals.spend > 0 || totals.impressions > 0 || totals.clicks > 0),
      accountCount: accounts.length,
      campaignCount: allInsights.length,
      errorCount: errors.length,
    },
  };
}

function calculateTotals(insights: AiMetricInsight[]): AiMetricTotals {
  const spend = insights.reduce((sum, item) => sum + item.spend, 0);
  const impressions = insights.reduce((sum, item) => sum + item.impressions, 0);
  const clicks = insights.reduce((sum, item) => sum + item.clicks, 0);
  const conversions = insights.reduce((sum, item) => sum + item.conversions, 0);
  const conversionValue = insights.reduce((sum, item) => sum + item.conversionValue, 0);

  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    conversions,
    costPerConversion: conversions > 0 ? spend / conversions : null,
    conversionValue,
    roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
  };
}

function buildDailyRows(accounts: AiMetricAccountInput[]): AiMetricDailyRow[] {
  const byDate = new Map<string, AiMetricDailyRow>();

  accounts.flatMap((account) => account.dailyData || []).forEach((day) => {
    if (!day.date) return;
    const current = byDate.get(day.date) || {
      date: day.date,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };

    current.spend += numberValue(day.spend);
    current.impressions += integerValue(day.impressions);
    current.clicks += integerValue(day.clicks);
    current.conversions += numberValue(day.conversions);
    byDate.set(day.date, current);
  });

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function integerValue(value: unknown): number {
  const numeric = numberValue(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function numberValue(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}
