import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ username: string }> }
) {
  const { username } = await ctx.params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, ai_tone, review_count, trust_score, created_at, preferences_json')
    .eq('username', username.toLowerCase())
    .single();
  if (!profile) return Response.json({ error: 'not found' }, { status: 404 });

  const { data: reviews } = await admin
    .from('user_reviews')
    .select('id, rating, body, created_at, product_id')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const productIds = [...new Set((reviews ?? []).map((r) => r.product_id))];
  let productById: Record<string, { slug: string; brand: string; model: string }> = {};
  if (productIds.length > 0) {
    const { data: prods } = await admin
      .from('products')
      .select('id, slug, brand, model')
      .in('id', productIds);
    productById = Object.fromEntries(
      (prods ?? []).map((p) => [p.id, { slug: p.slug, brand: p.brand, model: p.model }])
    );
  }

  const enrichedReviews = (reviews ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    product: productById[r.product_id] ?? null,
  }));

  return Response.json({ profile, reviews: enrichedReviews });
}
