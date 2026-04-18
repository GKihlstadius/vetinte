'use client';

const STORAGE_KEY = 'betyget:client-context:v1';
const MAX_SEARCHES = 10;
const MAX_PRODUCTS = 15;

export interface ClientContext {
  recent_searches: string[];
  recent_products: { brand: string; model: string; viewed_at: string }[];
}

const empty: ClientContext = { recent_searches: [], recent_products: [] };

export function readClientContext(): ClientContext {
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<ClientContext>;
    return {
      recent_searches: Array.isArray(parsed.recent_searches) ? parsed.recent_searches.slice(0, MAX_SEARCHES) : [],
      recent_products: Array.isArray(parsed.recent_products)
        ? parsed.recent_products.slice(0, MAX_PRODUCTS)
        : [],
    };
  } catch {
    return empty;
  }
}

function write(ctx: ClientContext) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
}

export function recordSearch(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  const ctx = readClientContext();
  const next = [trimmed, ...ctx.recent_searches.filter((s) => s !== trimmed)].slice(0, MAX_SEARCHES);
  write({ ...ctx, recent_searches: next });
}

export function recordProductView(brand: string, model: string) {
  if (!brand || !model) return;
  const ctx = readClientContext();
  const key = `${brand} ${model}`;
  const filtered = ctx.recent_products.filter((p) => `${p.brand} ${p.model}` !== key);
  const next = [
    { brand, model, viewed_at: new Date().toISOString() },
    ...filtered,
  ].slice(0, MAX_PRODUCTS);
  write({ ...ctx, recent_products: next });
}
