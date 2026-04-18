'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Star, Award } from 'lucide-react';

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  ai_tone: string;
  preferences_json: { interests?: string[] } | null;
  review_count: number;
  trust_score: number;
  onboarded_at: string | null;
  created_at: string;
}

const TONE_LABEL: Record<string, string> = {
  casual: 'Casual',
  formal: 'Formell',
  direct: 'Direkt',
  funny: 'Skämtsam',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/profile')
      .then(async (r) => {
        if (r.status === 401) {
          router.push('/sign-in');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setProfile(data.profile);
        setEmail(data.email);
        setLoading(false);
        if (data.profile && !data.profile.onboarded_at) router.push('/onboarding');
      });
  }, [router]);

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center text-sm text-zinc-500">
        Laddar...
      </div>
    );
  }

  const interests = profile.preferences_json?.interests ?? [];
  const initials = (profile.display_name || profile.username || email || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <section className="relative flex-1">
      <div className="relative mx-auto max-w-3xl px-6 py-12">
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  {profile.display_name || profile.username}
                </h1>
                {profile.username && (
                  <p className="font-mono text-xs text-zinc-500">@{profile.username}</p>
                )}
                {email && <p className="mt-1 text-xs text-zinc-400">{email}</p>}
              </div>
              <Link
                href="/onboarding"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Pencil size={12} /> Redigera
              </Link>
            </div>
            {profile.bio && (
              <p className="mt-3 text-sm leading-relaxed text-zinc-700">{profile.bio}</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <Stat label="AI-ton" value={TONE_LABEL[profile.ai_tone] ?? profile.ai_tone} />
        </div>

        {interests.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Intressen
            </h2>
            <div className="flex flex-wrap gap-2">
              {interests.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50/40 p-4">
          <p className="text-xs text-zinc-500">
            Medlem sedan {new Date(profile.created_at).toLocaleDateString('sv-SE')}
          </p>
        </div>
      </div>
    </section>
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
