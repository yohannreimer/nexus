import { calculateTotals, groupTotalsByPlatform } from './platformMetrics';
import type { PlatformInsight, PlatformInsightTotals } from './platformTypes';

export function calculateClientTotals(rows: PlatformInsight[]): PlatformInsightTotals {
  return calculateTotals(rows);
}

export function buildClientPlatformBreakdown(
  rows: PlatformInsight[],
): Partial<Record<'meta' | 'google', PlatformInsightTotals>> {
  return groupTotalsByPlatform(rows);
}
