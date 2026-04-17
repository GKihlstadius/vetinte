'use client';

import { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';

interface Session {
  id: string;
  title: string | null;
  created_at: string;
}

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
}

function groupByDate(sessions: Session[]): { label: string; items: Session[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);

  const groups: { label: string; items: Session[] }[] = [
    { label: 'Idag', items: [] },
    { label: 'Denna vecka', items: [] },
    { label: 'Tidigare', items: [] },
  ];
  for (const s of sessions) {
    const d = new Date(s.created_at);
    if (d >= today) groups[0].items.push(s);
    else if (d >= weekStart) groups[1].items.push(s);
    else groups[2].items.push(s);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function HistoryDrawer({ open, onClose, onSelect }: HistoryDrawerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/sessions')
      .then((r) => r.json())
      .then(({ sessions }) => setSessions(sessions ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const groups = groupByDate(sessions);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Historik
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Stäng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {loading && (
            <div className="space-y-2 px-2">
              <div className="h-10 animate-pulse rounded-md bg-zinc-100" />
              <div className="h-10 animate-pulse rounded-md bg-zinc-100" />
              <div className="h-10 animate-pulse rounded-md bg-zinc-100" />
            </div>
          )}
          {!loading && sessions.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-zinc-500">
              Ingen historik ännu. Logga in för att spara samtal.
            </div>
          )}
          {!loading &&
            groups.map((g) => (
              <div key={g.label} className="mb-6">
                <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  {g.label}
                </h3>
                <ul className="space-y-0.5">
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(s.id);
                          onClose();
                        }}
                        className="group flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <Clock
                          size={14}
                          className="mt-0.5 shrink-0 text-zinc-400 group-hover:text-zinc-600"
                        />
                        <span className="line-clamp-2">{s.title ?? 'Utan titel'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </aside>
    </>
  );
}
