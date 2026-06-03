import { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import url from 'url';

// Carrega as variáveis de ambiente. No Vite, elas são acessadas via `process.env` no lado do servidor.
const FACEBOOK_APP_ID = process.env.VITE_FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.VITE_FACEBOOK_REDIRECT_URI;
const FRONTEND_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

/**
 * A utility function to make HTTPS requests and return a promise.
 * @param options - The request options (hostname, path, method, etc.).
 * @param postData - The data to send in the request body.
 * @returns A promise that resolves with the response body as a string.
 */
function httpsRequest(options: https.RequestOptions, postData?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

/**
 * The main serverless function to handle the Facebook OAuth callback.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const { query } = url.parse(req.url || '', true);
  const { code } = query;

  if (!code || typeof code !== 'string') {
    res.statusCode = 400;
    res.end('Error: No authorization code provided.');
    return;
  }

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET || !REDIRECT_URI) {
    console.error("Missing environment variables for Facebook OAuth.");
    res.statusCode = 500;
    res.end('Server configuration error.');
    return;
  }

  try {
    // Step 1: Exchange the authorization code for a short-lived access token.
    const tokenPath = `/v20.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;
    
    const shortLivedTokenResponse = await httpsRequest({
      hostname: 'graph.facebook.com',
      path: tokenPath,
      method: 'GET',
    });
    
    const { access_token: shortLivedToken } = JSON.parse(shortLivedTokenResponse);
    if (!shortLivedToken) {
      throw new Error('Failed to retrieve short-lived token.');
    }

    // Step 2: Exchange the short-lived token for a long-lived access token.
    const longLivedTokenPath = `/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;

    const longLivedTokenResponse = await httpsRequest({
      hostname: 'graph.facebook.com',
      path: longLivedTokenPath,
      method: 'GET',
    });

    const { access_token: longLivedToken, expires_in } = JSON.parse(longLivedTokenResponse);
    if (!longLivedToken) {
        throw new Error('Failed to retrieve long-lived token.');
    }

    // Step 3: Redirect the user back to the frontend with the long-lived token.
    const frontendRedirectUrl = `${FRONTEND_URL}?token=${longLivedToken}&expires_in=${expires_in}`;
    
    res.writeHead(302, { Location: frontendRedirectUrl });
    res.end();

  } catch (error) {
    console.error('OAuth flow error:', error);
    res.statusCode = 500;
    res.end('An error occurred during the authentication process.');
  }
}
