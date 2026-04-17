import { getLLMProvider } from '@/lib/llm/provider';
import { retrieveProducts } from '@/lib/rag/retrieve';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { RESPONSE_SCHEMA, type ChatResponse } from './schema';
import type { LLMMessage } from '@/lib/llm/types';

export interface GenerateChatParams {
  userMessage: string;
  userFacts: string[];
  recentMessages: LLMMessage[];
  locale: 'sv' | 'en';
}

export interface GenerateChatResult {
  response: ChatResponse;
  usage: { promptTokens: number; completionTokens: number };
  provider: string;
  model: string;
  latencyMs: number;
  ragChunksUsed: number;
}

export async function generateChatResponse(
  params: GenerateChatParams
): Promise<GenerateChatResult> {
  const start = Date.now();
  const products = await retrieveProducts(params.userMessage, 10);

  const llm = getLLMProvider();
  const result = await llm.generate({
    system: buildSystemPrompt({ locale: params.locale }),
    messages: [
      ...params.recentMessages,
      { role: 'user', content: buildUserPrompt({ ...params, products }) },
    ],
    responseSchema: RESPONSE_SCHEMA,
    temperature: 0.4,
    maxTokens: 2048,
  });

  return {
    response: result.parsed as ChatResponse,
    usage: result.usage,
    provider: llm.name,
    model: 'gemini-flash-latest',
    latencyMs: Date.now() - start,
    ragChunksUsed: products.length,
  };
}
