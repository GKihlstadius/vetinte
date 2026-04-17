'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { streamChat } from '@/lib/sse-client';
import { ProductCard, type ProductCardProps } from '@/components/product-card';

interface Turn {
  role: 'user' | 'assistant';
  intro: string;
  blocks: unknown[];
  outro: string;
  followups: string[];
}

interface ChatViewProps {
  initialMessage?: string;
  loadSessionId?: string;
}

export function ChatView({ initialMessage, loadSessionId }: ChatViewProps) {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSentInitial = useRef(false);
  const loadedSessionRef = useRef<string | undefined>(undefined);

  async function send(message?: string) {
    const text = (message ?? input).trim();
    if (!text || streaming) return;
    const userTurn: Turn = { role: 'user', intro: text, blocks: [], outro: '', followups: [] };
    const botTurn: Turn = { role: 'assistant', intro: '', blocks: [], outro: '', followups: [] };
    setTurns((t) => [...t, userTurn, botTurn]);
    setInput('');
    setStreaming(true);
    await streamChat(
      text,
      'sv',
      {
        onSession: (id) => setSessionId(id),
        onIntroToken: (tok) =>
        setTurns((t) => {
          const updated = [...t];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            intro: updated[updated.length - 1].intro + tok,
          };
          return updated;
        }),
      onBlocks: (blocks) =>
        setTurns((t) => {
          const updated = [...t];
          updated[updated.length - 1] = { ...updated[updated.length - 1], blocks };
          return updated;
        }),
      onOutro: (outro, followups) =>
        setTurns((t) => {
          const updated = [...t];
          updated[updated.length - 1] = { ...updated[updated.length - 1], outro, followups };
          return updated;
        }),
        onDone: () => setStreaming(false),
        onError: () => setStreaming(false),
      },
      sessionId
    );
  }

  useEffect(() => {
    if (initialMessage && !hasSentInitial.current) {
      hasSentInitial.current = true;
      send(initialMessage);
    }
  }, [initialMessage]);

  useEffect(() => {
    if (!loadSessionId || loadedSessionRef.current === loadSessionId) return;
    loadedSessionRef.current = loadSessionId;
    fetch(`/api/sessions/${loadSessionId}`)
      .then((r) => r.json())
      .then(({ messages }: { messages: { role: 'user' | 'assistant'; content_md: string; cards_json: unknown[] | null }[] }) => {
        if (!messages) return;
        const historic: Turn[] = messages.map((m) => ({
          role: m.role,
          intro: m.content_md,
          blocks: Array.isArray(m.cards_json) ? m.cards_json : [],
          outro: '',
          followups: [],
        }));
        setTurns(historic);
        setSessionId(loadSessionId);
      })
      .catch(() => {});
  }, [loadSessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  return (
    <div className="flex flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
          {turns.map((t, i) => (
            <TurnBubble key={i} turn={t} onFollowup={send} />
          ))}
          {streaming && turns[turns.length - 1]?.role === 'assistant' && !turns[turns.length - 1]?.intro && (
            <div className="flex gap-2 text-sm text-zinc-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-300" />
              <span>Tänker...</span>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl gap-2 px-6 py-4">
          <input
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Fråga om hörlurar..."
            disabled={streaming}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            aria-label="Skicka"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TurnBubble({ turn, onFollowup }: { turn: Turn; onFollowup: (msg: string) => void }) {
  if (turn.role === 'user') {
    return (
      <div className="self-end max-w-[85%] rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm text-white">
        {turn.intro}
      </div>
    );
  }
  return (
    <div className="w-full space-y-4 text-[15px] leading-relaxed text-zinc-800">
      {turn.intro && <p>{turn.intro}</p>}
      {turn.blocks.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {turn.blocks.map((b, i) => {
            const block = b as {
              type: string;
              product_id?: string;
              angle?: string;
              text?: string;
              source?: string;
            };
            if (block.type === 'product_card' && block.product_id) {
              return (
                <ProductCardFromSlug
                  key={i}
                  slug={block.product_id}
                  angle={block.angle}
                  isWinner={i === 0}
                />
              );
            }
            if (block.type === 'quote') {
              return (
                <blockquote
                  key={i}
                  className="col-span-full rounded-xl border-l-2 border-deep-500 bg-deep-50 px-4 py-3 text-sm text-zinc-700"
                >
                  <p className="italic">&ldquo;{block.text}&rdquo;</p>
                  {block.source && (
                    <cite className="mt-2 block text-xs font-medium not-italic text-zinc-500">
                      {block.source}
                    </cite>
                  )}
                </blockquote>
              );
            }
            return null;
          })}
        </div>
      )}
      {turn.outro && <p>{turn.outro}</p>}
      {turn.followups.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {turn.followups.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFollowup(f)}
              className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCardFromSlug({
  slug,
  angle,
  isWinner,
}: {
  slug: string;
  angle?: string;
  isWinner?: boolean;
}) {
  const [product, setProduct] = useState<ProductCardProps | null>(null);
  useEffect(() => {
    fetch(`/api/products?slugs=${slug}`)
      .then((r) => r.json())
      .then(({ products }) => {
        const p = products?.[0];
        if (!p) return;
        setProduct({
          id: p.id,
          slug: p.slug,
          brand: p.brand,
          model: p.model,
          price_from: null,
          store_count: 0,
          rating: null,
          test_count: 0,
          specs: Object.entries(p.specs_json ?? {})
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${v}`),
          image_url: p.image_url,
          is_winner: isWinner,
          angle,
          affiliate_link_id: null,
        });
      });
  }, [slug, angle, isWinner]);
  if (!product) return <div className="h-48 animate-pulse rounded-xl bg-zinc-100" />;
  return <ProductCard {...product} />;
}
