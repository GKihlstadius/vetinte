'use client';

import Link from 'next/link';

export function Topnav() {
  return (
    <nav className="sticky top-0 z-30 w-full bg-transparent">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-zinc-700 transition-colors"
        >
          Betyget
        </Link>
        <div className="flex-1" />
        <Link
          href="/hörlurar"
          className="hidden sm:inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          Hörlurar
        </Link>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white/70 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 hover:bg-white transition-colors"
        >
          SV
        </button>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Ny fråga
        </Link>
      </div>
    </nav>
  );
}
