'use client';

import { useEffect, useState } from 'react';

interface AdminProduct {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  summary_sv: string | null;
  summary_en: string | null;
  editorial_notes: string | null;
  review_count: number;
  latest_review_at: string | null;
  updated_at: string;
}

export default function AdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/products');
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const { products } = await res.json();
    setProducts(products ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (forbidden) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Forbidden</h1>
        <p className="mt-2 text-sm text-zinc-600">Du har inte admin-behörighet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">Produkter och innehåll</p>
        </div>
        <a
          href="/admin/moderation"
          className="text-sm font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
        >
          Moderation →
        </a>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left">Produkt</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-right">Reviews</th>
              <th className="px-4 py-3 text-left">Senast</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
                  </td>
                  <td colSpan={4} />
                </tr>
              ))}
            {!loading &&
              products.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">
                      {p.brand} {p.model}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-400">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.category}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">
                    {p.review_count}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {p.latest_review_at
                      ? new Date(p.latest_review_at).toLocaleDateString('sv-SE')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      Redigera
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  product,
  onClose,
  onSaved,
}: {
  product: AdminProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [summarySv, setSummarySv] = useState(product.summary_sv ?? '');
  const [summaryEn, setSummaryEn] = useState(product.summary_en ?? '');
  const [notes, setNotes] = useState(product.editorial_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        summary_sv: summarySv,
        summary_en: summaryEn,
        editorial_notes: notes,
      }),
    });
    setSaving(false);
    onSaved();
  }

  async function generateAi() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(
        `/api/admin/products/${product.id}/generate-summary`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'fel');
      setSummarySv(data.summary_sv);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'fel');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
          {product.brand} {product.model}
        </h2>
        <div className="mt-5 space-y-4">
          <Field label="Summary SV">
            <textarea
              value={summarySv}
              onChange={(e) => setSummarySv(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={generateAi}
                disabled={generating}
                className="text-xs font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 disabled:opacity-50"
              >
                {generating ? 'Genererar...' : 'Generera med AI baserat på data'}
              </button>
              {genError && <span className="text-xs text-red-600">{genError}</span>}
            </div>
          </Field>
          <Field label="Summary EN">
            <textarea
              value={summaryEn}
              onChange={(e) => setSummaryEn(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Editorial notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300"
          >
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
