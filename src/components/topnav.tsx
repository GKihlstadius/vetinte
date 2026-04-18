'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { HistoryDrawer } from '@/components/history-drawer';

interface TopnavProps {
  onSelectSession?: (sessionId: string) => void;
  onNew?: () => void;
}

interface ProfileSummary {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export function Topnav({ onSelectSession, onNew }: TopnavProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.profile) {
          setProfile({
            username: data.profile.username,
            display_name: data.profile.display_name,
            avatar_url: data.profile.avatar_url,
          });
        }
      });
  }, [user]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
  }

  const initials =
    (profile?.display_name || profile?.username || user?.email || '?')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <>
      <nav className="relative z-30 w-full bg-transparent">
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
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white/70 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 transition-colors hover:bg-white"
          >
            SV
          </button>
          {onNew && (
            <button
              type="button"
              onClick={onNew}
              className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-white"
            >
              Ny fråga
            </button>
          )}
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 pr-2.5 pl-1 text-sm text-zinc-700 transition-colors hover:bg-white"
              >
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-[11px] font-semibold text-zinc-600">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </span>
                <ChevronDown size={14} className="text-zinc-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                  <div className="border-b border-zinc-100 px-3 py-3">
                    <div className="text-sm font-medium text-zinc-900">
                      {profile?.display_name || profile?.username || 'Du'}
                    </div>
                    {profile?.username && (
                      <div className="font-mono text-[11px] text-zinc-500">
                        @{profile.username}
                      </div>
                    )}
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <UserIcon size={14} /> Min profil
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <LogOut size={14} /> Logga ut
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Skapa konto
            </Link>
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
