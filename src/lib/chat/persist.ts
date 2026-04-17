import { createAdminClient } from '@/lib/supabase/admin';

export async function ensureSession(
  userId: string | null,
  sessionId: string | null,
  firstMessage: string
): Promise<string> {
  if (sessionId) return sessionId;
  if (!userId) return crypto.randomUUID();
  const supabase = createAdminClient();
  const title = firstMessage.slice(0, 60);
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, title })
    .select('id')
    .single();
  if (error || !data) return crypto.randomUUID();
  return data.id;
}

export interface SaveTurnParams {
  sessionId: string;
  userId: string | null;
  userMessage: string;
  assistantMessage: string;
  cardsJson: unknown[];
  usage: { promptTokens: number; completionTokens: number };
  provider: string;
  model: string;
  latencyMs: number;
  ragChunksUsed: number;
}

export async function saveTurn(params: SaveTurnParams): Promise<void> {
  if (!params.userId) return;
  const supabase = createAdminClient();
  await supabase.from('chat_messages').insert([
    {
      session_id: params.sessionId,
      role: 'user',
      content_md: params.userMessage,
    },
    {
      session_id: params.sessionId,
      role: 'assistant',
      content_md: params.assistantMessage,
      cards_json: params.cardsJson as never,
      llm_provider: params.provider,
      llm_model: params.model,
      latency_ms: params.latencyMs,
      prompt_tokens: params.usage.promptTokens,
      completion_tokens: params.usage.completionTokens,
      rag_chunks_used: params.ragChunksUsed,
    },
  ]);
}
