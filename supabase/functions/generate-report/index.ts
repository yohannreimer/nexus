// Edge Function: generate-report
// Gera relatório usando IA configurada via OpenRouter ou Gemini.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildAiAnalysisMetrics,
  normalizeProviderInsight,
  type AiMetricAccountInput,
  type AiMetricError,
  type AiMetricPlatform,
} from '../_shared/aiAnalysisMetrics.ts'
import { generateInternalAnalysis } from '../_shared/aiProvider.ts'
import { getAiProviderConfig } from '../_shared/aiProviderConfig.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const body = await req.json()

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar usuário
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid or expired token')
    }

    if (body?.type === 'internal_client_analysis') {
      return await handleInternalClientAnalysis(supabase, user.id, body, authHeader)
    }

    const { insights, clientName, templateId, customPrompt } = body

    if (!insights) {
      throw new Error('Missing insights data')
    }

    // Buscar template se especificado
    let template = null
    if (templateId) {
      const { data: templateData } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', user.id)
        .single()
      template = templateData
    }

    // Preparar dados formatados para a IA
    const formattedInsights = formatInsightsForAI(insights)

    // Construir prompt
    const systemPrompt = `Você é um especialista em marketing digital e tráfego pago. 
Sua tarefa é criar relatórios de performance de campanhas de mídia paga.
Os relatórios devem ser:
- Claros e objetivos
- Formatados para WhatsApp (usar emojis, quebras de linha)
- Focados nos resultados e insights acionáveis
- Escritos em português brasileiro
- Máximo de 2000 caracteres`

    const userPrompt = template?.content 
      ? `Use este template como base:\n${template.content}\n\nDados das campanhas:\n${formattedInsights}\n\nCliente: ${clientName || 'Cliente'}`
      : customPrompt 
        ? `${customPrompt}\n\nDados das campanhas:\n${formattedInsights}\n\nCliente: ${clientName || 'Cliente'}`
        : `Crie um relatório de performance para o cliente "${clientName || 'Cliente'}" com base nestes dados:\n\n${formattedInsights}\n\nInclua: resumo geral, métricas principais, destaques positivos, pontos de atenção e recomendações.`

    const generatedReport = await generateClientFacingReport(`${systemPrompt}\n\n${userPrompt}`)

    if (!generatedReport) {
      throw new Error('Failed to generate report')
    }

    return new Response(
      JSON.stringify({ 
        report: generatedReport,
        insights: insights,
        templateUsed: template?.name || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating report:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Helper function para formatar insights
function formatInsightsForAI(insights: any): string {
  const { data, totals, datePreset } = insights

  let formatted = `Período: ${datePreset || 'últimos 7 dias'}\n\n`
  
  formatted += `📊 TOTAIS:\n`
  formatted += `- Investimento: R$ ${totals?.spend?.toFixed(2) || '0.00'}\n`
  formatted += `- Impressões: ${totals?.impressions?.toLocaleString() || 0}\n`
  formatted += `- Cliques: ${totals?.clicks?.toLocaleString() || 0}\n`
  formatted += `- CTR: ${totals?.ctr?.toFixed(2) || 0}%\n`
  formatted += `- CPC: R$ ${totals?.cpc?.toFixed(2) || '0.00'}\n`
  formatted += `- CPM: R$ ${totals?.cpm?.toFixed(2) || '0.00'}\n`
  formatted += `- Conversões: ${totals?.conversions || totals?.leads || totals?.purchases || 0}\n`
  const costPerConversion = totals?.costPerConversion || totals?.costPerLead
  formatted += `- Custo por Conversão: ${costPerConversion ? `R$ ${costPerConversion.toFixed(2)}` : 'N/A'}\n`
  formatted += `- Valor de Conversão: ${totals?.conversionValue ? `R$ ${totals.conversionValue.toFixed(2)}` : 'N/A'}\n`
  formatted += `- ROAS: ${totals?.roas ? `${totals.roas.toFixed(2)}x` : 'N/A'}\n\n`

  if (data && data.length > 0) {
    formatted += `📈 POR CAMPANHA:\n`
    data.forEach((campaign: any) => {
      formatted += `\n• ${campaign.campaignName}\n`
      formatted += `  Gasto: R$ ${campaign.spend?.toFixed(2)} | Cliques: ${campaign.clicks} | Conversões: ${campaign.conversions || campaign.leads || campaign.purchases || 0}\n`
    })
  }

  return formatted
}

async function generateClientFacingReport(prompt: string): Promise<string | null> {
  const config = getAiProviderConfig({
    OPENROUTER_API_KEY: Deno.env.get('OPENROUTER_API_KEY'),
    OPENROUTER_MODEL: Deno.env.get('OPENROUTER_MODEL'),
    GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY'),
  })

  if (!config) {
    throw new Error('AI provider key not configured. Configure OPENROUTER_API_KEY or GEMINI_API_KEY.')
  }

  if (config.provider === 'openrouter') {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('SITE_URL') || 'http://localhost:5173',
        'X-Title': 'Nexus AI',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${errorText}`)
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content || null
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${errorText}`)
  }

  const data = await response.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null
}

async function handleInternalClientAnalysis(supabase: any, userId: string, body: any, authHeader: string): Promise<Response> {
  const clientId = typeof body.clientId === 'string' ? body.clientId : ''
  const periodStart = typeof body.periodStart === 'string' ? body.periodStart : ''
  const periodEnd = typeof body.periodEnd === 'string' ? body.periodEnd : ''

  if (!clientId || !periodStart || !periodEnd) {
    throw new Error('Missing clientId, periodStart or periodEnd')
  }

  const { data: client, error: clientError } = await supabase
    .from('agency_clients')
    .select('id,name,user_id')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single()
  if (clientError || !client) throw new Error('Client not found')

  const { data: profileData, error: profileError } = await supabase
    .from('client_ai_profiles')
    .select('*')
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .maybeSingle()
  if (profileError) throw new Error(`Unable to load AI profile: ${profileError.message}`)

  const profile = profileData || {
    objective: 'mixed',
    tone: 'consultative',
    business_rules: {},
    important_metrics: [],
    exposure_level: 'normal',
    internal_ai_enabled: true,
    briefing_enabled: false,
  }

  const { data: runsData, error: runsError } = await supabase
    .from('client_report_runs')
    .select('id,period_start,period_end,status,summary_payload,created_at,sent_at,platforms_included')
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .gte('period_end', periodStart)
    .lte('period_start', periodEnd)
    .order('created_at', { ascending: false })
    .limit(8)
  if (runsError) throw new Error(`Unable to load report history: ${runsError.message}`)

  const runs = Array.isArray(runsData) ? runsData : []
  const latestRun = runs[0] || null
  const summaryPayload = latestRun?.summary_payload || {}
  const liveMetrics = await loadLiveAnalysisMetrics({
    supabase,
    userId,
    clientId,
    periodStart,
    periodEnd,
    authHeader,
  })
  const fallbackMetrics = summaryPayload.metrics || summaryPayload.totals || summaryPayload
  const metrics = liveMetrics.dataQuality.hasLiveMetrics ? liveMetrics : {
    ...liveMetrics,
    fallbackReportSummary: fallbackMetrics,
  }

  const providerResponse = await generateInternalAnalysis({
    clientName: client.name,
    periodStart,
    periodEnd,
    metrics: sanitizeForPrompt(metrics),
    profile: sanitizeForPrompt(profile),
    recentHistory: runs.map((run: any) => sanitizeForPrompt({
      periodStart: run.period_start,
      periodEnd: run.period_end,
      status: run.status,
      platformsIncluded: run.platforms_included || [],
      summary: run.summary_payload || {},
    })),
  })

  const normalized = normalizeAiAnalysisPayload(providerResponse.payload)
  const { data: analysis, error: insertError } = await supabase
    .from('client_ai_analyses')
    .insert({
      user_id: userId,
      client_id: clientId,
      report_run_id: latestRun?.id || null,
      period_start: periodStart,
      period_end: periodEnd,
      summary: normalized.summary,
      positives: normalized.positives,
      attention_points: normalized.attentionPoints,
      internal_alerts: normalized.internalAlerts,
      recommendations: normalized.recommendations,
      talking_points: normalized.talkingPoints,
      risk_level: normalized.riskLevel,
      opportunity_level: normalized.opportunityLevel,
      raw_ai_payload: { providerPayload: providerResponse.payload },
      provider: providerResponse.provider,
      model: providerResponse.model,
    })
    .select('id')
    .single()
  if (insertError) throw new Error(`Unable to store AI analysis: ${insertError.message}`)

  return new Response(
    JSON.stringify({ analysisId: analysis.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function loadLiveAnalysisMetrics(input: {
  supabase: any
  userId: string
  clientId: string
  periodStart: string
  periodEnd: string
  authHeader: string
}) {
  const { data: linksData, error: linksError } = await input.supabase
    .from('agency_client_accounts')
    .select('account_id,platform,is_active')
    .eq('client_id', input.clientId)
    .eq('user_id', input.userId)
    .eq('is_active', true)

  if (linksError) throw new Error(`Unable to load linked accounts for AI analysis: ${linksError.message}`)

  const links = Array.isArray(linksData) ? linksData : []
  const accountIds = [...new Set(links.map((link: any) => link.account_id).filter(Boolean))]
  if (accountIds.length === 0) {
    return buildAiAnalysisMetrics([], [])
  }

  const { data: accountsData, error: accountsError } = await input.supabase
    .from('ad_platform_accounts')
    .select('id,platform,external_account_id,name,is_active')
    .in('id', accountIds)
    .eq('user_id', input.userId)
    .eq('is_active', true)

  if (accountsError) throw new Error(`Unable to load platform accounts for AI analysis: ${accountsError.message}`)

  const accounts = Array.isArray(accountsData) ? accountsData : []
  const results = await Promise.allSettled(accounts.map((account: any) => fetchAccountInsightsForAi({
    account,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    authHeader: input.authHeader,
  })))

  const metricAccounts: AiMetricAccountInput[] = []
  const errors: AiMetricError[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      metricAccounts.push(result.value)
      return
    }

    const account = accounts[index]
    errors.push({
      accountName: account?.name || account?.external_account_id || 'Conta desconhecida',
      platform: normalizePlatform(account?.platform),
      message: result.reason instanceof Error ? result.reason.message : 'Erro ao carregar métricas da conta',
    })
  })

  return buildAiAnalysisMetrics(metricAccounts, errors)
}

async function fetchAccountInsightsForAi(input: {
  account: any
  periodStart: string
  periodEnd: string
  authHeader: string
}): Promise<AiMetricAccountInput> {
  const platform = normalizePlatform(input.account.platform)
  const externalAccountId = String(input.account.external_account_id || '')
  if (!externalAccountId) throw new Error('Conta vinculada sem ID externo.')

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured.')

  const functionName = platform === 'google' ? 'google-insights' : 'meta-insights'
  const url = new URL(`${supabaseUrl}/functions/v1/${functionName}`)
  url.searchParams.set('account_id', externalAccountId)
  url.searchParams.set('date_start', input.periodStart)
  url.searchParams.set('date_end', input.periodEnd)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: input.authHeader,
    },
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json?.error || `${functionName} failed`)
  }

  const rows = Array.isArray(json.data) ? json.data : []
  const dailyData = Array.isArray(json.dailyData) ? json.dailyData.map((day: any) => ({
    date: String(day.date || ''),
    spend: numberValue(day.spend),
    impressions: integerValue(day.impressions),
    clicks: integerValue(day.clicks),
    conversions: numberValue(day.conversions),
  })) : []

  return {
    accountId: externalAccountId,
    accountName: String(input.account.name || externalAccountId),
    platform,
    insights: rows.map((row: Record<string, unknown>) => normalizeProviderInsight(row, platform, externalAccountId)),
    dailyData,
  }
}

function normalizePlatform(value: unknown): AiMetricPlatform {
  return value === 'google' ? 'google' : 'meta'
}

function integerValue(value: unknown): number {
  const numeric = numberValue(value)
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0
}

function numberValue(value: unknown): number {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

type NormalizedAiAnalysis = {
  summary: string
  positives: unknown[]
  attentionPoints: unknown[]
  internalAlerts: unknown[]
  recommendations: Array<Record<string, unknown> & { audience: 'agency' }>
  talkingPoints: unknown[]
  riskLevel: 'low' | 'normal' | 'attention' | 'critical'
  opportunityLevel: 'low' | 'normal' | 'high'
}

function normalizeAiAnalysisPayload(payload: unknown): NormalizedAiAnalysis {
  const parsed = parseAiPayload(payload)
  if (!parsed) return defaultAiAnalysis()

  return {
    summary: typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : defaultAiAnalysis().summary,
    positives: Array.isArray(parsed.positives) ? parsed.positives : [],
    attentionPoints: Array.isArray(parsed.attentionPoints) ? parsed.attentionPoints : Array.isArray(parsed.attention_points) ? parsed.attention_points : [],
    internalAlerts: Array.isArray(parsed.internalAlerts) ? parsed.internalAlerts : Array.isArray(parsed.internal_alerts) ? parsed.internal_alerts : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((item: unknown) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) return { ...(item as Record<string, unknown>), audience: 'agency' }
        return { text: String(item), audience: 'agency' }
      })
      : [],
    talkingPoints: Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints : Array.isArray(parsed.talking_points) ? parsed.talking_points : [],
    riskLevel: isRiskLevel(parsed.riskLevel) ? parsed.riskLevel : isRiskLevel(parsed.risk_level) ? parsed.risk_level : 'normal',
    opportunityLevel: isOpportunityLevel(parsed.opportunityLevel) ? parsed.opportunityLevel : isOpportunityLevel(parsed.opportunity_level) ? parsed.opportunity_level : 'normal',
  }
}

function defaultAiAnalysis(): NormalizedAiAnalysis {
  return {
    summary: 'Nao foi possivel gerar uma analise confiavel para este periodo.',
    positives: [],
    attentionPoints: [],
    internalAlerts: [],
    recommendations: [],
    talkingPoints: [],
    riskLevel: 'normal',
    opportunityLevel: 'normal',
  }
}

function parseAiPayload(payload: unknown): Record<string, unknown> | null {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload as Record<string, unknown>
  if (typeof payload !== 'string') return null
  try {
    const parsed = JSON.parse(payload)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function isRiskLevel(value: unknown): value is NormalizedAiAnalysis['riskLevel'] {
  return value === 'low' || value === 'normal' || value === 'attention' || value === 'critical'
}

function isOpportunityLevel(value: unknown): value is NormalizedAiAnalysis['opportunityLevel'] {
  return value === 'low' || value === 'normal' || value === 'high'
}

function sanitizeForPrompt(value: unknown): Record<string, unknown> {
  const sanitized = sanitizeUnknown(value)
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized) ? sanitized as Record<string, unknown> : {}
}

function sanitizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeUnknown)
  if (!value || typeof value !== 'object') return value

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, item]) => {
    const lower = key.toLowerCase()
    if (lower.includes('token') || lower.includes('webhook') || lower.includes('secret') || lower.includes('oauth')) return result
    result[key] = sanitizeUnknown(item)
    return result
  }, {})
}
