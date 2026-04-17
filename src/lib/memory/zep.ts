import { ZepClient } from '@getzep/zep-cloud';

let client: ZepClient | null = null;

function getZep(): ZepClient | null {
  if (!process.env.ZEP_API_KEY) return null;
  if (!client) client = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  return client;
}

export async function ensureUser(userId: string): Promise<boolean> {
  const zep = getZep();
  if (!zep) return false;
  try {
    await zep.user.get(userId);
    return true;
  } catch {
    try {
      await zep.user.add({ userId, metadata: { source: 'betyget' } });
      return true;
    } catch {
      return false;
    }
  }
}

export async function addMessages(
  userId: string,
  userMsg: string,
  assistantMsg: string
): Promise<void> {
  const zep = getZep();
  if (!zep) return;
  await ensureUser(userId);
  try {
    await (zep.graph as unknown as { add: (p: unknown) => Promise<void> }).add({
      userId,
      type: 'message',
      data: JSON.stringify({
        messages: [
          { role: 'user', content: userMsg },
          { role: 'assistant', content: assistantMsg },
        ],
      }),
    });
  } catch {
    // swallow — best effort
  }
}

export async function getUserFacts(userId: string, query: string): Promise<string[]> {
  const zep = getZep();
  if (!zep) return [];
  try {
    const results = await (
      zep.graph as unknown as {
        search: (p: unknown) => Promise<{ edges?: { fact?: string }[] }>;
      }
    ).search({ userId, query, limit: 8 });
    return (results.edges ?? [])
      .map((e) => e.fact ?? '')
      .filter((f): f is string => f.length > 10);
  } catch {
    return [];
  }
}
