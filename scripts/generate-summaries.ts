import { config } from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLLMProvider } from '@/lib/llm/provider';

config({ path: '.env.local' });

interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category_path: string;
  editorial_notes: string | null;
  specs_json: Record<string, unknown> | null;
}

const SCHEMA = {
  type: 'object',
  properties: {
    summary_sv: { type: 'string' },
  },
  required: ['summary_sv'],
};

async function summarize(product: Product, chunks: string[]): Promise<string | null> {
  const llm = getLLMProvider();
  const evidence = chunks.slice(0, 4).map((c) => `- ${c.slice(0, 600)}`).join('\n');
  const result = await llm.generate({
    system:
      'Du skriver korta svenska produktsammanfattningar för en jämförelsesajt. 2-3 meningar, sakliga, framhäv styrkor och vad som gör produkten värd att överväga. Inga säljfraser. Returnera JSON med fältet "summary_sv".',
    messages: [
      {
        role: 'user',
        content: `Produkt: ${product.brand} ${product.model}
Kategori: ${product.category_path}
Editorial: ${product.editorial_notes ?? '(saknas)'}
Specs: ${JSON.stringify(product.specs_json ?? {})}

Recensions-evidens:
${evidence || '(inga recensions-chunks tillgängliga)'}

Skriv en kort svensk sammanfattning (2-3 meningar).`,
      },
    ],
    responseSchema: SCHEMA,
    temperature: 0.3,
    maxTokens: 600,
  });
  const parsed = result.parsed as { summary_sv?: string } | undefined;
  const text = parsed?.summary_sv?.trim();
  if (!text || text.length < 30) return null;
  return text.slice(0, 800);
}

async function main() {
  const limitArg = process.argv[2];
  const limit = limitArg ? parseInt(limitArg, 10) : 30;
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, slug, brand, model, category_path, editorial_notes, specs_json, summary_sv');
  const targets = ((products ?? []) as (Product & { summary_sv: string | null })[])
    .filter((p) => !p.summary_sv || p.summary_sv.length < 30)
    .slice(0, limit);

  console.log(`Generating summaries for ${targets.length} products...`);

  let ok = 0;
  let fail = 0;
  for (const p of targets) {
    try {
      const { data: chunks } = await supabase
        .from('review_chunks')
        .select('chunk_text')
        .eq('product_id', p.id)
        .limit(4);
      const text = await summarize(p, (chunks ?? []).map((c) => c.chunk_text));
      if (text) {
        await supabase.from('products').update({ summary_sv: text }).eq('id', p.id);
        ok += 1;
        if (ok % 5 === 0) console.log(`  +${ok} done`);
      } else {
        fail += 1;
      }
    } catch (e) {
      fail += 1;
      console.warn(`FAIL ${p.slug}: ${(e as Error).message.slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`\nDone. ${ok} summaries written, ${fail} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
