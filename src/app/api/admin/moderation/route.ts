import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return new Response('Forbidden', { status: 403 });

  const db = createAdminClient();

  const { data: pendingReviews } = await db
    .from('user_reviews')
    .select('id, rating, body, created_at, user_id, product_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: pendingComments } = await db
    .from('product_comments')
    .select('id, body, created_at, user_id, product_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  const userIds = [
    ...new Set([
      ...(pendingReviews ?? []).map((r) => r.user_id),
      ...(pendingComments ?? []).map((c) => c.user_id),
    ]),
  ];
  const productIds = [
    ...new Set([
      ...(pendingReviews ?? []).map((r) => r.product_id),
      ...(pendingComments ?? []).map((c) => c.product_id),
    ]),
  ];

  const { data: profiles } = userIds.length
    ? await db
        .from('profiles')
        .select('id, username, display_name, review_count, trust_score')
        .in('id', userIds)
    : { data: [] };
  const { data: products } = productIds.length
    ? await db.from('products').select('id, slug, brand, model').in('id', productIds)
    : { data: [] };

  const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const productById = Object.fromEntries((products ?? []).map((p) => [p.id, p]));

  return Response.json({
    reviews: (pendingReviews ?? []).map((r) => ({
      ...r,
      author: profileById[r.user_id] ?? null,
      product: productById[r.product_id] ?? null,
    })),
    comments: (pendingComments ?? []).map((c) => ({
      ...c,
      author: profileById[c.user_id] ?? null,
      product: productById[c.product_id] ?? null,
    })),
  });
}
