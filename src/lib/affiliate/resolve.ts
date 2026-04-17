import { createAdminClient } from '@/lib/supabase/admin';

export interface AffiliateLink {
  id: string;
  product_id: string;
  retailer: string;
  url_template: string;
  network: string;
  currency: string;
  region: 'SE' | 'EN';
  price_current: number | null;
}

export async function resolvePrimaryLink(
  productSlug: string,
  region: 'SE' | 'EN'
): Promise<AffiliateLink | null> {
  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('slug', productSlug)
    .single();
  if (!product) return null;
  const { data } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('product_id', product.id)
    .eq('region', region)
    .order('price_current', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return (data as AffiliateLink | null) ?? null;
}
