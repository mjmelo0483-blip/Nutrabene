
import { GoogleGenAI } from "@google/genai";
import { AssistantMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `Você é o NutraAssistant da Nutrabene. Seu objetivo é ajudar clientes com dúvidas sobre nutrição e saúde capilar. 
Dê conselhos baseados em ciência, sugira produtos da Nutrabene quando apropriado (Tônico Growth, Shampoo NutriRepair, Máscara Bio-Reconstruct, Leave-in Silk Finish).
Seja amigável, profissional e empático. Responda sempre em Português do Brasil.`;

export const getAssistantResponse = async (history: AssistantMessage[]): Promise<string> => {
  try {
    const lastMessage = history[history.length - 1];
    
    // Convert history to Gemini format (contents)
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return response.text || "Desculpe, tive um problema ao processar sua solicitação.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro de conexão. Por favor, tente novamente mais tarde.";
  }
};
