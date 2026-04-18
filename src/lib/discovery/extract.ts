import * as cheerio from 'cheerio';
import { getLLMProvider } from '@/lib/llm/provider';

export interface ProductCandidate {
  brand: string;
  model: string;
  category_path: string;
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
          category_path: { type: 'string' },
          angle: { type: 'string' },
        },
        required: ['brand', 'model', 'category_path'],
      },
    },
  },
  required: ['products'],
};

const CATEGORY_PATH_RE = /^[a-z0-9_-]+(\/[a-z0-9_-]+)+$/;

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

export interface ExtractOptions {
  /**
   * Optional category-path hint to bias the LLM toward a specific root.
   * Examples: 'beauty/skincare', 'audio/headphones', 'tech/laptops'.
   */
  pathHint?: string;
}

export async function extractCandidates(
  html: string,
  options: ExtractOptions = {}
): Promise<ProductCandidate[]> {
  const text = htmlToText(html);
  const hint = options.pathHint
    ? `\n\nThe article appears to be about ${options.pathHint}, so most or all category_path values should start with that prefix.`
    : '';

  const llm = getLLMProvider();
  const result = await llm.generate({
    system: `You read product review and "best of" articles in any category and extract the list of products being reviewed or recommended.
Return structured JSON with one entry per distinct product mentioned as a recommendation or test subject.
Skip accessories that are not primary products, competitors only mentioned in passing, and any product without a clear brand + model.

For each product, include a "category_path" using a hierarchy like:
- audio/headphones/over-ear, audio/headphones/in-ear, audio/headphones/true-wireless, audio/speakers
- tech/laptops, tech/phones, tech/monitors, tech/cameras
- beauty/skincare/moisturizer, beauty/skincare/serum, beauty/skincare/cleanser, beauty/makeup/foundation, beauty/makeup/lipstick
- fitness/clothing/tights, fitness/clothing/shoes, fitness/equipment/dumbbells

Use lowercase, slash-separated, kebab-case segments only (a-z, 0-9, _, -). Pick the most specific path you can confidently assign.

"angle" is a one-sentence reason why this product is highlighted in the article (use the language from the article).${hint}`,
    messages: [
      {
        role: 'user',
        content: `Article text:\n\n${text}\n\nExtract all distinct products reviewed or recommended.`,
      },
    ],
    responseSchema: CANDIDATE_SCHEMA,
    temperature: 0,
    maxTokens: 4000,
  });
  const parsed = result.parsed as { products?: ProductCandidate[] } | undefined;
  return (parsed?.products ?? []).filter(
    (p) => p.brand && p.model && CATEGORY_PATH_RE.test(p.category_path)
  );
}
