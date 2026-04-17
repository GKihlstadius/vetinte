import { getLLMProvider } from '@/lib/llm/provider';
import { retrieveProductsAndChunks } from '@/lib/rag/retrieve';
import { getMemoryFacts, addMessages } from '@/lib/memory';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { RESPONSE_SCHEMA, type ChatResponse } from './schema';
import type { LLMMessage } from '@/lib/llm/types';

export interface GenerateChatParams {
  userMessage: string;
  userId?: string | null;
  userFacts?: string[];
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
  const userId = params.userId ?? null;

  const [ragResult, memoryFacts] = await Promise.all([
    retrieveProductsAndChunks(params.userMessage, 10),
    params.userFacts ? Promise.resolve(params.userFacts) : getMemoryFacts(userId, params.userMessage),
  ]);
  const { products, chunks } = ragResult;

  const llm = getLLMProvider();
  const result = await llm.generate({
    system: buildSystemPrompt({ locale: params.locale }),
    messages: [
      ...params.recentMessages,
      {
        role: 'user',
        content: buildUserPrompt({
          userMessage: params.userMessage,
          products,
          chunks,
          userFacts: memoryFacts,
          recentMessages: params.recentMessages,
          locale: params.locale,
        }),
      },
    ],
    responseSchema: RESPONSE_SCHEMA,
    temperature: 0.4,
    maxTokens: 8192,
  });

  if (userId) {
    const assistantText = [
      (result.parsed as ChatResponse)?.intro_md,
      (result.parsed as ChatResponse)?.outro_md,
    ]
      .filter(Boolean)
      .join('\n\n');
    addMessages(userId, params.userMessage, assistantText).catch(() => {});
  }

  const modelByProvider: Record<string, string> = {
    gemini: 'gemini-flash-latest',
    groq: 'llama-3.3-70b-versatile',
  };

  return {
    response: result.parsed as ChatResponse,
    usage: result.usage,
    provider: llm.name,
    model: modelByProvider[llm.name] ?? llm.name,
    latencyMs: Date.now() - start,
    ragChunksUsed: chunks.length,
  };
}
