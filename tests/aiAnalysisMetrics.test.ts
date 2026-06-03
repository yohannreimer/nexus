import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAiAnalysisMetrics,
  normalizeProviderInsight,
} from '../supabase/functions/_shared/aiAnalysisMetrics';

test('normalizeProviderInsight converts Meta action metrics into conversions', () => {
  const insight = normalizeProviderInsight({
    campaignId: 'cmp-1',
    campaignName: 'Meta Leads',
    spend: 100,
    impressions: 1000,
    clicks: 50,
    ctr: 5,
    cpc: 2,
    cpm: 100,
    leads: 3,
    purchases: 1,
    messaging: 2,
  }, 'meta', 'act_1');

  assert.equal(insight.conversions, 6);
  assert.equal(insight.costPerConversion, 100 / 6);
});

test('buildAiAnalysisMetrics consolidates totals, platforms, accounts, campaigns and daily rows', () => {
  const metrics = buildAiAnalysisMetrics([
    {
      accountId: 'act_1',
      accountName: 'Meta Conta',
      platform: 'meta',
      insights: [
        normalizeProviderInsight({
          campaignId: 'm1',
          campaignName: 'Meta Campanha',
          spend: 100,
          impressions: 1000,
          clicks: 50,
          leads: 5,
        }, 'meta', 'act_1'),
      ],
      dailyData: [{ date: '2026-05-01', spend: 100, impressions: 1000, clicks: 50, conversions: 5 }],
    },
    {
      accountId: '123',
      accountName: 'Google Conta',
      platform: 'google',
      insights: [
        normalizeProviderInsight({
          campaignId: 'g1',
          campaignName: 'Google Campanha',
          spend: 50,
          impressions: 500,
          clicks: 25,
          conversions: 2,
        }, 'google', '123'),
      ],
      dailyData: [{ date: '2026-05-01', spend: 50, impressions: 500, clicks: 25, conversions: 2 }],
    },
  ], []);

  assert.equal(metrics.totals.spend, 150);
  assert.equal(metrics.totals.impressions, 1500);
  assert.equal(metrics.totals.clicks, 75);
  assert.equal(metrics.totals.conversions, 7);
  assert.equal(metrics.accountRows.length, 2);
  assert.equal(metrics.platformRows.length, 2);
  assert.equal(metrics.campaignRows[0].campaignName, 'Meta Campanha');
  assert.equal(metrics.dailyRows[0].spend, 150);
});

test('buildAiAnalysisMetrics preserves account fetch errors for the AI prompt', () => {
  const metrics = buildAiAnalysisMetrics([], [
    { accountName: 'Conta X', platform: 'google', message: 'Google Ads API request failed' },
  ]);

  assert.equal(metrics.errors.length, 1);
  assert.equal(metrics.dataQuality.hasLiveMetrics, false);
});
