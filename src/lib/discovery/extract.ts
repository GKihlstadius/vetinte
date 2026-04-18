import * as cheerio from 'cheerio';
import { getLLMProvider } from '@/lib/llm/provider';

export interface ProductCandidate {
  brand: string;
  model: string;
  category: 'over-ear' | 'in-ear' | 'true-wireless';
  angle: string | null;
}

const CANDIDATE_SCHEMA = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          brand: { type: 'string' },
          model: { type: 'string' },
          category: {
            type: 'string',
            enum: ['over-ear', 'in-ear', 'true-wireless'],
          },
          angle: { type: 'string' },
        },
        required: ['brand', 'model', 'category'],
      },
    },
  },
  required: ['products'],
};

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, svg').remove();
  const paragraphs: string[] = [];
  $('h1, h2, h3, h4, p, li').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length > 0) paragraphs.push(t);
  });
  return paragraphs.join('\n').slice(0, 15_000);
}

export async function extractCandidates(html: string): Promise<ProductCandidate[]> {
  const text = htmlToText(html);
  const llm = getLLMProvider();
  const result = await llm.generate({
    system: `You read headphone review articles and extract the list of products being reviewed.
Return structured JSON with one entry per distinct headphone model mentioned as a recommendation or test subject.
Skip accessories, competitors only mentioned in passing, and products without a clear brand + model.
Normalise category to one of: over-ear, in-ear, true-wireless. "Angle" is a one-sentence reason why this model is highlighted in the article (language from the article).`,
    messages: [
      {
        role: 'user',
        content: `Article text:\n\n${text}\n\nExtract all distinct headphone products reviewed or recommended in this article.`,
      },
    ],
    responseSchema: CANDIDATE_SCHEMA,
    temperature: 0,
    maxTokens: 4000,
  });
  const parsed = result.parsed as { products?: ProductCandidate[] } | undefined;
  return (parsed?.products ?? []).filter(
    (p) => p.brand && p.model && ['over-ear', 'in-ear', 'true-wireless'].includes(p.category)
  );
}
