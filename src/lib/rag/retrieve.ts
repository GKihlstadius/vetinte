import { createAdminClient } from '@/lib/supabase/admin';

export interface RetrievedProduct {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  summary_sv: string | null;
  summary_en: string | null;
  specs_json: Record<string, unknown>;
  image_url: string | null;
  editorial_notes: string | null;
}

function sanitizeForIlike(s: string): string {
  return s.replace(/[,()%*]/g, ' ').trim();
}

export async function retrieveProducts(query: string, limit = 5): Promise<RetrievedProduct[]> {
  const supabase = createAdminClient();
  const qb = supabase.from('products').select('*');
  const q = sanitizeForIlike(query);
  const isShortKeyword = q.length > 0 && q.split(/\s+/).length <= 2;
  const { data, error } = isShortKeyword
    ? await qb
        .or(
          `brand.ilike.%${q}%,model.ilike.%${q}%,summary_sv.ilike.%${q}%,summary_en.ilike.%${q}%`
        )
        .limit(limit)
    : await qb.limit(limit);
  if (error) throw error;
  return (data ?? []) as RetrievedProduct[];
}
