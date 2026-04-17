import { createAdminClient } from '@/lib/supabase/admin';

export async function getSupabaseFacts(userId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('user_memory')
    .select('key, value_text')
    .eq('user_id', userId)
    .limit(20);
  return (data ?? []).map((m) => `${m.key}: ${m.value_text}`);
}

export async function upsertSupabaseFact(userId: string, key: string, value: string) {
  const supabase = createAdminClient();
  await supabase.from('user_memory').upsert({
    user_id: userId,
    key,
    value_text: value,
    updated_at: new Date().toISOString(),
  });
}
