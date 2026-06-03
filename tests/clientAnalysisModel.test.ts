import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClientAnalysisModel } from '../services/clientAnalysisModel';
import type { PlatformInsight } from '../services/platformTypes';

test('buildClientAnalysisModel consolidates metrics across multiple linked accounts', () => {
  const model = buildClientAnalysisModel([
    {
      accountId: 'act_1',
      accountName: 'Meta Loja',
      platform: 'meta',
      insights: [
        insight('meta', 'act_1', 'Campanha Meta', 100, 1000, 50, 5),
      ],
      dailyData: [
        daily('meta', '2026-05-14', 100, 1000, 50, 5),
      ],
    },
    {
      accountId: '2276917403',
      accountName: 'Google Loja',
      platform: 'google',
      insights: [
        insight('google', '2276917403', 'Campanha Google', 50, 500, 25, 2),
      ],
      dailyData: [
        daily('google', '2026-05-14', 50, 500, 25, 2),
      ],
    },
  ], []);

  assert.equal(model.totals.spend, 150);
  assert.equal(model.totals.impressions, 1500);
  assert.equal(model.totals.clicks, 75);
  assert.equal(model.totals.conversions, 7);
  assert.equal(model.accountRows.length, 2);
  assert.equal(model.platformRows.find((row) => row.platform === 'meta')?.spend, 100);
  assert.equal(model.platformRows.find((row) => row.platform === 'google')?.spend, 50);
  assert.equal(model.dailyRows[0].spend, 150);
  assert.equal(model.campaignRows[0].accountName, 'Meta Loja');
  assert.equal(model.campaignRows[1].accountName, 'Google Loja');
});

test('buildClientAnalysisModel keeps partial data when one account fails', () => {
  const model = buildClientAnalysisModel([
    {
      accountId: 'act_1',
      accountName: 'Meta Loja',
      platform: 'meta',
      insights: [insight('meta', 'act_1', 'Campanha Meta', 100, 1000, 50, 5)],
      dailyData: [],
    },
  ], [{ accountName: 'Google Loja', platform: 'google', message: 'Google Ads API request failed' }]);

  assert.equal(model.totals.spend, 100);
  assert.equal(model.errors.length, 1);
  assert.equal(model.errors[0].accountName, 'Google Loja');
});

function insight(
  platform: 'meta' | 'google',
  accountId: string,
  campaignName: string,
  spend: number,
  impressions: number,
  clicks: number,
  conversions: number,
): PlatformInsight {
  return {
    platform,
    accountId,
    campaignName,
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    conversions,
    costPerConversion: conversions > 0 ? spend / conversions : null,
    conversionValue: null,
    roas: null,
  };
}

function daily(
  platform: 'meta' | 'google',
  date: string,
  spend: number,
  impressions: number,
  clicks: number,
  conversions: number,
) {
  return {
    platform,
    date,
    dateFormatted: date.slice(5),
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    conversions,
  };
}
