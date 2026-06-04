const PUBLIC_ENV_KEYS = [
  'VITE_APP_URL',
  'VITE_NEXUS_API_URL',
  'VITE_CLERK_PUBLISHABLE_KEY',
  'VITE_PRYMEIRA_ACCOUNT_API_URL',
  'VITE_PRYMEIRA_HUB_URL',
  'VITE_PRYMEIRA_PRODUCT_KEY',
  'VITE_PRYMEIRA_AUTH_ENABLED',
  'VITE_FACEBOOK_APP_ID',
  'VITE_FACEBOOK_REDIRECT_URI',
  'VITE_N8N_WEBHOOK_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_DEV_BYPASS',
] as const;

export type PublicEnvKey = typeof PUBLIC_ENV_KEYS[number];

declare global {
  interface Window {
    __NEXUS_ENV__?: Partial<Record<PublicEnvKey, string>>;
  }
}

export function getPublicEnv(key: PublicEnvKey): string {
  if (typeof window !== 'undefined') {
    const runtimeValue = window.__NEXUS_ENV__?.[key];
    if (runtimeValue !== undefined) {
      return runtimeValue;
    }
  }

  return (((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[key]) as string | undefined) || '';
}

export function isPublicEnvEnabled(key: PublicEnvKey): boolean {
  return getPublicEnv(key) === 'true';
}
