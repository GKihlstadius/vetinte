import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return new Response('Forbidden', { status: 403 });
  const { type, id } = await ctx.params;
  const { action, reason } = await req.json();
  if (!['approve', 'reject', 'delete'].includes(action)) {
    return Response.json({ error: 'invalid action' }, { status: 400 });
  }

  const table: 'user_reviews' | 'product_comments' | null =
    type === 'reviews' ? 'user_reviews' : type === 'comments' ? 'product_comments' : null;
  if (!table) return Response.json({ error: 'invalid type' }, { status: 400 });

  const db = createAdminClient();

  if (action === 'delete') {
    const result =
      table === 'user_reviews'
        ? await db.from('user_reviews').delete().eq('id', id)
        : await db.from('product_comments').delete().eq('id', id);
    if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const updatedAt = new Date().toISOString();
  const result =
    table === 'user_reviews'
      ? await db
          .from('user_reviews')
          .update({
            status,
            rejection_reason:
              action === 'reject' && typeof reason === 'string' ? reason.slice(0, 200) : null,
            updated_at: updatedAt,
          })
          .eq('id', id)
      : await db
          .from('product_comments')
          .update({ status, updated_at: updatedAt })
          .eq('id', id);
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  return Response.json({ ok: true });
}
