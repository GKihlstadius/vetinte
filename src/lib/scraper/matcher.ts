import { getLLMProvider } from '@/lib/llm/provider';

export interface MatchInput {
  title: string | null;
  text: string;
  candidates: { slug: string; brand: string; model: string }[];
}

function tryNaiveMatch(input: MatchInput): string | null {
  const haystack = `${input.title ?? ''} ${input.text.slice(0, 500)}`.toLowerCase();
  const scored = input.candidates
    .map((c) => {
      const brand = c.brand.toLowerCase();
      const model = c.model.toLowerCase();
      const brandHit = haystack.includes(brand);
      const modelHit = haystack.includes(model);
      return { slug: c.slug, score: (brandHit ? 1 : 0) + (modelHit ? 2 : 0) };
    })
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return null;
  if (scored.length === 1 || scored[0].score > scored[1].score) return scored[0].slug;
  return null;
}

export async function matchProduct(input: MatchInput): Promise<string | null> {
  const naive = tryNaiveMatch(input);
  if (naive) return naive;

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
