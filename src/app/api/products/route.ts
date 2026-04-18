import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ReviewStat {
  product_id: string;
  avg_rating: number;
  review_count: number;
}

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  const slugs = req.nextUrl.searchParams.get('slugs')?.split(',').filter(Boolean) ?? [];
  const supabase = createAdminClient();

  let query = supabase.from('products').select('*');
  if (ids.length > 0) query = query.in('id', ids);
  else if (slugs.length > 0) query = query.in('slug', slugs);
  else query = query.limit(20);

  const { data: products, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const productIds = (products ?? []).map((p: { id: string }) => p.id);
  let stats: ReviewStat[] = [];
  if (productIds.length > 0) {
    const { data: rows } = await supabase
      .from('product_review_stats' as never)
      .select('product_id, avg_rating, review_count')
      .in('product_id', productIds);
    stats = (rows ?? []) as unknown as ReviewStat[];
  }
  const byId = new Map(stats.map((s) => [s.product_id, s]));

  const enriched = (products ?? []).map((p: { id: string }) => ({
    ...p,
    avg_rating: Number(byId.get(p.id)?.avg_rating ?? 0),
    review_count: Number(byId.get(p.id)?.review_count ?? 0),
  }));

  return Response.json({ products: enriched });
}
