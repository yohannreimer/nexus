import { getAiProviderConfig, type AiProviderName } from './aiProviderConfig.ts';

export type AiProviderRequest = {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, unknown>;
  profile: Record<string, unknown>;
  recentHistory: unknown[];
};

export type AiProviderResponse = {
  provider: AiProviderName;
  model: string;
  payload: unknown;
};

const BLOCKED_KEYS = new Set([
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'token',
  'authorization',
  'cookie',
  'secret',
  'webhook_url',
  'webhookUrl',
  'webhookTarget',
  'webhook_response',
  'webhookResponse',
  'raw_oauth',
  'rawOAuth',
  'rawAiPayload',
  'raw_ai_payload',
]);

export async function generateInternalAnalysis(request: AiProviderRequest): Promise<AiProviderResponse> {
  const config = getRuntimeAiProviderConfig();
  if (!config) throw new Error('AI provider key not configured. Configure OPENROUTER_API_KEY or GEMINI_API_KEY.');
  const sanitizedRequest = sanitizeUnknown(request);

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
        messages: [
          {
            role: 'user',
            content: buildPrompt(sanitizedRequest),
          },
        ],
        temperature: 0.2,
        max_tokens: 1536,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    return {
      provider: 'openrouter',
      model: config.model,
      payload: parseJsonPayload(text),
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: buildPrompt(sanitizedRequest),
          }],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1536,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return {
    provider: 'gemini',
    model: config.model,
    payload: parseJsonPayload(text),
  };
}

export function getRuntimeAiProviderConfig() {
  return getAiProviderConfig({
    OPENROUTER_API_KEY: Deno.env.get('OPENROUTER_API_KEY'),
    OPENROUTER_MODEL: Deno.env.get('OPENROUTER_MODEL'),
    GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY'),
  });
}

function buildPrompt(request: unknown): string {
  return [
    'Voce e um analista senior de performance para agencias de trafego.',
    'Gere uma analise interna para a agencia, nunca uma mensagem automatica para o cliente final.',
    'Responda somente JSON valido, sem markdown.',
    'Formato obrigatorio:',
    '{',
    '  "summary": "string curta em portugues",',
    '  "positives": [],',
    '  "attentionPoints": [],',
    '  "internalAlerts": [],',
    '  "recommendations": [{"action":"string","reason":"string","priority":"low|medium|high"}],',
    '  "talkingPoints": [],',
    '  "riskLevel": "low|normal|attention|critical",',
    '  "opportunityLevel": "low|normal|high"',
    '}',
    'Dados sanitizados:',
    JSON.stringify(request),
  ].join('\n');
}

function parseJsonPayload(text: unknown): unknown {
  if (typeof text !== 'string') return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sanitizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeUnknown);
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, item]) => {
    if (BLOCKED_KEYS.has(key) || key.toLowerCase().includes('token') || key.toLowerCase().includes('webhook')) {
      return result;
    }
    result[key] = sanitizeUnknown(item);
    return result;
  }, {});
}
