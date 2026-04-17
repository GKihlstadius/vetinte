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

export async function retrieveProducts(query: string, limit = 5): Promise<RetrievedProduct[]> {
  const supabase = createAdminClient();
  const qb = supabase.from('products').select('*');
  const { data, error } = query
    ? await qb
        .or(
          `brand.ilike.%${query}%,model.ilike.%${query}%,summary_sv.ilike.%${query}%,summary_en.ilike.%${query}%`
        )
        .limit(limit)
    : await qb.limit(limit);
  if (error) throw error;
  return (data ?? []) as RetrievedProduct[];
}
