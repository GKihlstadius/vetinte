'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { LevelBadge } from '@/components/level-badge';

interface CommentAuthor {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  review_count: number;
  trust_score: number;
}

interface Comment {
  id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author: CommentAuthor | null;
}

export function CommentsSection({ productId }: { productId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    fetch(`/api/comments?product_id=${productId}`)
      .then((r) => r.json())
      .then(({ comments }) => setComments(comments ?? []));
  }, [productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product_id: productId, body }),
      });
      const data = await res.json();
      if (data.status === 'pending') setPending(true);
      else {
        const fresh = await fetch(`/api/comments?product_id=${productId}`).then((r) => r.json());
        setComments(fresh.comments ?? []);
      }
      setBody('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-10 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
          <MessageCircle size={14} className="mr-1 inline" />
          Kommentarer
        </h2>
        <span className="font-mono text-xs text-zinc-500">{comments.length}</span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        {user ? (
          <form onSubmit={submit} className="space-y-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Skriv en kommentar..."
              rows={2}
              maxLength={1000}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
            <div className="flex items-center justify-between">
              {pending && (
                <span className="text-xs text-zinc-500">
                  Skickad. Granskas innan publicering.
                </span>
              )}
              <button
                type="submit"
                disabled={submitting || !body.trim()}
                className="ml-auto inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300"
              >
                {submitting ? 'Skickar...' : 'Kommentera'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-zinc-600">
            <Link href="/sign-in" className="font-medium text-zinc-900 underline">
              Logga in
            </Link>{' '}
            för att kommentera.
          </p>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 px-4 py-6 text-center text-sm text-zinc-500">
          Inga kommentarer än.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600">
                  {c.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.author.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (c.author?.display_name || c.author?.username || '?')
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {c.author?.username ? (
                      <Link
                        href={`/u/${c.author.username}`}
                        className="text-sm font-medium text-zinc-900 hover:text-zinc-700"
                      >
                        {c.author.display_name || `@${c.author.username}`}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-zinc-500">Anonym</span>
                    )}
                    {c.author && (
                      <LevelBadge
                        reviewCount={c.author.review_count}
                        trustScore={c.author.trust_score}
                      />
                    )}
                    <span className="font-mono text-[11px] text-zinc-400">
                      {new Date(c.created_at).toLocaleDateString('sv-SE')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700">{c.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
