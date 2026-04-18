import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

async function main() {
  const raw: Record<string, unknown>[] = JSON.parse(
    readFileSync('seed-data/products.json', 'utf8')
  );
  const data = raw.map((row) => ({
    ...row,
    category_path: row.category_path ?? `audio/headphones/${row.category}`,
  }));
  const supabase = createAdminClient();
  const { error } = await supabase.from('products').upsert(data as never, { onConflict: 'slug' });
  if (error) throw error;
  console.log(`Seeded ${data.length} products`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
