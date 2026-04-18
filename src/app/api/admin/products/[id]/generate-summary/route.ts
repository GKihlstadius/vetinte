import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { getLLMProvider } from '@/lib/llm/provider';

const SCHEMA = {
  type: 'object',
  properties: {
    summary_sv: { type: 'string' },
  },
  required: ['summary_sv'],
};

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return new Response('Forbidden', { status: 403 });
  const { id } = await ctx.params;

  const db = createAdminClient();
  const { data: product } = await db
    .from('products')
    .select('id, brand, model, category_path, editorial_notes, specs_json')
    .eq('id', id)
    .single();
  if (!product) return Response.json({ error: 'not found' }, { status: 404 });

  const { data: chunks } = await db
    .from('review_chunks')
    .select('chunk_text')
    .eq('product_id', id)
    .limit(4);

  const evidence = (chunks ?? [])
    .map((c) => `- ${c.chunk_text.slice(0, 600)}`)
    .join('\n');

  const llm = getLLMProvider();
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
  if (!text || text.length < 30) {
    return Response.json({ error: 'LLM returned empty summary' }, { status: 500 });
  }

  await db
    .from('products')
    .update({ summary_sv: text.slice(0, 800), updated_at: new Date().toISOString() })
    .eq('id', id);

  return Response.json({ summary_sv: text.slice(0, 800) });
}
