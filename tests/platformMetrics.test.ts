import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTotals, groupTotalsByPlatform, microsToCurrency } from '../services/platformMetrics';
import { PlatformInsight } from '../services/platformTypes';

test('microsToCurrency converts Google Ads micros to currency units', () => {
  assert.equal(microsToCurrency('12345678'), 12.345678);
  assert.equal(microsToCurrency(5000000), 5);
  assert.equal(microsToCurrency(null), 0);
});

test('calculateTotals derives blended paid media metrics', () => {
  const rows: PlatformInsight[] = [
    {
      platform: 'meta',
      accountId: 'act_1',
      spend: 100,
      impressions: 10000,
      clicks: 250,
      ctr: 2.5,
      cpc: 0.4,
      cpm: 10,
      conversions: 10,
      costPerConversion: 10,
      conversionValue: 300,
      roas: 3,
    },
    {
      platform: 'google',
      accountId: '1234567890',
      spend: 50,
      impressions: 5000,
      clicks: 100,
      ctr: 2,
      cpc: 0.5,
      cpm: 10,
      conversions: 5,
      costPerConversion: 10,
      conversionValue: 100,
      roas: 2,
    },
  ];

  const totals = calculateTotals(rows);
  assert.equal(totals.spend, 150);
  assert.equal(totals.impressions, 15000);
  assert.equal(totals.clicks, 350);
  assert.equal(totals.conversions, 15);
  assert.equal(totals.ctr, (350 / 15000) * 100);
  assert.equal(totals.costPerConversion, 10);
  assert.equal(totals.roas, 400 / 150);
});

test('groupTotalsByPlatform separates Meta and Google totals', () => {
  const rows: PlatformInsight[] = [
    baseInsight('meta', 100),
    baseInsight('google', 40),
    baseInsight('google', 60),
  ];

  const grouped = groupTotalsByPlatform(rows);
  assert.equal(grouped.meta?.spend, 100);
  assert.equal(grouped.google?.spend, 100);
});

function baseInsight(platform: 'meta' | 'google', spend: number): PlatformInsight {
  return {
    platform,
    accountId: platform === 'meta' ? 'act_1' : '1234567890',
    spend,
    impressions: 1000,
    clicks: 50,
    ctr: 5,
    cpc: spend / 50,
    cpm: spend,
    conversions: 2,
    costPerConversion: spend / 2,
    conversionValue: spend * 3,
    roas: 3,
  };
}
