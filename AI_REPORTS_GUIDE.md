# 🤖 Integração com IA para Relatórios Inteligentes

Este documento mostra como usar Gemini ou OpenAI para gerar relatórios automatizados das campanhas.

## 🎯 Objetivo

Transformar dados brutos do Facebook Ads em relatórios humanizados e acionáveis para enviar via WhatsApp.

---

## 📊 Exemplo de Dados do Facebook

Quando você busca insights de uma campanha, recebe algo assim:

```json
{
  "campaign_name": "Black Friday - Loja Online",
  "impressions": "15430",
  "clicks": "342",
  "spend": "127.50",
  "ctr": "2.217",
  "cpc": "0.37",
  "cpm": "8.26",
  "reach": "12890",
  "actions": [
    {
      "action_type": "purchase",
      "value": "23"
    },
    {
      "action_type": "add_to_cart",
      "value": "89"
    }
  ]
}
```

---

## 🧠 Opção 1: Gemini (Recomendado)

### Instalar SDK

```bash
npm install @google/generative-ai
```

### Configurar no `.env`

```env
GEMINI_API_KEY="sua_chave_gemini"
```

### Implementação no Backend

Adicione ao `server.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Rota para gerar relatório com IA
app.post('/api/generate-report', async (req: Request, res: Response) => {
  const { insights } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Você é um analista de tráfego pago sênior com 10 anos de experiência. 
Analise os dados de performance das campanhas abaixo e gere um relatório objetivo e acionável para o gestor.

**REGRAS:**
1. Seja direto e informal (você está falando com o dono da empresa)
2. Use emojis para destacar pontos importantes
3. Máximo de 200 palavras
4. Destaque: O que está indo BEM e o que precisa de ATENÇÃO URGENTE
5. Dê 1-2 recomendações práticas
6. Use linguagem de WhatsApp (sem formalidades)

**DADOS DAS CAMPANHAS:**
${JSON.stringify(insights, null, 2)}

**FORMATO DO RELATÓRIO:**
📊 [Data] - Resumo do Dia

🔥 Destaques Positivos:
[liste o que está performando acima da média]

⚠️ Pontos de Atenção:
[liste o que precisa de ajuste]

💡 Recomendação:
[1-2 ações práticas para melhorar hoje]

💰 Investimento: R$ [total gasto]
🎯 Resultados: [principais conversões]
`;

    const result = await model.generateContent(prompt);
    const reportText = result.response.text();

    res.json({ 
      report: reportText,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar relatório com IA',
      details: error.message 
    });
  }
});
```

### Exemplo de Saída

```
📊 24/11/2025 - Resumo do Dia

🔥 Destaques Positivos:
✅ Black Friday bateu 23 vendas com CTR de 2.21% (acima da média!)
✅ CPC tá barato: R$ 0,37 por clique
✅ 89 pessoas adicionaram produtos no carrinho

⚠️ Pontos de Atenção:
🚨 CPM subiu pra R$ 8,26 (competição pesada hoje)
⚠️ Taxa de conversão de carrinho pra compra tá em 25% (pode melhorar)

💡 Recomendação:
Cria um anúncio de retargeting pros 66 que deixaram produto no carrinho. 
Usa um cupom de 10% OFF urgente. Isso pode gerar +15 vendas hoje ainda.

💰 Investimento: R$ 127,50
🎯 Resultados: 23 vendas + 89 carrinhos
```

---

## 🤖 Opção 2: OpenAI (GPT-4)

### Instalar SDK

```bash
npm install openai
```

### Configurar no `.env`

```env
OPENAI_API_KEY="sk-..."
```

### Implementação

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/generate-report', async (req: Request, res: Response) => {
  const { insights } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um analista de tráfego sênior. Analise dados de campanhas e gere relatórios curtos e acionáveis para WhatsApp. Use emojis e seja direto.`
        },
        {
          role: "user",
          content: `Analise estes dados e gere um resumo de até 200 palavras:\n\n${JSON.stringify(insights, null, 2)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const reportText = completion.choices[0].message.content;

    res.json({ 
      report: reportText,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar relatório',
      details: error.message 
    });
  }
});
```

---

## 📱 Integração com WhatsApp

### Configurar WhatsApp Business API

1. **Obter credenciais**:
   - Acesse https://developers.facebook.com/apps
   - Adicione produto "WhatsApp Business API"
   - Anote o **Phone Number ID** e **Token**

2. **Adicionar ao `.env`**:
```env
WHATSAPP_PHONE_ID="123456789"
WHATSAPP_TOKEN="EAA..."
```

### Função de Envio

Adicione ao `server.ts`:

```typescript
interface WhatsAppMessage {
  to: string;
  message: string;
}

async function sendWhatsAppMessage({ to, message }: WhatsAppMessage) {
  const url = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  
  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Erro ao enviar WhatsApp:', error.response?.data || error.message);
    throw error;
  }
}

// Rota completa: Gerar e enviar relatório
app.post('/api/send-daily-report', async (req: Request, res: Response) => {
  const { adAccountId, campaignIds, whatsappNumber } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  try {
    // 1. Buscar insights do Facebook
    const insightsResponse = await axios.post(
      'http://localhost:3001/api/insights',
      { adAccountId, campaignIds, datePreset: 'yesterday' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const insights = insightsResponse.data.insights;

    // 2. Gerar relatório com IA
    const reportResponse = await axios.post(
      'http://localhost:3001/api/generate-report',
      { insights }
    );

    const report = reportResponse.data.report;

    // 3. Enviar via WhatsApp
    await sendWhatsAppMessage({
      to: whatsappNumber,
      message: report
    });

    res.json({
      success: true,
      message: 'Relatório enviado com sucesso',
      sentAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Erro ao enviar relatório:', error);
    res.status(500).json({ 
      error: 'Erro ao enviar relatório',
      details: error.message 
    });
  }
});
```

---

## 🔄 Workflow Completo no n8n

### Fluxo Diário (08:00 AM)

```
┌─────────────┐
│ Cron Trigger│ (Todo dia 08:00)
└──────┬──────┘
       │
┌──────▼──────┐
│  Supabase   │ (Buscar contas ativas)
└──────┬──────┘
       │
┌──────▼──────┐
│  Loop       │ (Para cada conta)
└──────┬──────┘
       │
┌──────▼──────┐
│ HTTP Request│ (Buscar insights da API)
└──────┬──────┘
       │
┌──────▼──────┐
│ HTTP Request│ (Gerar relatório com IA)
└──────┬──────┘
       │
┌──────▼──────┐
│ HTTP Request│ (Enviar WhatsApp)
└──────┬──────┘
       │
┌──────▼──────┐
│  Supabase   │ (Salvar log)
└─────────────┘
```

### Código do Workflow (JSON)

```json
{
  "name": "Envio Diário de Relatórios",
  "nodes": [
    {
      "name": "Trigger Diário",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "rule": {
          "hour": 8,
          "minute": 0
        }
      }
    },
    {
      "name": "Buscar Contas",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://seu-backend.com/api/active-accounts",
        "method": "GET"
      }
    },
    {
      "name": "Enviar Relatório",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://seu-backend.com/api/send-daily-report",
        "method": "POST",
        "body": {
          "adAccountId": "={{ $json.ad_account_id }}",
          "campaignIds": "={{ $json.campaign_ids }}",
          "whatsappNumber": "={{ $json.whatsapp_number }}"
        },
        "headers": {
          "Authorization": "Bearer {{ $json.token }}"
        }
      }
    }
  ]
}
```

---

## 🎨 Templates de Prompts Avançados

### Prompt para Alertas Críticos

```typescript
const criticalAlertPrompt = `
Você é um sistema de alerta de campanhas.

Analise os dados abaixo e identifique APENAS problemas CRÍTICOS que precisam de ação IMEDIATA:

1. CPM subiu mais de 50% em relação à média
2. CTR abaixo de 0.5%
3. Budget sendo gasto sem conversões
4. CPC acima de R$ 5,00

Se houver problemas, retorne um alerta direto:
"🚨 ALERTA: [problema] - [recomendação urgente]"

Se não houver problemas críticos, retorne: "✅ Sem alertas críticos"

Dados: ${JSON.stringify(insights)}
`;
```

### Prompt para Análise Competitiva

```typescript
const competitiveAnalysisPrompt = `
Compare o desempenho desta campanha com os benchmarks da indústria:

Benchmarks E-commerce:
- CTR médio: 1.5%
- CPC médio: R$ 0.80
- Taxa de conversão: 2-3%

Sua campanha:
${JSON.stringify(insights)}

Diga se está acima, na média ou abaixo do mercado.
`;
```

---

## 📊 Métricas Recomendadas para Monitorar

```typescript
interface CampaignMetrics {
  // Métricas de Alcance
  impressions: number;
  reach: number;
  frequency: number;
  
  // Métricas de Engajamento
  clicks: number;
  ctr: number;  // Click-Through Rate
  cpc: number;  // Cost Per Click
  cpm: number;  // Cost Per Mille
  
  // Métricas de Conversão
  conversions: number;
  conversion_rate: number;
  cpa: number;  // Cost Per Acquisition
  roas: number; // Return on Ad Spend
  
  // Métricas Financeiras
  spend: number;
  revenue: number;
  profit: number;
}
```

---

## 🧪 Testar Geração de Relatório

Crie um endpoint de teste no `server.ts`:

```typescript
app.get('/api/test-report', async (req: Request, res: Response) => {
  // Dados mockados para teste
  const mockInsights = [
    {
      campaign_name: "Teste - Produto X",
      impressions: "10000",
      clicks: "250",
      spend: "85.00",
      ctr: "2.5",
      cpc: "0.34",
      actions: [
        { action_type: "purchase", value: "15" }
      ]
    }
  ];

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(`
      Analise: ${JSON.stringify(mockInsights)}
      Gere um relatório de WhatsApp curto e direto.
    `);

    res.json({ report: result.response.text() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

Teste:
```bash
curl http://localhost:3001/api/test-report
```

---

## ✅ Checklist de Implementação

- [ ] Escolher IA (Gemini ou OpenAI)
- [ ] Adicionar chave de API ao `.env`
- [ ] Implementar rota `/api/generate-report`
- [ ] Testar geração com dados mockados
- [ ] Configurar WhatsApp Business API
- [ ] Implementar função `sendWhatsAppMessage`
- [ ] Testar envio para seu próprio número
- [ ] Integrar com workflow do n8n
- [ ] Configurar cron job diário
- [ ] Monitorar logs de envio

---

## 💡 Dicas Profissionais

1. **Cache de prompts**: Salve templates no banco para editar sem deploy
2. **A/B Test**: Teste diferentes estilos de relatório e veja qual cliente prefere
3. **Personalização**: Permita que cada cliente escolha o tom (formal/informal)
4. **Alertas inteligentes**: Envie mensagens extras se houver problemas críticos
5. **Relatório semanal**: Além do diário, envie um resumo mais completo toda sexta

---

**Próximo passo**: Implementar uma dessas opções e fazer o primeiro envio de teste!
