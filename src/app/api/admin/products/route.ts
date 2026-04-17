import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return new Response('Forbidden', { status: 403 });

  const db = createAdminClient();
  const { data: products } = await db
    .from('products')
    .select('id, slug, brand, model, category, summary_sv, summary_en, editorial_notes, updated_at')
    .order('brand');

  const { data: sources } = await db
    .from('review_sources')
    .select('product_id, created_at');

  const countByProduct = new Map<string, { count: number; latest: string | null }>();
  for (const s of sources ?? []) {
    if (!s.product_id) continue;
    const cur = countByProduct.get(s.product_id) ?? { count: 0, latest: null };
    cur.count += 1;
    if (!cur.latest || (s.created_at && s.created_at > cur.latest)) cur.latest = s.created_at;
    countByProduct.set(s.product_id, cur);
  }

  const enriched = (products ?? []).map((p) => ({
    ...p,
    review_count: countByProduct.get(p.id)?.count ?? 0,
    latest_review_at: countByProduct.get(p.id)?.latest ?? null,
  }));

  return Response.json({ products: enriched });
}
