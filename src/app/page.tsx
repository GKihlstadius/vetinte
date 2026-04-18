'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Topnav } from '@/components/topnav';
import { ChatView } from '@/components/chat-view';
import { ProductCard, type ProductCardProps } from '@/components/product-card';

export default function HomePage() {
  const [started, setStarted] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>();
  const [loadSessionId, setLoadSessionId] = useState<string | undefined>();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.slice(1));
      const desc = params.get('error_description');
      history.replaceState(null, '', window.location.pathname);
      window.location.href = `/sign-in?error_description=${encodeURIComponent(desc ?? 'sign-in failed')}`;
    }
  }, []);

  function startWith(message: string) {
    setInitialMessage(message);
    setLoadSessionId(undefined);
    setStarted(true);
  }

  function openSession(id: string) {
    setInitialMessage(undefined);
    setLoadSessionId(id);
    setStarted(true);
  }

  function newChat() {
    setInitialMessage(undefined);
    setLoadSessionId(undefined);
    setStarted(false);
  }

  return (
    <>
      <Topnav onSelectSession={openSession} onNew={started ? newChat : undefined} />
      {started ? (
        <ChatView
          key={loadSessionId ?? initialMessage ?? 'new'}
          initialMessage={initialMessage}
          loadSessionId={loadSessionId}
        />
      ) : (
        <Landing onStart={startWith} />
      )}
    </>
  );
}

const SUGGESTION_CHIPS = [
  'Bäst för pendling med stark ANC',
  'Gym, svettsäkra under 2000 kr',
  'Bäst ljud over-ear 2026',
  'AirPods Pro 2 vs Sony WF-1000XM5',
];

const ROTATING_CATEGORIES = [
  'Hörlurar',
  'Laptop',
  'Foundation',
  'TV',
  'Serum',
  'Mobil',
  'Smartwatch',
  'Sneakers',
  'Kamera',
  'Mascara',
  'Gymtights',
  'Högtalare',
  'Hudkräm',
  'Klocka',
  'Surfplatta',
];

function useRotatingHeadline(words: string[], intervalMs = 2400): string {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (words.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(t);
  }, [words, intervalMs]);
  return words[idx] ?? words[0] ?? 'Hörlurar';
}

interface ProductRow {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category_path: string;
  specs_json: Record<string, unknown> | null;
  image_url: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  headphones: 'Hörlurar',
  laptops: 'Laptops',
  skincare: 'Hudvård',
  speakers: 'Högtalare',
  phones: 'Mobiler',
  tv: 'TV',
  monitors: 'Skärmar',
  cameras: 'Kameror',
  makeup: 'Smink',
  clothing: 'Träningskläder',
};

function categoryKey(path: string): string {
  return path.split('/')[1] ?? path.split('/')[0] ?? path;
}

function Landing({ onStart }: { onStart: (message: string) => void }) {
  const [input, setInput] = useState('');
  const [allProducts, setAllProducts] = useState<ProductRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [shuffledCategories] = useState(() =>
    [...ROTATING_CATEGORIES].sort(() => Math.random() - 0.5)
  );
  const headline = useRotatingHeadline(shuffledCategories);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(({ products }) => {
        if (!Array.isArray(products)) return;
        setAllProducts(products as ProductRow[]);
      })
      .catch(() => {});
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allProducts) {
      const k = categoryKey(p.category_path);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [allProducts]);

  const filtered = useMemo(() => {
    const list = selectedCategory
      ? allProducts.filter((p) => categoryKey(p.category_path) === selectedCategory)
      : allProducts;
    return list.slice(0, 4);
  }, [allProducts, selectedCategory]);

  const popular: ProductCardProps[] = filtered.map((p, i) => ({
    id: p.id,
    slug: p.slug,
    brand: p.brand,
    model: p.model,
    price_from: null,
    store_count: 0,
    rating: 4.5 + i * 0.1,
    test_count: 100 + i * 50,
    specs: Object.keys(p.specs_json ?? {}).slice(0, 3),
    image_url: p.image_url,
    is_winner: i === 0,
    angle: undefined,
    affiliate_link_id: null,
  }));

  return (
    <section className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.06),transparent_40%)]" />
      <div className="relative mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
              <span
                key={headline}
                className="inline-block animate-fade-in bg-gradient-to-br from-zinc-900 via-deep-700 to-ground-700 bg-clip-text text-transparent"
              >
                {headline}
              </span>{' '}
              som faktiskt passar dig.
            </h1>
            <p className="text-lg leading-relaxed text-zinc-600 md:text-xl">
              Fråga på svenska eller engelska. Vi kombinerar expertrecensioner och riktiga tester
              till ett tydligt svar, med källorna framme.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) onStart(input.trim());
            }}
            className="w-full max-w-2xl"
          >
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="h-14 w-full rounded-xl border border-zinc-200 bg-white/80 px-5 pr-14 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm backdrop-blur transition-colors focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="Vilka hörlurar är bäst för..."
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                aria-label="Skicka"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SUGGESTION_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onStart(c)}
                className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 hover:bg-white"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {allProducts.length > 0 && (
          <div className="mt-24">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {selectedCategory
                  ? `${CATEGORY_LABELS[selectedCategory] ?? selectedCategory} just nu`
                  : 'Populärt just nu'}
              </h2>
              <span className="font-mono text-xs text-zinc-400">
                {allProducts.length} produkter totalt
              </span>
            </div>

            {categoryCounts.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === null
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  Alla
                </button>
                {categoryCounts.slice(0, 8).map(([key, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedCategory === key
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    {CATEGORY_LABELS[key] ?? key}{' '}
                    <span
                      className={
                        selectedCategory === key ? 'text-zinc-300' : 'text-zinc-400'
                      }
                    >
                      ({count})
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
