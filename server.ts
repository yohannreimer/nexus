import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Import services
import { FacebookInsightsService } from './services/facebookInsightsService';
import { ReportGeneratorService } from './services/reportGeneratorService';
import { resolvePrymeiraWorkspaceFromAuthorization, type ServerWorkspaceContext } from './server/prymeiraAccess';
import { queryPostgres } from './server/postgres';
import { mountWorkspacePlatformRoutes } from './server/workspacePlatformApi';
import { mountWorkspaceDataRoutes } from './server/workspaceDataApi';

const app = express();
const PORT = process.env.PORT || 3001;
const PRYMEIRA_ACCOUNT_API_URL = process.env.PRYMEIRA_ACCOUNT_API_URL || process.env.VITE_PRYMEIRA_ACCOUNT_API_URL || 'http://localhost:3001';
const PRYMEIRA_PRODUCT_KEY = process.env.PRYMEIRA_PRODUCT_KEY || process.env.VITE_PRYMEIRA_PRODUCT_KEY || 'ads';

async function requireWorkspace(req: Request): Promise<ServerWorkspaceContext> {
  return resolvePrymeiraWorkspaceFromAuthorization({
    authorization: req.headers.authorization,
    accountApiUrl: PRYMEIRA_ACCOUNT_API_URL,
    productKey: PRYMEIRA_PRODUCT_KEY,
  });
}

function respondNexusApiError(res: Response, error: unknown) {
  const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;

  if (statusCode >= 500) {
    console.error('❌ Erro interno nas rotas workspace Nexus:', error);
    return res.status(statusCode).json({ error: 'Erro interno na API Nexus' });
  }

  const message = error instanceof Error ? error.message : String(error);
  return res.status(statusCode).json({ error: message });
}

function createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
}

function normalizeOptionalDateString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw createHttpError('tokenExpiresAt deve ser string válida ou null', 400);
  }

  if (Number.isNaN(Date.parse(value))) {
    throw createHttpError('tokenExpiresAt deve ser uma data válida', 400);
  }

  return value;
}

async function upsertWorkspaceConnection(input: {
  workspaceId: string;
  clerkUserId: string | null;
  platform: 'meta' | 'google';
  externalUserId: string | null;
  externalUserName: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
}) {
  const rows = await queryPostgres<{ id: string }>(`
    insert into public.ad_connections (
      workspace_id, clerk_user_id, platform, external_user_id, external_user_name,
      access_token, refresh_token, token_expires_at, status, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, 'active', now())
    on conflict (workspace_id, platform)
    where workspace_id is not null
    do update set
      clerk_user_id = excluded.clerk_user_id,
      external_user_id = excluded.external_user_id,
      external_user_name = excluded.external_user_name,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      status = 'active',
      updated_at = now()
    returning id
  `, [
    input.workspaceId,
    input.clerkUserId,
    input.platform,
    input.externalUserId,
    input.externalUserName,
    input.accessToken,
    input.refreshToken,
    input.tokenExpiresAt,
  ]);

  return rows[0]?.id;
}

// Middleware
app.set('trust proxy', true);
app.use(cors({
  origin: process.env.VITE_APP_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

mountWorkspacePlatformRoutes(app, { requireWorkspace, respondNexusApiError });
mountWorkspaceDataRoutes(app, { requireWorkspace, respondNexusApiError });

app.get('/api/workspace/me', async (req: Request, res: Response) => {
  try {
    const workspace = await requireWorkspace(req);
    res.json({ workspace });
  } catch (error) {
    respondNexusApiError(res, error);
  }
});

app.get('/api/workspace/platform-accounts', async (req: Request, res: Response) => {
  try {
    const workspace = await requireWorkspace(req);
    const accounts = await queryPostgres(`
      select id, platform, external_account_id, name, currency, timezone, status, is_active, metadata
      from public.ad_platform_accounts
      where workspace_id = $1
      order by name asc
    `, [workspace.workspaceId]);

    res.json({ data: accounts });
  } catch (error) {
    respondNexusApiError(res, error);
  }
});

app.get('/api/workspace/agency-clients', async (req: Request, res: Response) => {
  try {
    const workspace = await requireWorkspace(req);
    const clients = await queryPostgres(`
      select id, user_id, name, status, primary_whatsapp, internal_owner, notes, metadata, created_at, updated_at
      from public.agency_clients
      where workspace_id = $1
      order by name asc
    `, [workspace.workspaceId]);

    res.json({ data: clients });
  } catch (error) {
    respondNexusApiError(res, error);
  }
});

app.post('/api/workspace/agency-clients', async (req: Request, res: Response) => {
  try {
    const workspace = await requireWorkspace(req);
    const body = req.body as {
      name?: unknown;
      status?: unknown;
      primaryWhatsapp?: unknown;
      internalOwner?: unknown;
      notes?: unknown;
      metadata?: unknown;
    };

    if (typeof body.name !== 'string' || !body.name.trim()) {
      res.status(400).json({ error: 'name é obrigatório' });
      return;
    }

    const status = body.status === 'paused' || body.status === 'archived' ? body.status : 'active';
    const rows = await queryPostgres(`
      insert into public.agency_clients (
        user_id, workspace_id, clerk_user_id, name, status,
        primary_whatsapp, internal_owner, notes, metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning id, user_id, name, status, primary_whatsapp, internal_owner, notes, metadata, created_at, updated_at
    `, [
      null,
      workspace.workspaceId,
      null,
      body.name.trim(),
      status,
      typeof body.primaryWhatsapp === 'string' && body.primaryWhatsapp ? body.primaryWhatsapp : null,
      typeof body.internalOwner === 'string' && body.internalOwner ? body.internalOwner : null,
      typeof body.notes === 'string' && body.notes ? body.notes : null,
      body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {},
    ]);

    res.status(201).json({ data: rows[0] });
  } catch (error) {
    respondNexusApiError(res, error);
  }
});

app.post('/api/workspace/ad-connections', async (req: Request, res: Response) => {
  try {
    const workspace = await requireWorkspace(req);
    const body = req.body as {
      platform?: 'meta' | 'google';
      externalUserId?: string | null;
      externalUserName?: string | null;
      accessToken?: string | null;
      refreshToken?: string | null;
      tokenExpiresAt?: string | null;
    };

    if (body.platform !== 'meta' && body.platform !== 'google') {
      res.status(400).json({ error: 'platform deve ser meta ou google' });
      return;
    }

    if (!isOptionalString(body.externalUserId)) {
      res.status(400).json({ error: 'externalUserId deve ser string ou null' });
      return;
    }

    if (!isOptionalString(body.externalUserName)) {
      res.status(400).json({ error: 'externalUserName deve ser string ou null' });
      return;
    }

    if (!isOptionalString(body.accessToken)) {
      res.status(400).json({ error: 'accessToken deve ser string ou null' });
      return;
    }

    if (!isOptionalString(body.refreshToken)) {
      res.status(400).json({ error: 'refreshToken deve ser string ou null' });
      return;
    }

    const tokenExpiresAt = normalizeOptionalDateString(body.tokenExpiresAt);

    const connectionId = await upsertWorkspaceConnection({
      workspaceId: workspace.workspaceId,
      clerkUserId: null,
      platform: body.platform,
      externalUserId: normalizeOptionalString(body.externalUserId),
      externalUserName: normalizeOptionalString(body.externalUserName),
      accessToken: normalizeOptionalString(body.accessToken),
      refreshToken: normalizeOptionalString(body.refreshToken),
      tokenExpiresAt,
    });

    if (!connectionId) {
      throw createHttpError('Falha ao salvar conexão do workspace', 500);
    }

    res.json({ ok: true, workspace_id: workspace.workspaceId, connection_id: connectionId });
  } catch (error) {
    respondNexusApiError(res, error);
  }
});

// Facebook App credentials (do NOT expose these to the frontend)
const FACEBOOK_APP_ID = process.env.VITE_FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.VITE_FACEBOOK_REDIRECT_URI;
const WORKSPACE_OAUTH_BASE_URL = (process.env.NEXUS_API_URL || process.env.VITE_NEXUS_API_URL || process.env.VITE_APP_URL || '').replace(/\/+$/, '');

// ==================== ROTA DE CALLBACK DO FACEBOOK ====================
/**
 * Esta rota é chamada pelo Facebook após o usuário autorizar o aplicativo.
 * O Facebook envia um "code" temporário que usaremos para obter o token de acesso.
 */
app.get('/api/auth-callback', async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;

  // Se o usuário cancelou ou houve erro
  if (error) {
    console.error('❌ Erro do Facebook:', error_description);
    return res.redirect(`${process.env.VITE_APP_URL}?error=${error}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Código de autorização não fornecido' });
  }

  try {
    console.log('🔄 Recebido code do Facebook, iniciando troca por token...');

    // PASSO 1: Trocar o code por um Short-Lived Token (dura 1 hora)
    const shortTokenResponse = await axios.get('https://graph.facebook.com/v23.0/oauth/access_token', {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code
      }
    });

    const shortLivedToken = shortTokenResponse.data.access_token;
    console.log('✅ Short-Lived Token obtido');

    // PASSO 2: Trocar o Short-Lived Token por um Long-Lived Token (dura 60 dias)
    const longTokenResponse = await axios.get('https://graph.facebook.com/v23.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });

    const longLivedToken = longTokenResponse.data.access_token;
    const expiresIn = longTokenResponse.data.expires_in; // segundos (normalmente 5184000 = 60 dias)
    
    console.log('✅ Long-Lived Token obtido (expira em:', expiresIn, 'segundos)');

    // PASSO 3: Buscar informações do usuário
    const userInfoResponse = await axios.get('https://graph.facebook.com/v23.0/me', {
      params: {
        fields: 'id,name,email',
        access_token: longLivedToken
      }
    });

    const userInfo = userInfoResponse.data;
    console.log('✅ Informações do usuário:', userInfo);

    // PASSO 4: Buscar as Ad Accounts que o usuário tem acesso
    const adAccountsResponse = await axios.get('https://graph.facebook.com/v23.0/me/adaccounts', {
      params: {
        fields: 'id,name,account_status,currency,timezone_name',
        access_token: longLivedToken
      }
    });

    const adAccounts = adAccountsResponse.data.data;
    console.log('✅ Ad Accounts encontradas:', adAccounts.length);

    // PASSO 5: Salvar no "banco de dados" (por enquanto, apenas retornar para o frontend)
    // TODO: Aqui você salvaria no Supabase:
    // - user_tokens (id, fb_user_id, long_lived_token, token_expires_at, whatsapp_number)
    // - monitored_accounts (id, user_id, ad_account_id, account_name, is_active)

    const userData = {
      token: longLivedToken,
      expiresIn: expiresIn,
      user: userInfo,
      adAccounts: adAccounts
    };

    // Redirecionar de volta para o frontend com os dados (via URL ou session)
    // Por segurança, vamos usar uma página intermediária que salvará no localStorage
    const encodedData = Buffer.from(JSON.stringify(userData), 'utf8')
      .toString('base64url');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Autenticação concluída</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
          }
          .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>✅ Conexão realizada com sucesso!</h2>
          <p>Redirecionando para o dashboard...</p>
        </div>
        <script>
          console.log('🔐 Preparando dados de autenticação...');
          
          const encodedData = ${JSON.stringify(encodedData)};
          const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(
            atob(encodedData.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedData.length / 4) * 4, '=')),
            char => char.charCodeAt(0)
          )));
          console.log('✅ Dados recebidos:');
          console.log('Token:', data.token.substring(0, 20) + '...');
          console.log('User:', data.user.name);
          console.log('Ad Accounts:', data.adAccounts.length);
          
          console.log('⏳ Redirecionando em 2 segundos...');
          setTimeout(() => {
            console.log('🚀 Redirecionando agora!');
            window.location.href = '${process.env.VITE_APP_URL}#auth=' + encodedData;
          }, 2000);
        </script>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error('❌ Erro ao processar autenticação:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Erro ao processar autenticação',
      details: error.response?.data || error.message
    });
  }
});

// ==================== ROTA PARA RENOVAR TOKEN ====================
/**
 * Esta rota será chamada automaticamente a cada 50 dias para renovar o token
 * antes que ele expire (tokens de longa duração duram 60 dias)
 */
app.post('/api/refresh-token', async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token não fornecido' });
  }

  try {
    const response = await axios.get('https://graph.facebook.com/v23.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: token
      }
    });

    const newToken = response.data.access_token;
    const expiresIn = response.data.expires_in;

    console.log('✅ Token renovado com sucesso');

    res.json({
      token: newToken,
      expiresIn: expiresIn
    });

  } catch (error: any) {
    console.error('❌ Erro ao renovar token:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Erro ao renovar token',
      details: error.response?.data || error.message
    });
  }
});

// ==================== ROTA PARA BUSCAR CAMPANHAS ====================
/**
 * Busca todas as campanhas de uma conta de anúncios específica
 */
app.get('/api/campaigns/:adAccountId', async (req: Request, res: Response) => {
  const { adAccountId } = req.params;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    console.log(`📋 Buscando campanhas reais da conta ${adAccountId}...`);
    
    const response = await axios.get(`https://graph.facebook.com/v23.0/${adAccountId}/campaigns`, {
      params: {
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,configured_status,effective_status',
        limit: 100,
        access_token: token
      }
    });

    const campaigns = response.data.data || [];
    
    console.log(`✅ Encontradas ${campaigns.length} campanhas`);
    
    res.json({ data: campaigns });

  } catch (error: any) {
    console.error('❌ Erro ao buscar campanhas:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar campanhas',
      details: error.response?.data || error.message
    });
  }
});

// ==================== ROTA PARA BUSCAR INSIGHTS ====================
/**
 * Busca métricas/insights de campanhas específicas
 */
app.post('/api/insights', async (req: Request, res: Response) => {
  const { adAccountId, campaignIds, datePreset } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    // Buscar insights para cada campanha
    const insightsPromises = campaignIds.map((campaignId: string) => 
      axios.get(`https://graph.facebook.com/v23.0/${campaignId}/insights`, {
        params: {
          fields: 'campaign_name,impressions,clicks,spend,actions,ctr,cpc,cpm,reach',
          date_preset: datePreset || 'today',
          access_token: token
        }
      })
    );

    const results = await Promise.all(insightsPromises);
    const insights = results.map(r => r.data.data[0]).filter(Boolean);

    res.json({ insights });

  } catch (error: any) {
    console.error('❌ Erro ao buscar insights:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar insights',
      details: error.response?.data || error.message
    });
  }
});

// ==================== ROTA PARA GERAR RELATÓRIO ====================
/**
 * Gera relatório diário de uma conta específica
 * POST /api/reports/generate/:accountId
 * Body: { since?: string, until?: string, period?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last60days' }
 */
app.post('/api/reports/generate/:accountId', async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const { since, until, period = 'yesterday' } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    console.log(`📊 Gerando relatório para conta ${accountId}...`);

    const insightsService = new FacebookInsightsService(token);
    
    // Determina o período
    let range;
    if (since && until) {
      // Período customizado
      range = { since, until };
    } else {
      // Períodos pré-definidos
      switch (period) {
        case 'today':
          range = FacebookInsightsService.getTodayRange();
          break;
        case 'yesterday':
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const dateStr = yesterday.toISOString().split('T')[0];
          range = { since: dateStr, until: dateStr };
          break;
        case 'last7days':
          range = FacebookInsightsService.getLastNDaysRange(7);
          break;
        case 'last30days':
          range = FacebookInsightsService.getLastNDaysRange(30);
          break;
        case 'last60days':
          range = FacebookInsightsService.getLastNDaysRange(60);
          break;
        default:
          range = FacebookInsightsService.getTodayRange();
      }
    }

    // Busca dados do Facebook
    const campaigns = await insightsService.getCampaignInsights(
      accountId.replace('act_', ''),
      range,
      false // Não incluir hierarquia completa por enquanto
    );

    // Gera relatório
    const dateLabel = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const report = ReportGeneratorService.generateDailyReport(campaigns, dateLabel);

    console.log('📊 Relatório gerado:', {
      campanhas: campaigns.length,
      totalGasto: report.summary.total_spend,
      totalImpressions: report.summary.total_impressions,
      alertas: report.alerts.length,
      destaques: Object.keys(report.highlights)
    });

    // Formata mensagem WhatsApp
    const whatsappMessage = ReportGeneratorService.formatWhatsAppMessage(report);

    // Formata preview HTML
    const htmlPreview = ReportGeneratorService.formatHtmlPreview(report);

    res.json({
      success: true,
      report,
      whatsappMessage,
      htmlPreview,
      period: range
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar relatório:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao gerar relatório',
      details: error.response?.data || error.message
    });
  }
});

// ==================== ROTA PARA ENVIAR RELATÓRIO WHATSAPP ====================
/**
 * Envia relatório via WhatsApp usando n8n webhook
 * POST /api/reports/send/:accountId
 * Body: { whatsappNumber: string, message?: string, accountName?: string, templateId?: string, period?: string, since?: string, until?: string }
 */
app.post('/api/reports/send/:accountId', async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const { whatsappNumber, message, accountName, templateId, period, since, until, campaignIds } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!whatsappNumber) {
    return res.status(400).json({ error: 'whatsappNumber é obrigatório' });
  }

  try {
    let finalMessage = message;

    // Se não tem message pronta, gera a partir dos dados do Facebook
    if (!finalMessage && token) {
      console.log(`📊 Gerando relatório para envio - conta ${accountId}, período: ${period || 'yesterday'}...`);
      
      const insightsService = new FacebookInsightsService(token);
      
      // Determina o período
      let range;
      if (since && until) {
        range = { since, until };
      } else {
        switch (period) {
          case 'today':
            range = FacebookInsightsService.getTodayRange();
            break;
          case 'yesterday':
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            range = { since: dateStr, until: dateStr };
            break;
          case 'last7days':
            range = FacebookInsightsService.getLastNDaysRange(7);
            break;
          case 'last30days':
            range = FacebookInsightsService.getLastNDaysRange(30);
            break;
          case 'last60days':
            range = FacebookInsightsService.getLastNDaysRange(60);
            break;
          default:
            const defaultYesterday = new Date();
            defaultYesterday.setDate(defaultYesterday.getDate() - 1);
            const defaultDateStr = defaultYesterday.toISOString().split('T')[0];
            range = { since: defaultDateStr, until: defaultDateStr };
        }
      }

      // Busca dados do Facebook
      const campaigns = await insightsService.getCampaignInsights(
        accountId.replace('act_', ''),
        range,
        false
      );

      // Gera relatório
      let periodLabel = 'Ontem';
      if (period === 'today') periodLabel = 'Hoje';
      else if (period === 'last7days') periodLabel = 'Últimos 7 dias';
      else if (period === 'last30days') periodLabel = 'Últimos 30 dias';
      else if (period === 'last60days') periodLabel = 'Últimos 60 dias';
      else if (since && until) {
        const startDate = new Date(since).toLocaleDateString('pt-BR');
        const endDate = new Date(until).toLocaleDateString('pt-BR');
        periodLabel = `${startDate} a ${endDate}`;
      }

      const report = ReportGeneratorService.generateDailyReport(campaigns, periodLabel);
      
      console.log('📊 Dados do relatório:', {
        campanhas: campaigns.length,
        totalGasto: report.summary.total_spend,
        totalImpressions: report.summary.total_impressions,
        totalClicks: report.summary.total_clicks
      });

      // Se tem templateId, processa o template, senão usa a mensagem padrão do WhatsApp
      if (templateId) {
        // TODO: Buscar template do banco de dados e processar
        // Por enquanto, usa a mensagem formatada padrão
        finalMessage = ReportGeneratorService.formatWhatsAppMessage(report);
      } else {
        finalMessage = ReportGeneratorService.formatWhatsAppMessage(report);
      }
    }

    if (!finalMessage) {
      return res.status(400).json({ error: 'Não foi possível gerar a mensagem do relatório' });
    }

    console.log(`📱 Enviando relatório via WhatsApp para ${whatsappNumber}...`);

    const webhookUrl = process.env.VITE_N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({ error: 'Webhook n8n não configurado' });
    }

    // Envia para n8n webhook
    const response = await axios.post(webhookUrl, {
      number: whatsappNumber,
      message: finalMessage,
      accountName: accountName || 'Nexus AI',
      reportType: 'daily',
      timestamp: new Date().toISOString()
    });

    console.log('✅ Relatório enviado com sucesso');

    res.json({
      success: true,
      messageId: response.data?.messageId || response.data?.id,
      sentAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro ao enviar WhatsApp:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao enviar WhatsApp',
      details: error.response?.data || error.message
    });
  }
});

// ==================== ROTA PARA TESTE DE CONEXÃO N8N ====================
/**
 * Testa conexão com webhook n8n
 */
app.get('/api/n8n/test', async (req: Request, res: Response) => {
  try {
    const webhookUrl = process.env.VITE_N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({ error: 'Webhook URL não configurada' });
    }

    const response = await axios.post(webhookUrl, {
      test: true,
      message: '🧪 Teste de conexão do Nexus AI',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      webhookUrl,
      response: response.data
    });

  } catch (error: any) {
    console.error('❌ Erro ao testar webhook:', error.message);
    res.status(500).json({
      error: 'Erro ao testar webhook',
      details: error.message
    });
  }
});

// ==================== ROTA PARA DADOS DE GRÁFICOS ====================
/**
 * Retorna dados para gráficos do dashboard do cliente
 * POST /api/reports/chart-data/:accountId
 * Body: { period: 'last7days' | 'last30days' | 'last60days' }
 */
app.post('/api/reports/chart-data/:accountId', async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const { period = 'last30days' } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    console.log(`📊 Buscando dados de gráficos para conta ${accountId}, período: ${period}...`);

    const insightsService = new FacebookInsightsService(token);
    
    // Determina o período
    const days = period === 'last7days' ? 7 : period === 'last30days' ? 30 : 60;
    const range = FacebookInsightsService.getLastNDaysRange(days);

    // Busca insights diários usando time_increment=1 para dados por dia
    const accountIdClean = accountId.replace('act_', '');
    
    // Buscar dados com granularidade diária
    const dailyInsightsResponse = await axios.get(`https://graph.facebook.com/v23.0/act_${accountIdClean}/insights`, {
      params: {
        fields: 'spend,impressions,clicks,ctr,cpc,cpm,reach,actions',
        time_range: JSON.stringify({ since: range.since, until: range.until }),
        time_increment: 1, // Dados por dia
        access_token: token,
        limit: 100
      }
    });

    const dailyInsights = dailyInsightsResponse.data.data || [];
    
    // Formata dados diários para gráficos
    const dailyData = dailyInsights.map((day: any) => {
      const conversions = day.actions?.find((a: any) => a.action_type === 'purchase')?.value || 
                         day.actions?.find((a: any) => a.action_type === 'lead')?.value ||
                         day.actions?.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0;
      
      const date = new Date(day.date_start);
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: day.date_start,
        spend: parseFloat(day.spend || 0),
        impressions: parseInt(day.impressions || 0),
        clicks: parseInt(day.clicks || 0),
        ctr: parseFloat(day.ctr || 0),
        cpc: parseFloat(day.cpc || 0),
        cpm: parseFloat(day.cpm || 0),
        reach: parseInt(day.reach || 0),
        conversions: parseInt(conversions)
      };
    }).sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

    // Busca dados por campanha COM OBJETIVO
    const campaignsResponse = await axios.get(`https://graph.facebook.com/v23.0/act_${accountIdClean}/insights`, {
      params: {
        fields: 'campaign_name,campaign_id,spend,impressions,clicks,ctr,cpc,actions',
        time_range: JSON.stringify({ since: range.since, until: range.until }),
        level: 'campaign',
        access_token: token,
        limit: 50
      }
    });

    const campaignInsights = campaignsResponse.data.data || [];
    
    // Busca a lista de campanhas com objetivo
    const campaignsListResponse = await axios.get(`https://graph.facebook.com/v23.0/act_${accountIdClean}/campaigns`, {
      params: {
        fields: 'id,name,objective',
        limit: 100,
        access_token: token
      }
    });
    
    const campaignsList = campaignsListResponse.data.data || [];
    const campaignObjectives: Record<string, string> = {};
    campaignsList.forEach((c: any) => {
      campaignObjectives[c.id] = c.objective || 'UNKNOWN';
    });

    // Mapeamento de objetivos para nomes legíveis
    const objectiveLabels: Record<string, string> = {
      'OUTCOME_TRAFFIC': 'Tráfego',
      'OUTCOME_ENGAGEMENT': 'Engajamento',
      'OUTCOME_LEADS': 'Cadastros/Leads',
      'OUTCOME_SALES': 'Vendas',
      'OUTCOME_APP_PROMOTION': 'Promoção de App',
      'OUTCOME_AWARENESS': 'Reconhecimento',
      'LINK_CLICKS': 'Cliques no Link',
      'REACH': 'Alcance',
      'LEAD_GENERATION': 'Geração de Leads',
      'CONVERSIONS': 'Conversões',
      'MESSAGES': 'Mensagens',
      'VIDEO_VIEWS': 'Visualizações de Vídeo',
      'POST_ENGAGEMENT': 'Engajamento no Post',
      'PAGE_LIKES': 'Curtidas na Página',
      'BRAND_AWARENESS': 'Reconhecimento de Marca',
      'STORE_VISITS': 'Visitas à Loja',
      'PRODUCT_CATALOG_SALES': 'Vendas do Catálogo',
      'UNKNOWN': 'Outros'
    };
    
    // Formata dados por campanha incluindo objetivo
    const campaignData = campaignInsights.map((campaign: any) => {
      const objective = campaignObjectives[campaign.campaign_id] || 'UNKNOWN';
      return {
        name: campaign.campaign_name || 'Campanha sem nome',
        id: campaign.campaign_id,
        spend: parseFloat(campaign.spend || 0),
        impressions: parseInt(campaign.impressions || 0),
        clicks: parseInt(campaign.clicks || 0),
        ctr: parseFloat(campaign.ctr || 0),
        cpc: parseFloat(campaign.cpc || 0),
        objective: objective,
        objectiveLabel: objectiveLabels[objective] || objective
      };
    }).filter((c: any) => c.spend > 0);

    // Busca dados diários POR CAMPANHA para permitir filtro por objetivo
    const dailyByCampaignResponse = await axios.get(`https://graph.facebook.com/v23.0/act_${accountIdClean}/insights`, {
      params: {
        fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions',
        time_range: JSON.stringify({ since: range.since, until: range.until }),
        time_increment: 1,
        level: 'campaign',
        access_token: token,
        limit: 500
      }
    });

    const dailyByCampaignData = dailyByCampaignResponse.data.data || [];
    
    // Formata dados diários por campanha
    const dailyByCampaign = dailyByCampaignData.map((item: any) => {
      const objective = campaignObjectives[item.campaign_id] || 'UNKNOWN';
      const date = new Date(item.date_start);
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: item.date_start,
        campaignId: item.campaign_id,
        campaignName: item.campaign_name,
        objective: objective,
        objectiveLabel: objectiveLabels[objective] || objective,
        spend: parseFloat(item.spend || 0),
        impressions: parseInt(item.impressions || 0),
        clicks: parseInt(item.clicks || 0),
        ctr: parseFloat(item.ctr || 0),
        cpc: parseFloat(item.cpc || 0)
      };
    });

    // Agrupa dados por objetivo
    const objectiveGroups: Record<string, { spend: number; impressions: number; clicks: number; campaigns: number }> = {};
    campaignData.forEach((campaign: any) => {
      const key = campaign.objective;
      if (!objectiveGroups[key]) {
        objectiveGroups[key] = { spend: 0, impressions: 0, clicks: 0, campaigns: 0 };
      }
      objectiveGroups[key].spend += campaign.spend;
      objectiveGroups[key].impressions += campaign.impressions;
      objectiveGroups[key].clicks += campaign.clicks;
      objectiveGroups[key].campaigns += 1;
    });

    // Formata dados por objetivo para gráficos
    const objectiveData = Object.entries(objectiveGroups).map(([objective, data]) => ({
      objective,
      objectiveLabel: objectiveLabels[objective] || objective,
      spend: data.spend,
      impressions: data.impressions,
      clicks: data.clicks,
      campaigns: data.campaigns,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0
    })).sort((a, b) => b.spend - a.spend);

    // Calcula resumo
    const totalSpend = dailyData.reduce((sum: number, d: any) => sum + d.spend, 0);
    const totalImpressions = dailyData.reduce((sum: number, d: any) => sum + d.impressions, 0);
    const totalClicks = dailyData.reduce((sum: number, d: any) => sum + d.clicks, 0);
    const totalConversions = dailyData.reduce((sum: number, d: any) => sum + d.conversions, 0);
    
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    // Calcula variação (comparando com período anterior)
    const halfLength = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, halfLength);
    const secondHalf = dailyData.slice(halfLength);
    
    const firstHalfSpend = firstHalf.reduce((sum: number, d: any) => sum + d.spend, 0);
    const secondHalfSpend = secondHalf.reduce((sum: number, d: any) => sum + d.spend, 0);
    const spendChange = firstHalfSpend > 0 ? ((secondHalfSpend - firstHalfSpend) / firstHalfSpend) * 100 : 0;

    const firstHalfClicks = firstHalf.reduce((sum: number, d: any) => sum + d.clicks, 0);
    const firstHalfImps = firstHalf.reduce((sum: number, d: any) => sum + d.impressions, 0);
    const secondHalfClicks = secondHalf.reduce((sum: number, d: any) => sum + d.clicks, 0);
    const secondHalfImps = secondHalf.reduce((sum: number, d: any) => sum + d.impressions, 0);
    
    const firstHalfCtr = firstHalfImps > 0 ? (firstHalfClicks / firstHalfImps) * 100 : 0;
    const secondHalfCtr = secondHalfImps > 0 ? (secondHalfClicks / secondHalfImps) * 100 : 0;
    const ctrChange = firstHalfCtr > 0 ? ((secondHalfCtr - firstHalfCtr) / firstHalfCtr) * 100 : 0;

    console.log(`✅ Dados de gráficos gerados: ${dailyData.length} dias, ${campaignData.length} campanhas, ${objectiveData.length} objetivos`);

    res.json({
      success: true,
      dailyData,
      campaignData,
      objectiveData,
      dailyByCampaign,
      summary: {
        totalSpend,
        totalImpressions,
        totalClicks,
        avgCtr,
        avgCpc,
        totalConversions,
        spendChange,
        ctrChange
      },
      period: range
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar dados de gráficos:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao buscar dados de gráficos',
      details: error.response?.data || error.message
    });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const distPath = path.join(process.cwd(), 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Rota não encontrada' });
      return;
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📱 Frontend esperado em: ${process.env.VITE_APP_URL}`);
  console.log(`🔗 Callback workspace Meta: ${WORKSPACE_OAUTH_BASE_URL}/api/workspace/oauth/meta/callback`);
  console.log(`🔗 Callback legado Facebook: ${REDIRECT_URI || 'nao configurado'}`);
});
