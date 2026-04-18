export interface ProductCardProps {
  id: string;
  slug: string;
  brand: string;
  model: string;
  price_from: number | null;
  store_count: number;
  rating: number | null;
  test_count: number;
  specs: string[];
  image_url: string | null;
  is_winner?: boolean;
  angle?: string;
  affiliate_link_id: string | null;
}

export function ProductCard(p: ProductCardProps) {
  const priceFormatted = p.price_from ? `${p.price_from.toLocaleString('sv-SE')} kr` : null;
  return (
    <div className="relative rounded-xl border border-zinc-200 bg-white overflow-hidden transition hover:border-zinc-300 hover:shadow-md">
      {p.is_winner && (
        <span className="absolute top-3 left-3 inline-flex items-center rounded-full border border-ground-100 bg-ground-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ground-700">
          Bäst i test
        </span>
      )}
      {p.angle && (
        <span className="absolute top-3 right-3 inline-flex items-center rounded-full border border-zinc-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 backdrop-blur">
          {p.angle}
        </span>
      )}
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 text-xs text-zinc-400">
        {p.image_url ? (
          <img src={p.image_url} alt={p.model} className="h-full object-contain" />
        ) : (
          `${p.brand} ${p.model}`
        )}
      </div>
      <a href={`/p/${p.slug}`} className="block px-4 py-3 transition-colors hover:bg-zinc-50/50">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {p.brand}
        </div>
        <div className="text-base font-semibold tracking-tight text-zinc-900">{p.model}</div>
        {p.rating !== null && (
          <div className="mt-1.5 text-xs text-zinc-600">
            <span className="text-ground-600">{'★'.repeat(Math.round(p.rating))}</span>{' '}
            {p.rating.toFixed(1)} · {p.test_count} tester
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.specs.map((s) => (
            <span
              key={s}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600"
            >
              {s}
            </span>
          ))}
        </div>
      </a>
      <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Från
          </span>
          <span className="font-mono text-sm font-semibold text-zinc-900">
            {priceFormatted ?? 'pris saknas'}
          </span>
        </div>
        {p.affiliate_link_id && (
          <a
            href={`/go/${p.affiliate_link_id}`}
            className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Se pris
          </a>
        )}
      </div>
    </div>
  );
}
