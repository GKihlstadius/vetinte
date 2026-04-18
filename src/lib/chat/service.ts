import { getLLMProvider } from '@/lib/llm/provider';
import { retrieveProductsAndChunks, type RetrievedChunk } from '@/lib/rag/retrieve';
import { getMemoryFacts, addMessages } from '@/lib/memory';
import { resolvePrimaryLink } from '@/lib/affiliate/resolve';
import { trackUsage } from '@/lib/llm/usage';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { RESPONSE_SCHEMA, type ChatResponse, type ChatBlock } from './schema';
import type { LLMMessage } from '@/lib/llm/types';

const LONG_TAIL_SIMILARITY_THRESHOLD = 0.6;

async function logLongTailMiss(
  userId: string | null,
  query: string,
  chunks: RetrievedChunk[]
): Promise<void> {
  if (chunks.length === 0 || averageSimilarity(chunks) >= LONG_TAIL_SIMILARITY_THRESHOLD) {
    if (chunks.length > 0) return;
  }
  try {
    const db = createAdminClient();
    await db.from('long_tail_misses').insert({
      user_id: userId,
      query_text: query,
    });
  } catch {
    // best-effort
  }
}

function averageSimilarity(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0;
  return chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length;
}

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

async function getUserTone(userId: string | null): Promise<'casual' | 'formal' | 'direct' | 'funny'> {
  if (!userId) return 'casual';
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('profiles')
      .select('ai_tone')
      .eq('id', userId)
      .single();
    const t = data?.ai_tone;
    if (t === 'formal' || t === 'direct' || t === 'funny') return t;
    return 'casual';
  } catch {
    return 'casual';
  }
}

export async function generateChatResponse(
  params: GenerateChatParams
): Promise<GenerateChatResult> {
  const start = Date.now();
  const userId = params.userId ?? null;

  const [ragResult, memoryFacts, tone] = await Promise.all([
    retrieveProductsAndChunks(params.userMessage, 10),
    params.userFacts ? Promise.resolve(params.userFacts) : getMemoryFacts(userId, params.userMessage),
    getUserTone(userId),
  ]);
  const { products, chunks } = ragResult;

  const llm = getLLMProvider();
  const result = await llm.generate({
    system: buildSystemPrompt({ locale: params.locale, tone }),
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

  const parsed = (result.parsed ?? {}) as Partial<ChatResponse>;
  const region = params.locale === 'sv' ? 'SE' : 'EN';
  const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
  const enrichedBlocks: ChatBlock[] = await Promise.all(
    rawBlocks.map(async (b): Promise<ChatBlock> => {
      if (b.type === 'product_card' && b.product_id) {
        const link = await resolvePrimaryLink(b.product_id, region);
        return { ...b, affiliate_link_id: link?.id };
      }
      if (b.type === 'comparison_table' && Array.isArray(b.product_ids)) {
        const links = await Promise.all(
          b.product_ids.map((slug) => resolvePrimaryLink(slug, region))
        );
        return { ...b, affiliate_link_ids: links.map((l) => l?.id ?? '') };
      }
      return b;
    })
  );

  const enrichedResponse: ChatResponse = {
    intro_md: typeof parsed.intro_md === 'string' ? parsed.intro_md : '',
    blocks: enrichedBlocks,
    outro_md: typeof parsed.outro_md === 'string' ? parsed.outro_md : '',
    followup_suggestions: Array.isArray(parsed.followup_suggestions)
      ? parsed.followup_suggestions.filter((s): s is string => typeof s === 'string')
      : [],
  };

  if (userId) {
    const assistantText = [enrichedResponse.intro_md, enrichedResponse.outro_md]
      .filter(Boolean)
      .join('\n\n');
    addMessages(userId, params.userMessage, assistantText).catch(() => {});
  }

  const modelByProvider: Record<string, string> = {
    gemini: 'gemini-flash-latest',
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  };
  const actualProvider = result.provider ?? llm.name;
  const modelName = modelByProvider[actualProvider] ?? actualProvider;

  trackUsage(actualProvider, modelName, result.usage).catch(() => {});
  logLongTailMiss(userId, params.userMessage, chunks).catch(() => {});

  return {
    response: enrichedResponse,
    usage: result.usage,
    provider: actualProvider,
    model: modelName,
    latencyMs: Date.now() - start,
    ragChunksUsed: chunks.length,
  };
}
