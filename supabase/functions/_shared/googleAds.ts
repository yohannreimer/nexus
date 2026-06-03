export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function googleAdsApiVersion(): string {
  return Deno.env.get('GOOGLE_ADS_API_VERSION') || 'v24';
}

export function normalizeCustomerId(customerId: string): string {
  return customerId.replace(/\D/g, '');
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error_description || json.error || 'Failed to exchange Google OAuth code');
  }

  return json;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error_description || json.error || 'Failed to refresh Google access token');
  }

  return json;
}

export function googleAdsHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': requiredEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'Content-Type': 'application/json',
  };

  if (loginCustomerId) {
    headers['login-customer-id'] = normalizeCustomerId(loginCustomerId);
  }

  return headers;
}

function googleAdsErrorMessage(payload: unknown, fallback: string): string {
  const source = Array.isArray(payload) ? payload[0] : payload;
  const error = isRecord(source) && isRecord(source.error) ? source.error : undefined;
  const baseMessage = typeof error?.message === 'string' ? error.message : '';
  const details = Array.isArray(error?.details)
    ? error.details
      .flatMap((detail) => {
        if (!isRecord(detail) || !Array.isArray(detail.errors)) return [];
        return detail.errors.map((item) => {
          if (!isRecord(item)) return '';
          const code = isRecord(item.errorCode) ? JSON.stringify(item.errorCode) : '';
          const message = typeof item.message === 'string' ? item.message : '';
          const fieldPath = extractFieldPath(item.location);
          return [code, message, fieldPath ? `field: ${fieldPath}` : ''].filter(Boolean).join(' - ');
        });
      })
      .filter(Boolean)
      .join(' | ')
    : '';

  return [baseMessage, details].filter(Boolean).join(' | ') || fallback;
}

function extractFieldPath(location: unknown): string {
  if (!isRecord(location) || !Array.isArray(location.fieldPathElements)) return '';
  return location.fieldPathElements
    .map((element) => isRecord(element) && typeof element.fieldName === 'string' ? element.fieldName : '')
    .filter(Boolean)
    .join('.');
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

export async function googleAdsSearch(params: {
  accessToken: string;
  customerId: string;
  query: string;
  loginCustomerId?: string;
}): Promise<any[]> {
  const customerId = normalizeCustomerId(params.customerId);
  const version = googleAdsApiVersion();
  const loginCustomerId = params.loginCustomerId || Deno.env.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID') || undefined;

  const response = await fetch(`https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: googleAdsHeaders(params.accessToken, loginCustomerId),
    body: JSON.stringify({ query: params.query }),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = googleAdsErrorMessage(json, 'Google Ads API request failed');
    console.error('Google Ads API request failed', {
      status: response.status,
      requestId: response.headers.get('request-id'),
      customerId,
      loginCustomerId,
      message,
      payload: json,
    });
    throw new Error(message);
  }

  return Array.isArray(json) ? json.flatMap((chunk) => chunk.results || []) : [];
}

export async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const version = googleAdsApiVersion();
  const response = await fetch(`https://googleads.googleapis.com/${version}/customers:listAccessibleCustomers`, {
    method: 'GET',
    headers: googleAdsHeaders(accessToken),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = googleAdsErrorMessage(json, 'Failed to list Google Ads customers');
    console.error('Failed to list Google Ads customers', {
      status: response.status,
      requestId: response.headers.get('request-id'),
      message,
      payload: json,
    });
    throw new Error(message);
  }

  return (json.resourceNames || [])
    .map((resourceName: string) => resourceName.replace('customers/', ''))
    .filter(Boolean);
}
