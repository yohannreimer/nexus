import { AdPlatform, PlatformInsight, PlatformInsightTotals } from './platformTypes';

export function microsToCurrency(value: string | number | null | undefined): number {
  const numeric = typeof value === 'string' ? Number(value) : value ?? 0;
  if (!Number.isFinite(numeric)) return 0;
  return numeric / 1_000_000;
}

export function calculateTotals(insights: PlatformInsight[]): PlatformInsightTotals {
  const spend = insights.reduce((sum, item) => sum + item.spend, 0);
  const impressions = insights.reduce((sum, item) => sum + item.impressions, 0);
  const clicks = insights.reduce((sum, item) => sum + item.clicks, 0);
  const conversions = insights.reduce((sum, item) => sum + item.conversions, 0);
  const conversionValue = insights.reduce((sum, item) => sum + (item.conversionValue ?? 0), 0);

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

export function groupTotalsByPlatform(insights: PlatformInsight[]): Record<AdPlatform, PlatformInsightTotals | undefined> {
  return {
    meta: calculateTotals(insights.filter((item) => item.platform === 'meta')),
    google: calculateTotals(insights.filter((item) => item.platform === 'google')),
  };
}
