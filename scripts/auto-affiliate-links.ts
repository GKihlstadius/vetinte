import { config } from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
}

function prisjaktSearchUrl(brand: string, model: string): string {
  const q = encodeURIComponent(`${brand} ${model}`);
  return `https://www.prisjakt.nu/search?search=${q}`;
}

async function main() {
  const supabase = createAdminClient();

  const { data: products } = await supabase.from('products').select('id, slug, brand, model');
  const { data: existingLinks } = await supabase
    .from('affiliate_links')
    .select('product_id')
    .eq('retailer', 'Prisjakt');
  const haveLink = new Set((existingLinks ?? []).map((l) => l.product_id));

  const targets = (products ?? []).filter((p) => !haveLink.has(p.id)) as Product[];
  console.log(`Adding Prisjakt search links for ${targets.length} products...`);

  if (targets.length === 0) return;

  const rows = targets.map((p) => ({
    product_id: p.id,
    retailer: 'Prisjakt',
    url_template: prisjaktSearchUrl(p.brand, p.model),
    network: 'direct',
    currency: 'SEK',
    region: 'SE',
    price_current: null,
  }));

  const { error } = await supabase.from('affiliate_links').insert(rows as never);
  if (error) throw error;
  console.log(`Inserted ${rows.length} Prisjakt search links.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
