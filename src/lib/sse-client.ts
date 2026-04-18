export interface SSEHandlers {
  onSession?: (sessionId: string) => void;
  onIntroToken?: (token: string) => void;
  onBlocks?: (blocks: unknown[]) => void;
  onOutro?: (outro: string, followups: string[]) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

export interface ClientContextPayload {
  recent_searches?: string[];
  recent_products?: { brand: string; model: string; viewed_at: string }[];
}

export async function streamChat(
  message: string,
  locale: 'sv' | 'en',
  handlers: SSEHandlers,
  sessionId?: string,
  clientContext?: ClientContextPayload
) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, locale, sessionId, clientContext }),
  });
  if (!res.ok || !res.body) {
    handlers.onError?.('Request failed');
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const raw of events) {
      const lines = raw.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event: '));
      const dataLine = lines.find((l) => l.startsWith('data: '));
      if (!eventLine || !dataLine) continue;
      const event = eventLine.slice('event: '.length);
      const data = JSON.parse(dataLine.slice('data: '.length));
      if (event === 'session') handlers.onSession?.(data.session_id);
      else if (event === 'intro') handlers.onIntroToken?.(data.token);
      else if (event === 'blocks') handlers.onBlocks?.(data.blocks);
      else if (event === 'outro') handlers.onOutro?.(data.outro_md, data.followup_suggestions);
      else if (event === 'done') handlers.onDone?.();
      else if (event === 'error') handlers.onError?.(data.message);
    }
  }
}
