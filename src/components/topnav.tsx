'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { HistoryDrawer } from '@/components/history-drawer';

interface TopnavProps {
  onSelectSession?: (sessionId: string) => void;
  onNew?: () => void;
}

export function Topnav({ onSelectSession, onNew }: TopnavProps) {
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <>
      <nav className="sticky top-0 z-30 w-full bg-transparent">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900 transition-colors hover:text-zinc-700"
          >
            Betyget
          </Link>
          <div className="flex-1" />
          {user && onSelectSession && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Historik
            </button>
          )}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white/70 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 transition-colors hover:bg-white"
          >
            SV
          </button>
          {user ? (
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Logga ut
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Logga in
            </Link>
          )}
          {onNew && (
            <button
              type="button"
              onClick={onNew}
              className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-white"
            >
              Ny fråga
            </button>
          )}
        </div>
      </nav>
      {onSelectSession && (
        <HistoryDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSelect={onSelectSession}
        />
      )}
    </>
  );
}
