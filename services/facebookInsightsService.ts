/**
 * Facebook Insights Service
 * Busca métricas de campanhas, adsets e ads usando a Marketing API
 */

import axios from 'axios';

interface InsightMetrics {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  actions?: Array<{ action_type: string; value: string }>;
  conversions?: Array<{ action_type: string; value: string }>;
}

interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  metrics: InsightMetrics;
  adsets?: AdsetInsight[];
}

interface AdsetInsight {
  adset_id: string;
  adset_name: string;
  metrics: InsightMetrics;
  ads?: AdInsight[];
}

interface AdInsight {
  ad_id: string;
  ad_name: string;
  metrics: InsightMetrics;
}

interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

export class FacebookInsightsService {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v23.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Busca insights de todas as campanhas de uma conta
   */
  async getCampaignInsights(
    accountId: string,
    dateRange: DateRange,
    includeHierarchy = false
  ): Promise<CampaignInsight[]> {
    const insightFields = [
      'campaign_id',
      'campaign_name',
      'impressions',
      'reach',
      'clicks',
      'spend',
      'ctr',
      'cpc',
      'cpm',
      'frequency',
      'actions',
      'conversions'
    ].join(',');

    const timeRange = `{"since":"${dateRange.since}","until":"${dateRange.until}"}`;

    // Busca insights das campanhas
    const insightsUrl = `${this.baseUrl}/act_${accountId}/insights?fields=${insightFields}&time_range=${encodeURIComponent(timeRange)}&level=campaign&access_token=${this.accessToken}&limit=100`;
    const insightsResponse = await axios.get(insightsUrl);
    const insightsData = insightsResponse.data.data || [];

    // Busca lista de campanhas com objetivos (campo objective só vem da API de campaigns)
    const campaignsUrl = `${this.baseUrl}/act_${accountId}/campaigns?fields=id,name,objective&limit=100&access_token=${this.accessToken}`;
    const campaignsResponse = await axios.get(campaignsUrl);
    const campaignsList = campaignsResponse.data.data || [];
    
    // Cria mapa de campaign_id -> objective
    const objectivesMap: Record<string, string> = {};
    campaignsList.forEach((c: any) => {
      objectivesMap[c.id] = c.objective || 'UNKNOWN';
    });

    const campaigns: CampaignInsight[] = insightsData.map((item: any) => ({
      campaign_id: item.campaign_id,
      campaign_name: item.campaign_name,
      objective: objectivesMap[item.campaign_id] || 'UNKNOWN',
      metrics: this.normalizeMetrics(item),
      adsets: []
    }));

    // Se solicitado, busca adsets e ads de cada campanha
    if (includeHierarchy) {
      for (const campaign of campaigns) {
        campaign.adsets = await this.getAdsetInsights(campaign.campaign_id, dateRange, true);
      }
    }

    return campaigns;
  }

  /**
   * Busca insights de adsets de uma campanha
   */
  async getAdsetInsights(
    campaignId: string,
    dateRange: DateRange,
    includeAds = false
  ): Promise<AdsetInsight[]> {
    const fields = [
      'adset_id',
      'adset_name',
      'impressions',
      'reach',
      'clicks',
      'spend',
      'ctr',
      'cpc',
      'cpm',
      'frequency',
      'actions',
      'conversions'
    ].join(',');

    const timeRange = `{"since":"${dateRange.since}","until":"${dateRange.until}"}`;

    const url = `${this.baseUrl}/${campaignId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=adset&access_token=${this.accessToken}`;

    const response = await axios.get(url);
    const data = response.data;
    const adsets: AdsetInsight[] = data.data.map((item: any) => ({
      adset_id: item.adset_id,
      adset_name: item.adset_name,
      metrics: this.normalizeMetrics(item),
      ads: []
    }));

    // Se solicitado, busca ads de cada adset
    if (includeAds) {
      for (const adset of adsets) {
        adset.ads = await this.getAdInsights(adset.adset_id, dateRange);
      }
    }

    return adsets;
  }

  /**
   * Busca insights de ads de um adset
   */
  async getAdInsights(adsetId: string, dateRange: DateRange): Promise<AdInsight[]> {
    const fields = [
      'ad_id',
      'ad_name',
      'impressions',
      'reach',
      'clicks',
      'spend',
      'ctr',
      'cpc',
      'cpm',
      'frequency',
      'actions',
      'conversions'
    ].join(',');

    const timeRange = `{"since":"${dateRange.since}","until":"${dateRange.until}"}`;

    const url = `${this.baseUrl}/${adsetId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=ad&access_token=${this.accessToken}`;

    const response = await axios.get(url);
    const data = response.data;
    return data.data.map((item: any) => ({
      ad_id: item.ad_id,
      ad_name: item.ad_name,
      metrics: this.normalizeMetrics(item)
    }));
  }

  /**
   * Normaliza métricas retornadas pela API
   */
  private normalizeMetrics(raw: any): InsightMetrics {
    // Helper para garantir números válidos
    const safeInt = (val: any): number => {
      if (val === null || val === undefined) return 0;
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    const safeFloat = (val: any): number => {
      if (val === null || val === undefined) return 0;
      const parsed = parseFloat(String(val));
      return isNaN(parsed) ? 0 : parsed;
    };

    return {
      impressions: safeInt(raw.impressions),
      reach: safeInt(raw.reach),
      clicks: safeInt(raw.clicks),
      spend: safeFloat(raw.spend),
      ctr: safeFloat(raw.ctr),
      cpc: safeFloat(raw.cpc),
      cpm: safeFloat(raw.cpm),
      frequency: safeFloat(raw.frequency),
      actions: Array.isArray(raw.actions) ? raw.actions : [],
      conversions: Array.isArray(raw.conversions) ? raw.conversions : []
    };
  }

  /**
   * Helper: Retorna date range para "hoje"
   */
  static getTodayRange(): DateRange {
    const today = new Date().toISOString().split('T')[0];
    return { since: today, until: today };
  }

  /**
   * Helper: Retorna date range para "últimos N dias"
   */
  static getLastNDaysRange(days: number): DateRange {
    const until = new Date();
    const since = new Date();
    since.setDate(since.getDate() - days);

    return {
      since: since.toISOString().split('T')[0],
      until: until.toISOString().split('T')[0]
    };
  }

  /**
   * Helper: Extrai valor de uma action específica
   */
  static getActionValue(metrics: InsightMetrics | null | undefined, actionType: string): number {
    if (!metrics || !metrics.actions || !Array.isArray(metrics.actions)) return 0;
    const action = metrics.actions.find(a => a && a.action_type === actionType);
    if (!action || !action.value) return 0;
    const parsed = parseInt(String(action.value), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Helper: Extrai valor de uma conversão específica
   */
  static getConversionValue(metrics: InsightMetrics | null | undefined, actionType: string): number {
    if (!metrics || !metrics.conversions || !Array.isArray(metrics.conversions)) return 0;
    const conversion = metrics.conversions.find(c => c && c.action_type === actionType);
    if (!conversion || !conversion.value) return 0;
    const parsed = parseInt(String(conversion.value), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}
