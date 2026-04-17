import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

interface SeedRow {
  product_slug: string;
  retailer: string;
  url_template: string;
  network: string;
  currency: string;
  region: string;
  price_current: number | null;
}

async function main() {
  const rows: SeedRow[] = JSON.parse(
    readFileSync('seed-data/affiliate-links.json', 'utf8')
  );
  const supabase = createAdminClient();

  const { data: products } = await supabase.from('products').select('id, slug');
  const bySlug = new Map((products ?? []).map((p) => [p.slug, p.id]));

  const toInsert = rows
    .map((r) => {
      const productId = bySlug.get(r.product_slug);
      if (!productId) return null;
      return {
        product_id: productId,
        retailer: r.retailer,
        url_template: r.url_template,
        network: r.network,
        currency: r.currency,
        region: r.region,
        price_current: r.price_current,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (toInsert.length === 0) {
    console.log('No rows to insert');
    return;
  }

  const { error } = await supabase.from('affiliate_links').insert(toInsert);
  if (error) throw error;
  console.log(`Seeded ${toInsert.length} affiliate links`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
