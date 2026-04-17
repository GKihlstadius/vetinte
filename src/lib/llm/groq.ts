import Groq from 'groq-sdk';
import type { LLMProvider, LLMGenerateParams, LLMResult } from './types';

const MODEL = 'llama-3.3-70b-versatile';

export function createGroqProvider(): LLMProvider {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });

  return {
    name: 'groq',

    async generate(params: LLMGenerateParams): Promise<LLMResult> {
      const systemWithSchema = params.responseSchema
        ? `${params.system}\n\nReturn a single JSON object matching this JSON Schema (no prose, no markdown fences):\n${JSON.stringify(params.responseSchema)}`
        : params.system;

      const messages = [
        { role: 'system' as const, content: systemWithSchema },
        ...params.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const response = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature: params.temperature ?? 0.4,
        max_tokens: params.maxTokens ?? 2048,
        response_format: params.responseSchema ? { type: 'json_object' } : undefined,
      });

      const text = response.choices[0]?.message?.content ?? '';
      let parsed: unknown = undefined;
      if (params.responseSchema) {
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(`Groq returned non-JSON despite schema: ${text.slice(0, 200)}`);
        }
      }

      return {
        text,
        parsed,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    },

    async *generateStream(params: LLMGenerateParams) {
      const messages = [
        { role: 'system' as const, content: params.system },
        ...params.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];
      const stream = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature: params.temperature ?? 0.4,
        max_tokens: params.maxTokens ?? 2048,
        stream: true,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield { type: 'token' as const, data: text };
      }
      yield { type: 'done' as const, data: null };
    },
  };
}
