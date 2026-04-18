import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return Response.json({ results: [] });

  const sanitized = q.replace(/[,()%*]/g, ' ').slice(0, 60);
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('products')
    .select('slug, brand, model, category_path')
    .or(`brand.ilike.%${sanitized}%,model.ilike.%${sanitized}%`)
    .limit(8);

  return Response.json({ results: data ?? [] });
}
