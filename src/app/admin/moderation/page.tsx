'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, Trash2, ArrowLeft } from 'lucide-react';

interface PendingReview {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  author: { username: string | null; display_name: string | null; review_count: number; trust_score: number } | null;
  product: { slug: string; brand: string; model: string } | null;
}

interface PendingComment {
  id: string;
  body: string;
  created_at: string;
  author: PendingReview['author'];
  product: PendingReview['product'];
}

export default function ModerationPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/moderation');
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setReviews(data.reviews ?? []);
    setComments(data.comments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(type: 'reviews' | 'comments', id: string, action: 'approve' | 'reject' | 'delete') {
    await fetch(`/api/admin/moderation/${type}/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    load();
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Forbidden</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft size={14} /> Tillbaka till admin
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Moderation</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Recensioner och kommentarer som väntar på godkännande
      </p>

      {loading && <p className="mt-8 text-sm text-zinc-500">Laddar...</p>}

      {!loading && (
        <>
          <Section title={`Recensioner (${reviews.length})`}>
            {reviews.length === 0 ? (
              <Empty />
            ) : (
              reviews.map((r) => (
                <PendingItem
                  key={r.id}
                  author={r.author}
                  product={r.product}
                  created_at={r.created_at}
                  onApprove={() => act('reviews', r.id, 'approve')}
                  onReject={() => act('reviews', r.id, 'reject')}
                  onDelete={() => act('reviews', r.id, 'delete')}
                >
                  <div className="text-sm font-medium text-ground-700">
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </div>
                  {r.body && <p className="mt-2 text-sm text-zinc-700">{r.body}</p>}
                </PendingItem>
              ))
            )}
          </Section>

          <Section title={`Kommentarer (${comments.length})`}>
            {comments.length === 0 ? (
              <Empty />
            ) : (
              comments.map((c) => (
                <PendingItem
                  key={c.id}
                  author={c.author}
                  product={c.product}
                  created_at={c.created_at}
                  onApprove={() => act('comments', c.id, 'approve')}
                  onReject={() => act('comments', c.id, 'reject')}
                  onDelete={() => act('comments', c.id, 'delete')}
                >
                  <p className="text-sm text-zinc-700">{c.body}</p>
                </PendingItem>
              ))
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty() {
  return (
    <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 px-4 py-6 text-center text-sm text-zinc-500">
      Inget väntar på godkännande.
    </p>
  );
}

function PendingItem({
  author,
  product,
  created_at,
  children,
  onApprove,
  onReject,
  onDelete,
}: {
  author: PendingReview['author'];
  product: PendingReview['product'];
  created_at: string;
  children: React.ReactNode;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-900">
            {author?.display_name || (author?.username ? `@${author.username}` : 'Anonym')}{' '}
            <span className="font-mono text-[10px] text-zinc-400">
              · {author?.review_count ?? 0} reviews · {author?.trust_score ?? 0}% trust
            </span>
          </div>
          {product && (
            <Link
              href={`/p/${product.slug}`}
              className="text-xs text-zinc-600 hover:text-zinc-900"
            >
              {product.brand} {product.model} →
            </Link>
          )}
          <div className="font-mono text-[11px] text-zinc-400">
            {new Date(created_at).toLocaleString('sv-SE')}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-deep-600 px-3 text-xs font-medium text-white hover:bg-deep-700"
          >
            <Check size={12} /> Godkänn
          </button>
          <button
            type="button"
            onClick={onReject}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <X size={12} /> Avvisa
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
