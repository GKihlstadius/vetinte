import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return new Response('Forbidden', { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json();
  const { summary_sv, summary_en, editorial_notes } = body as {
    summary_sv?: string | null;
    summary_en?: string | null;
    editorial_notes?: string | null;
  };

  const db = createAdminClient();
  const { error } = await db
    .from('products')
    .update({
      summary_sv: summary_sv ?? null,
      summary_en: summary_en ?? null,
      editorial_notes: editorial_notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
