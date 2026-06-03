import { GoogleGenAI } from "@google/genai";
import { MockAdData } from "../types";

export const generateTrafficReport = async (
  adData: MockAdData,
  customInstructions?: string
): Promise<string> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    const errorMessage = "Erro: A chave de API do Gemini não foi configurada. Verifique suas variáveis de ambiente.";
    console.error(errorMessage);
    return errorMessage;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash";
    
    // Prompt de Sistema refinado conforme solicitado
    const systemInstruction = `
      Você é um analista de tráfego sênior. 
      Analise os dados JSON abaixo das campanhas de hoje. 
      
      Diretrizes Obrigatórias:
      1. Destaque o que está performando muito bem (ROAS alto, Custo por Lead baixo).
      2. Dê um alerta se algo estiver queimando dinheiro (CPC alto sem venda, ROAS < 2).
      3. Use emojis estrategicamente para facilitar a leitura rápida 🚀 🛑 💰.
      4. O texto deve ser curto (máximo 3 blocos pequenos de texto).
      5. Não use termos técnicos complexos sem contexto. Fale a língua do dono do negócio.
      6. Se não houver gastos significativos, informe que o dia foi tranquilo.
    `;

    // Passamos o JSON bruto para a IA interpretar, simulando o "nó de IA" no n8n
    const userPrompt = `
      CONTEXTO DO CLIENTE:
      Empresa: ${adData.account_name}
      Data: ${adData.date_preset}

      DADOS BRUTOS DO FACEBOOK ADS (JSON):
      ${JSON.stringify(adData.data, null, 2)}

      ${customInstructions ? `INSTRUÇÕES EXTRAS DO GESTOR: ${customInstructions}` : ''}
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6, // Temperatura um pouco mais baixa para ser mais analítico
        maxOutputTokens: 500,
      },
    });

    return response.text || "Não foi possível gerar a análise.";
  } catch (error) {
    console.error("Error generating report:", error);
    return "Erro ao conectar com a IA. Verifique sua chave de API ou tente novamente.";
  }
};
