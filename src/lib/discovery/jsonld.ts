import * as cheerio from 'cheerio';

export interface JsonLdProduct {
  name?: string;
  brand?: { name?: string } | string;
  image?: string | string[];
  description?: string;
  offers?: { price?: string | number; priceCurrency?: string };
  aggregateRating?: { ratingValue?: string | number; reviewCount?: string | number };
  [key: string]: unknown;
}

export function extractJsonLdProduct(html: string): JsonLdProduct | null {
  const $ = cheerio.load(html);
  const blocks: JsonLdProduct[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().first().text();
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (item && typeof item === 'object') {
          if (item['@type'] === 'Product') blocks.push(item as JsonLdProduct);
          if (Array.isArray(item['@graph'])) {
            for (const g of item['@graph']) {
              if (g?.['@type'] === 'Product') blocks.push(g as JsonLdProduct);
            }
          }
        }
      }
    } catch {
      // skip malformed
    }
  });
  return blocks[0] ?? null;
}

export function brandNameFromJsonLd(p: JsonLdProduct): string | null {
  if (!p.brand) return null;
  if (typeof p.brand === 'string') return p.brand;
  return p.brand.name ?? null;
}
