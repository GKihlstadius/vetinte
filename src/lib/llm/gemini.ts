import { GoogleGenAI } from '@google/genai';
import type { LLMProvider, LLMGenerateParams, LLMResult } from './types';

const MODEL = 'gemini-flash-latest';

export function createGeminiProvider(): LLMProvider {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  return {
    name: 'gemini',

    async generate(params: LLMGenerateParams): Promise<LLMResult> {
      const contents = params.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const config: Record<string, unknown> = {
        systemInstruction: params.system,
        temperature: params.temperature ?? 0.4,
        maxOutputTokens: params.maxTokens ?? 2048,
      };

      if (params.responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = params.responseSchema;
      }

      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config,
      });

      const text = response.text || '';
      let parsed: unknown = undefined;
      if (params.responseSchema) {
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(`Gemini returned non-JSON despite schema: ${text.slice(0, 200)}`);
        }
      }
      return {
        text,
        parsed,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    },

    async *generateStream(params: LLMGenerateParams) {
      const contents = params.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
      const stream = await ai.models.generateContentStream({
        model: MODEL,
        contents,
        config: {
          systemInstruction: params.system,
          temperature: params.temperature ?? 0.4,
          maxOutputTokens: params.maxTokens ?? 2048,
        },
      });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) yield { type: 'token' as const, data: text };
      }
      yield { type: 'done' as const, data: null };
    },
  };
}
