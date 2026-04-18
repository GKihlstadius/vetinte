import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { renderPage } from '@/lib/scraper/cloudflare';
import { extractCandidates } from '@/lib/discovery/extract';
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

function lastSegment(path: string): string {
  return path.split('/').pop() ?? path;
}

async function main() {
  const url = process.argv[2];
  const mode = process.argv[3] ?? 'dry-run';
  const pathHint = process.argv[4];
  if (!url) {
    console.error('Usage: npm run discover -- <url> [dry-run|insert] [pathHint]');
    process.exit(1);
  }

  console.log(`Fetching ${url}...`);
  const html = await renderPage(url, { forceCF: true });
  console.log(`Got ${html.length} bytes. Extracting candidates via LLM...`);

  const candidates = await extractCandidates(html, { pathHint });
  console.log(`Found ${candidates.length} candidates:`);
  for (const c of candidates) {
    console.log(`  - ${c.brand} ${c.model} (${c.category_path}) — ${c.angle ?? ''}`);
  }

  if (candidates.length === 0) return;

  const rows = candidates.map((c) => ({
    slug: slugify(c.brand, c.model),
    brand: c.brand,
    model: c.model,
    category: lastSegment(c.category_path),
    category_path: c.category_path,
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
