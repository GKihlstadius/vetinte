import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ReviewStat {
  product_id: string;
  avg_rating: number;
  review_count: number;
}

interface PriceRow {
  id: string;
  product_id: string;
  retailer: string;
  price_current: number | null;
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
  if (productIds.length === 0) return Response.json({ products: [] });

  const [{ data: statsRows }, { data: linkRows }] = await Promise.all([
    supabase
      .from('product_review_stats' as never)
      .select('product_id, avg_rating, review_count')
      .in('product_id', productIds),
    supabase
      .from('affiliate_links')
      .select('id, product_id, retailer, price_current')
      .in('product_id', productIds),
  ]);
  const stats = (statsRows ?? []) as unknown as ReviewStat[];
  const links = (linkRows ?? []) as unknown as PriceRow[];

  const statById = new Map(stats.map((s) => [s.product_id, s]));
  const linksByProduct = new Map<string, PriceRow[]>();
  for (const l of links) {
    if (!linksByProduct.has(l.product_id)) linksByProduct.set(l.product_id, []);
    linksByProduct.get(l.product_id)!.push(l);
  }

  const enriched = (products ?? []).map((p: { id: string }) => {
    const ls = linksByProduct.get(p.id) ?? [];
    const cheapest = ls
      .filter((l) => l.price_current !== null && l.price_current > 0)
      .sort((a, b) => (a.price_current ?? 0) - (b.price_current ?? 0))[0];
    const primary = cheapest ?? ls[0] ?? null;
    return {
      ...p,
      avg_rating: Number(statById.get(p.id)?.avg_rating ?? 0),
      review_count: Number(statById.get(p.id)?.review_count ?? 0),
      price_from: cheapest?.price_current ?? null,
      affiliate_link_id: primary?.id ?? null,
    };
  });

  return Response.json({ products: enriched });
}
