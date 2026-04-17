import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

async function main() {
  const data = JSON.parse(readFileSync('seed-data/products.json', 'utf8'));
  const supabase = createAdminClient();
  const { error } = await supabase.from('products').upsert(data, { onConflict: 'slug' });
  if (error) throw error;
  console.log(`Seeded ${data.length} products`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
