import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { renderPage } from '@/lib/scraper/cloudflare';

config({ path: '.env.local' });

async function main() {
  const url = process.argv[2];
  const out = process.argv[3];
  if (!url || !out) {
    console.error('Usage: tsx scripts/fetch-fixture.ts <url> <output>');
    process.exit(1);
  }
  const html = await renderPage(url, { forceCF: true });
  writeFileSync(out, html);
  console.log(`Wrote ${html.length} bytes to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
