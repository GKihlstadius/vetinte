import { createAdminClient } from '@/lib/supabase/admin';

export async function trackUsage(
  provider: string,
  model: string,
  usage: { promptTokens: number; completionTokens: number }
): Promise<void> {
  const supabase = createAdminClient();
  const day = new Date().toISOString().slice(0, 10);
  await supabase.rpc('increment_llm_usage', {
    p_day: day,
    p_provider: provider,
    p_model: model,
    p_requests: 1,
    p_prompt_tokens: usage.promptTokens,
    p_completion_tokens: usage.completionTokens,
  });
}
