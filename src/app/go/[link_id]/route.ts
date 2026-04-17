import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const dailySalt = () =>
  new Date().toISOString().slice(0, 10) + (process.env.CRON_SECRET || 'fallback-salt');

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ link_id: string }> }
) {
  const { link_id } = await ctx.params;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from('affiliate_links')
    .select('id, product_id, url_template')
    .eq('id', link_id)
    .single();
  if (!link) return new NextResponse('Not found', { status: 404 });

  const server = await createServerSupabase();
  const {
    data: { user },
  } = await server.auth.getUser();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '0.0.0.0';
  const ipHash = createHash('sha256').update(ip + dailySalt()).digest('hex').slice(0, 32);

  await admin.from('affiliate_clicks').insert({
    user_id: user?.id ?? null,
    product_id: link.product_id,
    affiliate_link_id: link.id,
    ip_hash: ipHash,
    user_agent: req.headers.get('user-agent') ?? null,
    referer: req.headers.get('referer') ?? null,
  });

  return NextResponse.redirect(link.url_template);
}
