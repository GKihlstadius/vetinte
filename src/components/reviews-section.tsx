'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, StarOff } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabase } from '@/lib/supabase/browser';

interface ReviewAuthor {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Review {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  author: ReviewAuthor | null;
}

export function ReviewsSection({ productId }: { productId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myBody, setMyBody] = useState('');
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    fetch(`/api/reviews?product_id=${productId}`)
      .then((r) => r.json())
      .then(({ reviews }) => {
        setReviews(reviews ?? []);
        if (user) {
          const mine = (reviews ?? []).find(
            (r: Review) => r.author?.username === user.user_metadata?.username
          );
          if (mine) {
            setMyRating(mine.rating);
            setMyBody(mine.body ?? '');
          }
        }
      });
  }, [productId, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!myRating) {
      setError('Välj betyg 1-5');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product_id: productId, rating: myRating, body: myBody }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? 'fel');
      }
      const fresh = await fetch(`/api/reviews?product_id=${productId}`).then((r) => r.json());
      setReviews(fresh.reviews ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fel');
    } finally {
      setSubmitting(false);
    }
  }

  const average =
    reviews.length === 0
      ? null
      : reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;

  return (
    <section className="mt-10 space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Recensioner
        </h2>
        {average !== null && (
          <span className="font-mono text-xs text-zinc-500">
            {average.toFixed(1)} / 5 · {reviews.length}{' '}
            {reviews.length === 1 ? 'recension' : 'recensioner'}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        {user ? (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setMyRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-colors"
                  aria-label={`${n} stjärnor`}
                >
                  {(hover || myRating) >= n ? (
                    <Star size={22} className="text-ground-500" fill="currentColor" />
                  ) : (
                    <StarOff size={22} className="text-zinc-300" />
                  )}
                </button>
              ))}
            </div>
            <textarea
              value={myBody}
              onChange={(e) => setMyBody(e.target.value)}
              placeholder="Vad tyckte du? (valfritt)"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
            <div className="flex items-center justify-between">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !myRating}
                className="ml-auto inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-300"
              >
                {submitting ? 'Sparar...' : 'Lämna recension'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-zinc-600">
            <Link href="/sign-in" className="font-medium text-zinc-900 underline underline-offset-2">
              Logga in
            </Link>{' '}
            för att lämna en recension.
          </p>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 px-4 py-6 text-center text-sm text-zinc-500">
          Inga recensioner än. Bli först.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600">
                  {r.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.author.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (r.author?.display_name || r.author?.username || '?')
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900">
                    {r.author?.display_name ||
                      (r.author?.username ? `@${r.author.username}` : 'Anonym')}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500">
                    {new Date(r.created_at).toLocaleDateString('sv-SE')}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) =>
                    i < r.rating ? (
                      <Star key={i} size={14} className="text-ground-500" fill="currentColor" />
                    ) : (
                      <StarOff key={i} size={14} className="text-zinc-300" />
                    )
                  )}
                </div>
              </div>
              {r.body && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-700">{r.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
