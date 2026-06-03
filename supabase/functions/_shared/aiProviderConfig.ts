export type AiProviderName = 'openrouter' | 'gemini';

export type AiProviderConfig = {
  provider: AiProviderName;
  apiKey: string;
  model: string;
};

export type AiProviderEnv = {
  OPENROUTER_API_KEY?: string | null;
  OPENROUTER_MODEL?: string | null;
  GEMINI_API_KEY?: string | null;
};

export const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.5-flash';
export const GEMINI_DEFAULT_MODEL = 'gemini-1.5-flash';

export function getAiProviderConfig(env: AiProviderEnv): AiProviderConfig | null {
  const openRouterApiKey = readEnvValue(env.OPENROUTER_API_KEY);
  if (openRouterApiKey) {
    return {
      provider: 'openrouter',
      apiKey: openRouterApiKey,
      model: readEnvValue(env.OPENROUTER_MODEL) || OPENROUTER_DEFAULT_MODEL,
    };
  }

  const geminiApiKey = readEnvValue(env.GEMINI_API_KEY);
  if (geminiApiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiApiKey,
      model: GEMINI_DEFAULT_MODEL,
    };
  }

  return null;
}

function readEnvValue(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}
