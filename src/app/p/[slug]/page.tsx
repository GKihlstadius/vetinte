import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Topnav } from '@/components/topnav';
import { ReviewsSection } from '@/components/reviews-section';
import { CommentsSection } from '@/components/comments-section';
import { createAdminClient } from '@/lib/supabase/admin';

interface ProductPageParams {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export default async function ProductPage({ params }: ProductPageParams) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!product) notFound();

  const specs = product.specs_json as Record<string, unknown> | null;
  const specsList = specs ? Object.entries(specs) : [];

  return (
    <>
      <Topnav />
      <section className="relative flex-1">
        <div className="relative mx-auto max-w-3xl px-6 py-10">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft size={14} /> Tillbaka
          </Link>

          <div className="flex items-start gap-6">
            <div className="hidden h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 sm:block">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={`${product.brand} ${product.model}`}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {product.brand}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                {product.model}
              </h1>
              <div className="mt-1 font-mono text-xs text-zinc-400">
                {product.category_path}
              </div>
            </div>
          </div>

          {(product.summary_sv || product.editorial_notes) && (
            <div className="mt-8 space-y-3 text-sm leading-relaxed text-zinc-700">
              {product.summary_sv && <p>{product.summary_sv}</p>}
              {product.editorial_notes && (
                <p className="italic text-zinc-600">&ldquo;{product.editorial_notes}&rdquo;</p>
              )}
            </div>
          )}

          {specsList.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Specifikationer
              </h2>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {specsList.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50/40 px-3 py-2"
                  >
                    <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      {k}
                    </dt>
                    <dd className="font-mono text-xs text-zinc-700">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <ReviewsSection productId={product.id} />
          <CommentsSection productId={product.id} />
        </div>
      </section>
    </>
  );
}
