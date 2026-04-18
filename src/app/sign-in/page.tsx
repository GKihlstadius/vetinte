'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Stage = 'email' | 'code';

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<Stage>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserSupabase();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const err = params.get('error_description');
    if (err) setError(err.replace(/\+/g, ' '));
  }, [params]);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setStage('code');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      router.push(data?.profile?.onboarded_at ? '/' : '/onboarding');
    } catch {
      router.push('/');
    }
  }

  return (
    <section className="relative flex-1">
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft size={14} /> Tillbaka
        </Link>
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-8 shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Logga in på Betyget
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Spara historik och få mer personliga svar.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading || stage === 'code'}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            Fortsätt med Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" />
            eller
            <span className="h-px flex-1 bg-zinc-200" />
          </div>

          {stage === 'email' && (
            <form onSubmit={sendCode} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                required
                disabled={loading}
                className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {loading ? 'Skickar...' : 'Skicka kod eller länk'}
              </button>
            </form>
          )}

          {stage === 'code' && (
            <form onSubmit={verifyCode} className="space-y-3">
              <p className="text-sm text-zinc-600">
                Kolla <strong>{email}</strong>. Klicka länken, eller klistra in 6-siffrig kod här.
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                disabled={loading}
                className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 font-mono text-base tracking-[0.3em] text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {loading ? 'Verifierar...' : 'Logga in'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage('email');
                  setCode('');
                  setError(null);
                }}
                className="block w-full text-xs text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Använd annan e-post
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
