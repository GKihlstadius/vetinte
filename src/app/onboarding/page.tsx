'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Check, Sparkles } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { uploadAvatar } from '@/lib/profile/upload-avatar';

const TONES: { value: 'casual' | 'formal' | 'direct' | 'funny'; label: string; desc: string }[] = [
  { value: 'casual', label: 'Casual', desc: 'Vänlig kompis, varm ton' },
  { value: 'direct', label: 'Direkt', desc: 'Kort, rak, inga svängar' },
  { value: 'formal', label: 'Formell', desc: 'Saklig, professionell' },
  { value: 'funny', label: 'Skämtsam', desc: 'Skojig, lite mer personlighet' },
];

const INTERESTS = [
  'Hörlurar',
  'Tech',
  'Smink',
  'Hudvård',
  'Gymkläder',
  'Skor',
  'Klockor',
  'Köksprylar',
];

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  ai_tone: string;
  preferences_json: { interests?: string[] } | null;
  onboarded_at: string | null;
}

export default function OnboardingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [tone, setTone] = useState<Profile['ai_tone']>('casual');
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.profile) {
          router.push('/sign-in');
          return;
        }
        setProfile(data.profile);
        setUsername(data.profile.username ?? '');
        setDisplayName(data.profile.display_name ?? '');
        setBio(data.profile.bio ?? '');
        setTone(data.profile.ai_tone ?? 'casual');
        setInterests(data.profile.preferences_json?.interests ?? []);
        if (data.profile.avatar_url) setAvatarPreview(data.profile.avatar_url);
        if (data.profile.onboarded_at) router.push('/profile');
      });
  }, [router]);

  function pickAvatar(file: File) {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function toggleInterest(name: string) {
    setInterests((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  }

  async function finish() {
    if (!profile) return;
    if (!username.trim()) {
      setError('Välj användarnamn');
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    let avatarUrl = profile.avatar_url;
    try {
      if (avatarFile) {
        avatarUrl = await uploadAvatar(profile.id, avatarFile);
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username,
          display_name: displayName,
          bio,
          ai_tone: tone,
          avatar_url: avatarUrl,
          preferences_json: { interests },
          complete_onboarding: true,
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? 'kunde inte spara');
      }
      router.push('/profile');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fel');
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-zinc-500">
        Laddar...
      </div>
    );
  }

  return (
    <section className="relative flex-1">
      <div className="relative mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 backdrop-blur">
            <Sparkles size={12} /> Skapa din profil
          </span>
          <span className="font-mono text-xs text-zinc-400">Steg {step} av 3</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-8 shadow-sm backdrop-blur">
          {step === 1 && (
            <Step1
              avatarPreview={avatarPreview}
              username={username}
              setUsername={setUsername}
              displayName={displayName}
              setDisplayName={setDisplayName}
              bio={bio}
              setBio={setBio}
              fileInputRef={fileInputRef}
              onPickAvatar={pickAvatar}
            />
          )}
          {step === 2 && <Step2 tone={tone} setTone={setTone} />}
          {step === 3 && (
            <Step3 interests={interests} toggleInterest={toggleInterest} />
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Tillbaka
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !username.trim()}
                className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Nästa
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-300"
              >
                <Check size={14} /> {saving ? 'Sparar...' : 'Klar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Step1(props: {
  avatarPreview: string | null;
  username: string;
  setUsername: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickAvatar: (file: File) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Vem är du?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Välj användarnamn och en bild som representerar dig.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => props.fileInputRef.current?.click()}
          className="group relative h-20 w-20 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50"
        >
          {props.avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.avatarPreview}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-zinc-400">
              <Camera size={20} />
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-zinc-900/0 text-[10px] font-medium uppercase tracking-[0.18em] text-white opacity-0 transition-all group-hover:bg-zinc-900/40 group-hover:opacity-100">
            Byt
          </span>
        </button>
        <input
          ref={props.fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onPickAvatar(f);
          }}
        />
        <p className="text-xs text-zinc-500">Max 2 MB. PNG, JPG, WEBP eller GIF.</p>
      </div>

      <Field label="Användarnamn">
        <div className="flex items-center rounded-lg border border-zinc-200 bg-white px-3 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-200">
          <span className="text-sm text-zinc-400">@</span>
          <input
            value={props.username}
            onChange={(e) => props.setUsername(e.target.value.toLowerCase())}
            placeholder="ditt-namn"
            className="h-10 w-full bg-transparent px-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            maxLength={20}
          />
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          3-20 tecken, a-z, 0-9, _ eller -
        </p>
      </Field>

      <Field label="Visningsnamn (valfritt)">
        <input
          value={props.displayName}
          onChange={(e) => props.setDisplayName(e.target.value)}
          placeholder="Ditt namn"
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          maxLength={60}
        />
      </Field>

      <Field label="Bio (valfritt)">
        <textarea
          value={props.bio}
          onChange={(e) => props.setBio(e.target.value)}
          placeholder="Något kort om dig..."
          rows={3}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          maxLength={280}
        />
      </Field>
    </div>
  );
}

function Step2({ tone, setTone }: { tone: string; setTone: (v: 'casual' | 'formal' | 'direct' | 'funny') => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Hur ska AI:n låta?</h2>
        <p className="mt-1 text-sm text-zinc-500">Du kan ändra detta senare.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TONES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTone(t.value)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              tone === t.value
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
            }`}
          >
            <div className="text-sm font-semibold">{t.label}</div>
            <div className={`mt-1 text-xs ${tone === t.value ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {t.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3({
  interests,
  toggleInterest,
}: {
  interests: string[];
  toggleInterest: (i: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Vad intresserar dig?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Vi använder detta för att personalisera rekommendationer.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((name) => {
          const active = interests.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggleInterest(name)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
              }`}
            >
              {name}
            </button>
          );
        })}
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
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
