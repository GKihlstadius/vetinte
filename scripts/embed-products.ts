import { config } from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';
import { embed } from '@/lib/llm/embeddings';
import { chunkText } from '@/lib/scraper/chunker';

config({ path: '.env.local' });

interface ProductRow {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category_path: string;
  summary_sv: string | null;
  summary_en: string | null;
  editorial_notes: string | null;
  specs_json: Record<string, unknown> | null;
}

function buildText(p: ProductRow): string {
  const parts = [
    `${p.brand} ${p.model}`,
    `Kategori: ${p.category_path}`,
    p.summary_sv,
    p.summary_en,
    p.editorial_notes,
    p.specs_json && Object.keys(p.specs_json).length > 0
      ? `Specifikationer: ${JSON.stringify(p.specs_json)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n');
  return parts;
}

async function main() {
  const force = process.argv.includes('--force');
  const supabase = createAdminClient();

  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, slug, brand, model, category_path, summary_sv, summary_en, editorial_notes, specs_json')
    .order('brand');
  if (pErr) throw pErr;

  const { data: existingChunks } = await supabase
    .from('review_chunks')
    .select('product_id');
  const haveChunks = new Set((existingChunks ?? []).map((c) => c.product_id));

  const targets = (products ?? []).filter((p) => force || !haveChunks.has(p.id));
  console.log(`Embedding ${targets.length} products (skipping ${(products ?? []).length - targets.length} that already have chunks).`);

  let ok = 0;
  let fail = 0;
  for (const p of targets as ProductRow[]) {
    const text = buildText(p);
    if (text.length < 30) {
      console.log(`SKIP ${p.slug} (text too short)`);
      continue;
    }
    try {
      const { data: source, error: sErr } = await supabase
        .from('review_sources')
        .upsert(
          {
            product_id: p.id,
            source_type: 'editorial',
            publisher: 'Betyget',
            url: `betyget://product/${p.slug}`,
            title: `${p.brand} ${p.model}`,
            raw_text: text,
          },
          { onConflict: 'url' }
        )
        .select('id')
        .single();
      if (sErr || !source) throw sErr ?? new Error('upsert source failed');

      await supabase.from('review_chunks').delete().eq('source_id', source.id);

      const chunks = chunkText(text, { targetTokens: 400, overlapTokens: 40 });
      const embeddings = await embed(chunks);
      const rows = chunks.map((chunk_text, i) => ({
        source_id: source.id,
        product_id: p.id,
        chunk_text,
        embedding: embeddings[i] as unknown as string,
      }));
      const { error: iErr } = await supabase.from('review_chunks').insert(rows);
      if (iErr) throw iErr;
      ok += 1;
      if (ok % 10 === 0) console.log(`  +${ok} embedded so far`);
    } catch (e) {
      fail += 1;
      console.warn(`FAIL ${p.slug}: ${(e as Error).message}`);
    }
  }
  console.log(`\nDone. Embedded: ${ok}, failed: ${fail}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
