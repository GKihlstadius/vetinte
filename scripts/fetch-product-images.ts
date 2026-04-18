import { config } from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category_path: string;
}

interface UnsplashPhoto {
  urls: { regular: string; small: string };
  alt_description: string | null;
  user: { name: string; links: { html: string } };
  links: { html: string };
}

const UNSPLASH_BASE = 'https://api.unsplash.com';

function categoryFallback(category_path: string): string {
  const last = category_path.split('/').pop() ?? 'product';
  const map: Record<string, string> = {
    headphones: 'headphones',
    'over-ear': 'over-ear headphones',
    'in-ear': 'earbuds',
    'true-wireless': 'wireless earbuds',
    laptops: 'laptop computer',
    skincare: 'skincare product',
    serum: 'serum bottle skincare',
    'face-oil': 'face oil bottle',
    cream: 'cream jar skincare',
    'eye-cream': 'eye cream',
    'night-cream': 'night cream',
    treatment: 'skincare treatment',
    makeup: 'makeup product',
    foundation: 'foundation makeup',
    mascara: 'mascara tube',
    phones: 'smartphone',
    tvs: 'flatscreen tv',
    tv: 'flatscreen tv',
    monitors: 'computer monitor',
    cameras: 'camera',
    clothing: 'sport tights',
    speakers: 'bluetooth speaker',
  };
  return map[last] ?? last;
}

async function searchUnsplash(query: string, key: string): Promise<UnsplashPhoto | null> {
  try {
    const res = await fetch(
      `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: UnsplashPhoto[] };
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY missing in .env.local');

  const limitArg = process.argv[2];
  const limit = limitArg ? parseInt(limitArg, 10) : 50;
  const supabase = createAdminClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, brand, model, category_path')
    .is('image_url', null)
    .limit(limit);
  if (error) throw error;

  const targets = (products ?? []) as Product[];
  console.log(`Fetching images via Unsplash for ${targets.length} products (limit ${limit}/h on demo)...`);

  let ok = 0;
  let fallbackUsed = 0;
  for (const p of targets) {
    let photo = await searchUnsplash(`${p.brand} ${p.model}`, key);
    if (!photo) {
      const fb = categoryFallback(p.category_path);
      photo = await searchUnsplash(fb, key);
      if (photo) fallbackUsed += 1;
    }
    if (photo) {
      await supabase
        .from('products')
        .update({
          image_url: photo.urls.regular,
        })
        .eq('id', p.id);
      ok += 1;
      console.log(`  ${p.slug}: ${photo.urls.regular.slice(0, 60)}... (by ${photo.user.name})`);
    } else {
      console.log(`  ${p.slug}: (no image)`);
    }
    // Stay polite: ~1s between requests
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log(`\nDone. ${ok}/${targets.length} got images (${fallbackUsed} via category fallback).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
