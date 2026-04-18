import { config } from 'dotenv';
import * as cheerio from 'cheerio';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
}

async function searchImage(brand: string, model: string): Promise<string | null> {
  // Use DuckDuckGo HTML search and grab the first image-bearing result page,
  // then read its og:image. Free, no API key needed.
  const query = `${brand} ${model} product`;
  const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const html = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BetygetBot/1.0)' },
      signal: AbortSignal.timeout(15_000),
    }).then((r) => r.text());

    const $ = cheerio.load(html);
    const links = $('a.result__a, a.result__url')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(
        (h): h is string =>
          !!h &&
          h.startsWith('http') &&
          !h.includes('duckduckgo.com') &&
          !h.includes('youtube.com') &&
          !h.includes('reddit.com')
      )
      .slice(0, 4);

    for (const link of links) {
      try {
        const page = await fetch(link, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BetygetBot/1.0)' },
          signal: AbortSignal.timeout(10_000),
        }).then((r) => r.text());
        const $$ = cheerio.load(page);
        const og =
          $$('meta[property="og:image"]').attr('content') ||
          $$('meta[name="twitter:image"]').attr('content');
        if (og && og.startsWith('http')) return og;
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }
  return null;
}

async function main() {
  const limitArg = process.argv[2];
  const limit = limitArg ? parseInt(limitArg, 10) : 30;

  const supabase = createAdminClient();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, brand, model')
    .is('image_url', null)
    .limit(limit);
  if (error) throw error;

  const targets = (products ?? []) as Product[];
  console.log(`Fetching images for ${targets.length} products...`);

  let ok = 0;
  for (const p of targets) {
    const url = await searchImage(p.brand, p.model);
    if (url) {
      await supabase.from('products').update({ image_url: url }).eq('id', p.id);
      ok += 1;
      console.log(`  ${p.slug}: ${url.slice(0, 80)}`);
    } else {
      console.log(`  ${p.slug}: (no image found)`);
    }
    // gentle pacing
    await new Promise((r) => setTimeout(r, 800));
  }
  console.log(`\nDone. ${ok}/${targets.length} got images.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
