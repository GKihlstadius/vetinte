import { getLLMProvider } from '@/lib/llm/provider';

export interface MatchInput {
  title: string | null;
  text: string;
  candidates: { slug: string; brand: string; model: string }[];
}

export async function matchProduct(input: MatchInput): Promise<string | null> {
  const llm = getLLMProvider();
  const list = input.candidates.map((c) => `- ${c.slug}: ${c.brand} ${c.model}`).join('\n');
  const snippet = input.text.slice(0, 2000);
  const result = await llm.generate({
    system:
      'You match product reviews to catalog entries. Return only the slug of the single best match, or the word "none". Do not explain. No markdown.',
    messages: [
      {
        role: 'user',
        content: `Title: ${input.title}\nText: ${snippet}\n\nCandidates:\n${list}\n\nReturn only the slug (or "none").`,
      },
    ],
    maxTokens: 200,
    temperature: 0,
  });
  const raw = result.text.trim().replace(/^["']|["']$/g, '').toLowerCase();
  if (raw === 'none' || !raw) return null;
  const match = input.candidates.find((c) => c.slug.toLowerCase() === raw);
  return match ? match.slug : null;
}
