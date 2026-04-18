import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { renderPage } from '@/lib/scraper/cloudflare';
import { extractCandidates, type ProductCandidate } from '@/lib/discovery/extract';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

function slugify(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const url = process.argv[2];
  const mode = process.argv[3] ?? 'dry-run';
  if (!url) {
    console.error('Usage: npm run discover -- <url> [dry-run|insert]');
    process.exit(1);
  }

  console.log(`Fetching ${url}...`);
  const html = await renderPage(url, { forceCF: true });
  console.log(`Got ${html.length} bytes. Extracting candidates via LLM...`);

  const candidates = await extractCandidates(html);
  console.log(`Found ${candidates.length} candidates:`);
  for (const c of candidates) {
    console.log(`  - ${c.brand} ${c.model} (${c.category}) — ${c.angle ?? ''}`);
  }

  if (candidates.length === 0) return;

  const rows = candidates.map((c) => ({
    slug: slugify(c.brand, c.model),
    brand: c.brand,
    model: c.model,
    category: c.category,
    category_path: `audio/headphones/${c.category}`,
    summary_sv: null,
    summary_en: null,
    specs_json: {},
    image_url: null,
    editorial_notes: c.angle,
  }));

  writeFileSync('seed-data/discovered.json', JSON.stringify(rows, null, 2));
  console.log(`\nWrote seed-data/discovered.json with ${rows.length} candidates.`);

  if (mode === 'insert') {
    const supabase = createAdminClient();
    const { error } = await supabase.from('products').upsert(rows as unknown as never[], {
      onConflict: 'slug',
    });
    if (error) throw error;
    console.log(`Upserted ${rows.length} products into Supabase.`);
  } else {
    console.log('\nDry-run mode. Review seed-data/discovered.json, then run with "insert" arg.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
