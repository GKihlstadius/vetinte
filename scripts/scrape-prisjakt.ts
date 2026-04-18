import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { parsePrisjaktCategory } from '@/lib/scraper/prisjakt';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

interface CategoryJob {
  url: string;
  category_path: string;
  pages?: number;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

function slugify(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'sv-SE,sv;q=0.9' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function processCategory(job: CategoryJob) {
  console.log(`\n=== ${job.category_path} ${job.url} ===`);
  const pages = job.pages ?? 3;
  const allProducts = new Map<string, ReturnType<typeof parsePrisjaktCategory>[number]>();

  for (let page = 1; page <= pages; page++) {
    const url = page === 1 ? job.url : `${job.url}?page=${page}`;
    const html = await fetchPage(url);
    if (!html) {
      console.log(`  page ${page}: fetch failed`);
      continue;
    }
    const items = parsePrisjaktCategory(html);
    for (const item of items) allProducts.set(item.prisjakt_id, item);
    console.log(`  page ${page}: ${items.length} products (total unique: ${allProducts.size})`);
    await new Promise((r) => setTimeout(r, 1000));
  }

  const supabase = createAdminClient();
  const productRows = [...allProducts.values()].map((p) => ({
    slug: slugify(p.brand, p.model),
    brand: p.brand,
    model: p.model,
    category: job.category_path.split('/').pop() ?? 'product',
    category_path: job.category_path,
    image_url: p.image_url,
    editorial_notes: p.category_text,
  }));

  // Insert products (do not overwrite existing data)
  const { error: pErr } = await supabase
    .from('products')
    .upsert(productRows as unknown as never[], {
      onConflict: 'slug',
      ignoreDuplicates: true,
    });
  if (pErr) {
    console.error(`  insert failed: ${pErr.message}`);
    return { count: 0, error: pErr.message };
  }

  // Lookup back the inserted/existing products to get IDs for affiliate links
  const slugs = productRows.map((r) => r.slug);
  const { data: storedProducts } = await supabase
    .from('products')
    .select('id, slug')
    .in('slug', slugs);
  const idBySlug = new Map((storedProducts ?? []).map((p) => [p.slug, p.id]));

  // Insert Prisjakt affiliate link per product (skip if already exists)
  const { data: existing } = await supabase
    .from('affiliate_links')
    .select('product_id')
    .eq('retailer', 'Prisjakt')
    .in('product_id', [...idBySlug.values()]);
  const haveLink = new Set((existing ?? []).map((l) => l.product_id));

  const linkRows = [...allProducts.values()]
    .map((p) => {
      const slug = slugify(p.brand, p.model);
      const productId = idBySlug.get(slug);
      if (!productId || haveLink.has(productId)) return null;
      return {
        product_id: productId,
        retailer: 'Prisjakt',
        url_template: p.product_url,
        network: 'direct',
        currency: 'SEK',
        region: 'SE',
        price_current: null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (linkRows.length > 0) {
    const { error: lErr } = await supabase.from('affiliate_links').insert(linkRows as never);
    if (lErr) console.warn(`  link insert warn: ${lErr.message}`);
  }

  console.log(`  ${productRows.length} products considered, ${linkRows.length} new direct Prisjakt links`);
  return { count: productRows.length };
}

async function main() {
  const file = process.argv[2] ?? 'seed-data/prisjakt-jobs.json';
  const jobs: CategoryJob[] = JSON.parse(readFileSync(file, 'utf8'));

  let total = 0;
  for (const job of jobs) {
    const r = await processCategory(job);
    total += r.count;
  }
  console.log(`\nTotal across categories: ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
