import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Topnav } from '@/components/topnav';
import { ProductCard } from '@/components/product-card';
import { createAdminClient } from '@/lib/supabase/admin';

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  headphones: 'Hörlurar',
  laptops: 'Laptops',
  skincare: 'Hudvård',
  speakers: 'Högtalare',
  phones: 'Mobiler',
  tv: 'TV',
  tvs: 'TV',
  monitors: 'Skärmar',
  cameras: 'Kameror',
  makeup: 'Smink',
  clothing: 'Kläder',
};

const SORTS = [
  { key: 'rating', label: 'Bäst betyg' },
  { key: 'reviews', label: 'Mest recenserade' },
  { key: 'newest', label: 'Senast tillagda' },
  { key: 'brand', label: 'A-Ö' },
];

export const revalidate = 60;

interface ProductRow {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category_path: string;
  specs_json: Record<string, unknown> | null;
  image_url: string | null;
  editorial_notes: string | null;
  created_at: string;
  avg_rating: number;
  review_count: number;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const { sort = 'reviews' } = await searchParams;
  const label = CATEGORY_LABELS[category];
  if (!label) notFound();

  const admin = createAdminClient();
  const { data: products } = await admin
    .from('products')
    .select(
      'id, slug, brand, model, category_path, specs_json, image_url, editorial_notes, created_at'
    )
    .like('category_path', `%/${category}%`)
    .limit(200);

  if (!products || products.length === 0) notFound();

  const ids = products.map((p) => p.id);
  const { data: stats } = await admin
    .from('product_review_stats' as never)
    .select('product_id, avg_rating, review_count')
    .in('product_id', ids);
  const statsById = new Map(
    ((stats ?? []) as unknown as { product_id: string; avg_rating: number; review_count: number }[]).map(
      (s) => [s.product_id, s]
    )
  );

  const enriched: ProductRow[] = products.map((p) => ({
    ...(p as Omit<ProductRow, 'avg_rating' | 'review_count'>),
    avg_rating: Number(statsById.get(p.id)?.avg_rating ?? 0),
    review_count: Number(statsById.get(p.id)?.review_count ?? 0),
  }));

  const sorted = enriched.sort((a, b) => {
    if (sort === 'rating') return b.avg_rating - a.avg_rating || b.review_count - a.review_count;
    if (sort === 'reviews') return b.review_count - a.review_count || b.avg_rating - a.avg_rating;
    if (sort === 'newest') return b.created_at.localeCompare(a.created_at);
    if (sort === 'brand') return a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model);
    return 0;
  });

  return (
    <>
      <Topnav />
      <section className="relative flex-1">
        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft size={14} /> Tillbaka
          </Link>

          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{label}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {sorted.length} produkter
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <Link
                  key={s.key}
                  href={`/c/${category}?sort=${s.key}`}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    sort === s.key
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sorted.map((p, i) => (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.slug}
                brand={p.brand}
                model={p.model}
                price_from={null}
                store_count={0}
                rating={p.avg_rating > 0 ? p.avg_rating : null}
                test_count={p.review_count}
                specs={Object.keys(p.specs_json ?? {}).slice(0, 3)}
                image_url={p.image_url}
                is_winner={i === 0 && sort === 'rating'}
                affiliate_link_id={null}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
