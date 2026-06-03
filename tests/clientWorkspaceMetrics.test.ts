import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClientPlatformBreakdown, calculateClientTotals } from '../services/clientWorkspaceMetrics';
import type { PlatformInsight } from '../services/platformTypes';

test('calculateClientTotals blends Meta and Google metrics from linked accounts', () => {
  const rows: PlatformInsight[] = [
    insight('meta', 'act_1', 100, 10000, 200, 10, 300),
    insight('google', '123', 50, 5000, 100, 5, 150),
  ];

  const totals = calculateClientTotals(rows);

  assert.equal(totals.spend, 150);
  assert.equal(totals.impressions, 15000);
  assert.equal(totals.clicks, 300);
  assert.equal(totals.conversions, 15);
  assert.equal(totals.ctr, 2);
  assert.equal(totals.cpc, 0.5);
  assert.equal(totals.cpm, 10);
  assert.equal(totals.conversionValue, 450);
  assert.equal(totals.roas, 3);
});

test('buildClientPlatformBreakdown returns totals per platform', () => {
  const rows: PlatformInsight[] = [
    insight('meta', 'act_1', 100, 10000, 200, 10, 300),
    insight('google', '123', 50, 5000, 100, 5, 150),
    insight('google', '456', 20, 1000, 20, 1, 20),
  ];

  const breakdown = buildClientPlatformBreakdown(rows);

  assert.equal(breakdown.meta?.spend, 100);
  assert.equal(breakdown.google?.spend, 70);
  assert.equal(breakdown.google?.clicks, 120);
});

function insight(
  platform: 'meta' | 'google',
  accountId: string,
  spend: number,
  impressions: number,
  clicks: number,
  conversions: number,
  conversionValue: number,
): PlatformInsight {
  return {
    platform,
    accountId,
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    conversions,
    costPerConversion: conversions > 0 ? spend / conversions : null,
    conversionValue,
    roas: spend > 0 ? conversionValue / spend : null,
  };
}
