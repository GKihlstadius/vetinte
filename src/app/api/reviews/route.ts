import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id');
  if (!productId) return Response.json({ error: 'product_id required' }, { status: 400 });
  const admin = createAdminClient();
  const { data: reviews } = await admin
    .from('user_reviews')
    .select('id, rating, body, created_at, user_id')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(50);

  const userIds = [...new Set((reviews ?? []).map((r) => r.user_id))];
  let profiles: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);
    profiles = Object.fromEntries(
      (data ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url }])
    );
  }

  const enriched = (reviews ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    author: profiles[r.user_id] ?? null,
  }));
  return Response.json({ reviews: enriched });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const productId = body.product_id;
  const rating = Number(body.rating);
  const reviewBody = typeof body.body === 'string' ? body.body.trim().slice(0, 2000) : null;
  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: 'invalid input' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_reviews')
    .upsert(
      {
        user_id: user.id,
        product_id: productId,
        rating,
        body: reviewBody,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,product_id' }
    )
    .select('*')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ review: data });
}
