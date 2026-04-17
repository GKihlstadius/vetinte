import { createAdminClient } from '@/lib/supabase/admin';
import { embed } from '@/lib/llm/embeddings';

export interface RetrievedProduct {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  summary_sv: string | null;
  summary_en: string | null;
  specs_json: Record<string, unknown>;
  image_url: string | null;
  editorial_notes: string | null;
}

export interface RetrievedChunk {
  id: string;
  product_id: string;
  chunk_text: string;
  similarity: number;
}

export async function retrieveProductsAndChunks(
  query: string,
  topK = 10
): Promise<{ products: RetrievedProduct[]; chunks: RetrievedChunk[] }> {
  const supabase = createAdminClient();
  let queryEmbedding: number[] = [];
  try {
    queryEmbedding = await embed(query);
  } catch {
    queryEmbedding = [];
  }

  let chunks: RetrievedChunk[] = [];
  if (queryEmbedding.length > 0) {
    const { data, error } = await supabase.rpc('match_review_chunks', {
      query_embedding: queryEmbedding as unknown as string,
      match_limit: topK,
    });
    if (!error && data) chunks = data as RetrievedChunk[];
  }

  const productIds = [...new Set(chunks.map((c) => c.product_id))];

  if (productIds.length === 0) {
    const { data } = await supabase.from('products').select('*').limit(topK);
    return { products: (data ?? []) as RetrievedProduct[], chunks: [] };
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds);

  const productOrder = new Map(productIds.map((id, i) => [id, i]));
  const orderedProducts = (products ?? []).sort(
    (a, b) => (productOrder.get(a.id) ?? 0) - (productOrder.get(b.id) ?? 0)
  );

  return { products: orderedProducts as RetrievedProduct[], chunks };
}

export async function retrieveProducts(query: string, limit = 10): Promise<RetrievedProduct[]> {
  const result = await retrieveProductsAndChunks(query, limit);
  return result.products;
}
