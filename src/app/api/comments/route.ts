import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id');
  if (!productId) return Response.json({ error: 'product_id required' }, { status: 400 });
  const admin = createAdminClient();
  const { data: comments } = await admin
    .from('product_comments')
    .select('id, body, created_at, user_id, parent_id')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);

  const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
  let profiles: Record<
    string,
    { username: string | null; display_name: string | null; avatar_url: string | null; review_count: number; trust_score: number }
  > = {};
  if (userIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url, review_count, trust_score')
      .in('id', userIds);
    profiles = Object.fromEntries(
      (data ?? []).map((p) => [
        p.id,
        {
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          review_count: p.review_count,
          trust_score: p.trust_score,
        },
      ])
    );
  }

  const enriched = (comments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    parent_id: c.parent_id,
    created_at: c.created_at,
    author: profiles[c.user_id] ?? null,
  }));
  return Response.json({ comments: enriched });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const productId = body.product_id;
  const text = typeof body.body === 'string' ? body.body.trim().slice(0, 1000) : '';
  const parentId = typeof body.parent_id === 'string' ? body.parent_id : null;
  if (!productId || text.length < 1) {
    return Response.json({ error: 'invalid input' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('review_count, trust_score')
    .eq('id', user.id)
    .single();
  const trusted = (profile?.review_count ?? 0) >= 3 || (profile?.trust_score ?? 0) >= 25;
  const status = trusted ? 'approved' : 'pending';

  const { data, error } = await admin
    .from('product_comments')
    .insert({
      user_id: user.id,
      product_id: productId,
      body: text,
      parent_id: parentId,
      status,
    })
    .select('*')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ comment: data, status });
}
