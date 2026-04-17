import { createAdminClient } from '@/lib/supabase/admin';
import { renderPage } from './cloudflare';
import { parseReview } from './parsers';
import { fetchTranscript } from './youtube';
import { matchProduct } from './matcher';
import { chunkText } from './chunker';
import { embed } from '@/lib/llm/embeddings';

export interface IngestTask {
  type: 'article' | 'youtube';
  url: string;
  video_id?: string;
}

export interface IngestResult {
  url: string;
  ok: boolean;
  slug?: string;
  chunks?: number;
  reason?: string;
}

export async function ingestOne(task: IngestTask): Promise<IngestResult> {
  const supabase = createAdminClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, slug, brand, model');
  const candidates = (products ?? []).map((p) => ({
    slug: p.slug,
    brand: p.brand,
    model: p.model,
  }));

  let raw_text = '';
  let title: string | null = null;
  let publisher = '';
  let rating: number | null = null;

  if (task.type === 'article') {
    const html = await renderPage(task.url);
    const parsed = parseReview(task.url, html);
    if (!parsed) return { url: task.url, ok: false, reason: 'no_parser_match' };
    raw_text = parsed.raw_text;
    title = parsed.title;
    publisher = parsed.publisher;
    rating = parsed.rating_normalized;
  } else {
    if (!task.video_id) return { url: task.url, ok: false, reason: 'missing_video_id' };
    const transcript = await fetchTranscript(task.video_id);
    raw_text = transcript.text;
    publisher = 'YouTube';
    title = `YouTube ${task.video_id}`;
  }

  if (!raw_text || raw_text.length < 200) {
    return { url: task.url, ok: false, reason: 'text_too_short' };
  }

  const slug = await matchProduct({ title, text: raw_text, candidates });
  if (!slug) return { url: task.url, ok: false, reason: 'no_product_match' };

  const product = (products ?? []).find((p) => p.slug === slug);
  if (!product) return { url: task.url, ok: false, reason: 'product_lookup_failed' };

  const { data: source, error: sourceErr } = await supabase
    .from('review_sources')
    .upsert(
      {
        product_id: product.id,
        source_type: task.type,
        publisher,
        url: task.url,
        title,
        rating_normalized: rating,
        raw_text,
      },
      { onConflict: 'url' }
    )
    .select('id')
    .single();
  if (sourceErr || !source) {
    return { url: task.url, ok: false, reason: `upsert_source: ${sourceErr?.message ?? 'none'}` };
  }

  await supabase.from('review_chunks').delete().eq('source_id', source.id);

  const chunks = chunkText(raw_text, { targetTokens: 500, overlapTokens: 50 });
  const embeddings = await embed(chunks);

  const rows = chunks.map((chunk_text, i) => ({
    source_id: source.id,
    product_id: product.id,
    chunk_text,
    embedding: embeddings[i] as unknown as string,
  }));
  const { error: insertErr } = await supabase.from('review_chunks').insert(rows);
  if (insertErr) {
    return { url: task.url, ok: false, reason: `insert_chunks: ${insertErr.message}` };
  }

  return { url: task.url, ok: true, slug, chunks: chunks.length };
}
