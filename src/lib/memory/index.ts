import { getUserFacts, addMessages } from './zep';
import { getSupabaseFacts } from './supabase';

export async function getMemoryFacts(
  userId: string | null,
  query: string
): Promise<string[]> {
  if (!userId) return [];
  const zepFacts = await getUserFacts(userId, query);
  if (zepFacts.length > 0) return zepFacts;
  return getSupabaseFacts(userId);
}

export { addMessages };
