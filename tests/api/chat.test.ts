import { describe, it, expect } from 'vitest';

describe('POST /api/chat', () => {
  it(
    'returns SSE events including blocks',
    async () => {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Vilka hörlurar är bäst för pendling?', locale: 'sv' }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      const text = await res.text();
      expect(text).toContain('event: blocks');
      expect(text).toContain('event: done');
    },
    60000
  );
});
