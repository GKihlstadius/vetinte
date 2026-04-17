import { getLLMProvider } from '@/lib/llm/provider';
import { retrieveProductsAndChunks } from '@/lib/rag/retrieve';
import { getMemoryFacts, addMessages } from '@/lib/memory';
import { resolvePrimaryLink } from '@/lib/affiliate/resolve';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { RESPONSE_SCHEMA, type ChatResponse, type ChatBlock } from './schema';
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

  const parsed = result.parsed as ChatResponse | undefined;
  const region = params.locale === 'sv' ? 'SE' : 'EN';
  const enrichedBlocks: ChatBlock[] = parsed
    ? await Promise.all(
        (parsed.blocks ?? []).map(async (b): Promise<ChatBlock> => {
          if (b.type === 'product_card') {
            const link = await resolvePrimaryLink(b.product_id, region);
            return { ...b, affiliate_link_id: link?.id };
          }
          if (b.type === 'comparison_table') {
            const links = await Promise.all(
              b.product_ids.map((slug) => resolvePrimaryLink(slug, region))
            );
            return { ...b, affiliate_link_ids: links.map((l) => l?.id ?? '') };
          }
          return b;
        })
      )
    : [];

  const enrichedResponse: ChatResponse = parsed
    ? { ...parsed, blocks: enrichedBlocks }
    : ({ intro_md: '', blocks: [], outro_md: '', followup_suggestions: [] } as ChatResponse);

  if (userId) {
    const assistantText = [enrichedResponse.intro_md, enrichedResponse.outro_md]
      .filter(Boolean)
      .join('\n\n');
    addMessages(userId, params.userMessage, assistantText).catch(() => {});
  }

  const modelByProvider: Record<string, string> = {
    gemini: 'gemini-flash-latest',
    groq: 'llama-3.3-70b-versatile',
  };

  return {
    response: enrichedResponse,
    usage: result.usage,
    provider: llm.name,
    model: modelByProvider[llm.name] ?? llm.name,
    latencyMs: Date.now() - start,
    ragChunksUsed: chunks.length,
  };
}
