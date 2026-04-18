import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, StarOff, Award } from 'lucide-react';
import { Topnav } from '@/components/topnav';
import { createAdminClient } from '@/lib/supabase/admin';

interface PageProps {
  params: Promise<{ username: string }>;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  ai_tone: string;
  review_count: number;
  trust_score: number;
  created_at: string;
  preferences_json: { interests?: string[] } | null;
}

interface ReviewRow {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  product_id: string;
}

export const revalidate = 30;

export default async function PublicProfile({ params }: PageProps) {
  const { username } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, bio, ai_tone, review_count, trust_score, created_at, preferences_json'
    )
    .eq('username', username.toLowerCase())
    .single<ProfileRow>();
  if (!profile) notFound();

  const { data: reviews } = await admin
    .from('user_reviews')
    .select('id, rating, body, created_at, product_id')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const productIds = [...new Set((reviews ?? []).map((r: ReviewRow) => r.product_id))];
  const { data: products } =
    productIds.length > 0
      ? await admin.from('products').select('id, slug, brand, model').in('id', productIds)
      : { data: [] as { id: string; slug: string; brand: string; model: string }[] };
  const byId = new Map(
    (products ?? []).map((p) => [p.id, { slug: p.slug, brand: p.brand, model: p.model }])
  );

  const initials =
    (profile.display_name || profile.username || '?')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  const interests = profile.preferences_json?.interests ?? [];

  return (
    <>
      <Topnav />
      <section className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.05),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl px-6 py-12">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft size={14} /> Tillbaka
          </Link>

          <div className="flex items-start gap-6">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500">
                  {initials}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {profile.display_name || profile.username}
              </h1>
              {profile.username && (
                <p className="font-mono text-xs text-zinc-500">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-700">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              icon={<Star size={14} />}
              label="Recensioner"
              value={profile.review_count.toString()}
            />
            <Stat
              icon={<Award size={14} />}
              label="Tillförlitlighet"
              value={`${profile.trust_score}%`}
            />
            <Stat
              label="Medlem sedan"
              value={new Date(profile.created_at).toLocaleDateString('sv-SE')}
            />
          </div>

          {interests.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Intressen
              </h2>
              <div className="flex flex-wrap gap-2">
                {interests.map((i) => (
                  <span
                    key={i}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Senaste recensioner
            </h2>
            {(!reviews || reviews.length === 0) && (
              <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 px-4 py-6 text-center text-sm text-zinc-500">
                Inga recensioner än.
              </p>
            )}
            <ul className="space-y-3">
              {(reviews ?? []).map((r: ReviewRow) => {
                const prod = byId.get(r.product_id);
                return (
                  <li key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {prod ? (
                          <Link
                            href={`/p/${prod.slug}`}
                            className="text-sm font-medium text-zinc-900 hover:text-zinc-700"
                          >
                            {prod.brand} {prod.model}
                          </Link>
                        ) : (
                          <span className="text-sm text-zinc-500">Borttagen produkt</span>
                        )}
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
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">{value}</div>
    </div>
  );
}
