import fs from 'fs';
import path from 'path';

const keys = [
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
];

const env = Object.fromEntries(keys.map((key) => [key, process.env[key] || '']));
const distPath = path.join(process.cwd(), 'dist');
const outputPath = path.join(distPath, 'env.js');

fs.mkdirSync(distPath, { recursive: true });
fs.writeFileSync(outputPath, `window.__NEXUS_ENV__ = ${JSON.stringify(env)};\n`);
console.log(`Runtime public env written to ${outputPath}`);
