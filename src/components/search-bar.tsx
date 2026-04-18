'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { recordSearch } from '@/lib/client-cache';

interface SearchResult {
  slug: string;
  brand: string;
  model: string;
  category_path: string;
}

export function SearchBar() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then(({ results }) => setResults(results ?? []))
        .catch(() => setResults([]));
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(slug: string) {
    if (q.trim()) recordSearch(q);
    setOpen(false);
    setQ('');
    router.push(`/p/${slug}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[activeIdx].slug);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Sök produkt..."
        className="h-9 w-full rounded-md border border-zinc-200 bg-white/80 pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {results.map((r, i) => (
            <li key={r.slug}>
              <button
                type="button"
                onClick={() => go(r.slug)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  i === activeIdx ? 'bg-zinc-50' : ''
                }`}
              >
                <span className="truncate">
                  <span className="font-medium text-zinc-900">{r.brand}</span>{' '}
                  <span className="text-zinc-700">{r.model}</span>
                </span>
                <span className="ml-3 shrink-0 font-mono text-[10px] text-zinc-400">
                  {r.category_path.split('/').pop()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
