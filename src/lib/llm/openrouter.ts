import OpenAI from 'openai';
import type { LLMProvider, LLMGenerateParams, LLMResult } from './types';

const FREE_MODELS = [
  'z-ai/glm-4.5-air:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-3-27b-it:free',
];

function shouldTryNext(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|503|502|504|rate.?limit|temporarily|exhaust|no healthy upstream|Provider returned error/i.test(
    msg
  );
}

export function createOpenRouterProvider(): LLMProvider {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://betyget.vercel.app',
      'X-Title': 'Betyget',
    },
  });

  async function tryModel(model: string, params: LLMGenerateParams): Promise<LLMResult> {
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
      model,
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
        throw new Error(`OpenRouter ${model} returned non-JSON: ${text.slice(0, 200)}`);
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
  }

  return {
    name: 'openrouter',

    async generate(params: LLMGenerateParams): Promise<LLMResult> {
      let lastErr: unknown = null;
      for (const model of FREE_MODELS) {
        try {
          return await tryModel(model, params);
        } catch (e) {
          lastErr = e;
          if (!shouldTryNext(e)) throw e;
          console.warn(`OpenRouter ${model} unavailable, trying next`);
        }
      }
      throw lastErr ?? new Error('All OpenRouter free models exhausted');
    },

    async *generateStream(params: LLMGenerateParams) {
      let lastErr: unknown = null;
      for (const model of FREE_MODELS) {
        try {
          const messages = [
            { role: 'system' as const, content: params.system },
            ...params.messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          ];
          const stream = await client.chat.completions.create({
            model,
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
          return;
        } catch (e) {
          lastErr = e;
          if (!shouldTryNext(e)) throw e;
          console.warn(`OpenRouter ${model} unavailable for stream, trying next`);
        }
      }
      throw lastErr ?? new Error('All OpenRouter free models exhausted');
    },
  };
}
