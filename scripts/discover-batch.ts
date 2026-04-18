import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
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

async function processOne(url: string, pathHint?: string) {
  console.log(`\n=== ${url}${pathHint ? ` (hint: ${pathHint})` : ''} ===`);
  let html: string;
  try {
    html = await renderPage(url, { forceCF: true });
  } catch {
    console.log('CF failed, trying direct fetch...');
    html = await renderPage(url);
  }
  const candidates = await extractCandidates(html, { pathHint });
  console.log(`Found ${candidates.length} candidates.`);
  if (candidates.length === 0) return { url, inserted: 0 };

  const rows = candidates.map((c) => ({
    slug: slugify(c.brand, c.model),
    brand: c.brand,
    model: c.model,
    category: lastSegment(c.category_path),
    category_path: c.category_path,
    editorial_notes: c.angle,
  }));

  const supabase = createAdminClient();
  // ignoreDuplicates so existing summaries/specs/images are preserved
  const { error } = await supabase.from('products').upsert(rows as unknown as never[], {
    onConflict: 'slug',
    ignoreDuplicates: true,
  });
  if (error) {
    console.error(`Insert failed: ${error.message}`);
    return { url, inserted: 0, error: error.message };
  }
  return { url, inserted: rows.length };
}

interface JobInput {
  urls: string[];
  pathHint?: string;
}

function parseFile(file: string): JobInput {
  const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (Array.isArray(raw)) return { urls: raw as string[] };
  const obj = raw as { urls?: string[]; pathHint?: string };
  return { urls: obj.urls ?? [], pathHint: obj.pathHint };
}

async function main() {
  const file = process.argv[2] ?? 'seed-data/discover-urls.json';
  const cliHint = process.argv[3];
  const job = parseFile(file);
  const pathHint = cliHint ?? job.pathHint;

  const results: { url: string; inserted: number; error?: string }[] = [];
  for (const url of job.urls) {
    try {
      results.push(await processOne(url, pathHint));
    } catch (e) {
      console.error(`Failed ${url}:`, (e as Error).message);
      results.push({ url, inserted: 0, error: (e as Error).message });
    }
  }
  console.log('\n=== Summary ===');
  let total = 0;
  for (const r of results) {
    console.log(`${r.inserted.toString().padStart(3)}  ${r.url}${r.error ? ` (${r.error})` : ''}`);
    total += r.inserted;
  }
  console.log(`\nTotal upserts: ${total} (counts include duplicates of existing slugs)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
