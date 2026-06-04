/**
 * n8n Integration Service
 * Envia dados para webhooks do n8n (Evolution API WhatsApp)
 */
import { getPublicEnv } from './publicEnv';

interface WhatsAppMessage {
  number: string; // Ex: 5511999999999
  message: string;
  accountName?: string;
  reportType?: 'daily' | '60days';
}

interface N8nWebhookResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class N8nService {
  private webhookUrl: string;

  constructor(webhookUrl?: string) {
    // URL do webhook n8n (pode vir do .env ou ser passada)
    this.webhookUrl = webhookUrl || getPublicEnv('VITE_N8N_WEBHOOK_URL') || '';
  }

  /**
   * Envia mensagem WhatsApp via n8n webhook
   */
  async sendWhatsAppMessage(data: WhatsAppMessage): Promise<N8nWebhookResponse> {
    if (!this.webhookUrl) {
      throw new Error('N8N webhook URL not configured');
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: data.number,
          message: data.message,
          accountName: data.accountName,
          reportType: data.reportType || 'daily',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n webhook failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.messageId || result.id
      };
    } catch (error) {
      console.error('Error sending WhatsApp via n8n:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Envia relatório diário
   */
  async sendDailyReport(
    whatsappNumber: string,
    reportMessage: string,
    accountName: string
  ): Promise<N8nWebhookResponse> {
    return this.sendWhatsAppMessage({
      number: whatsappNumber,
      message: reportMessage,
      accountName,
      reportType: 'daily'
    });
  }

  /**
   * Testa conexão com webhook (health check)
   */
  async testConnection(): Promise<boolean> {
    if (!this.webhookUrl) return false;

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, message: 'Health check from Nexus AI' })
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Valida formato de número WhatsApp
   */
  static validateWhatsAppNumber(number: string): boolean {
    // Remove todos os caracteres não numéricos
    const cleaned = number.replace(/\D/g, '');

    // Deve ter entre 10 e 15 dígitos (código país + DDD + número)
    // Ex: 5511999999999 (Brasil com 9 dígitos)
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Formata número para padrão WhatsApp
   */
  static formatWhatsAppNumber(number: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = number.replace(/\D/g, '');

    // Se não tem código do país, adiciona 55 (Brasil)
    if (cleaned.length === 11 || cleaned.length === 10) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }
}
