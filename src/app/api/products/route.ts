import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  const slugs = req.nextUrl.searchParams.get('slugs')?.split(',').filter(Boolean) ?? [];
  const supabase = createAdminClient();
  let query = supabase.from('products').select('*');
  if (ids.length > 0) query = query.in('id', ids);
  else if (slugs.length > 0) query = query.in('slug', slugs);
  else query = query.limit(20);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ products: data });
}
