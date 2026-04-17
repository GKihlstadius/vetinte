import type { NextRequest } from 'next/server';
import { generateChatResponse } from '@/lib/chat/service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { message, locale } = await req.json();
  if (!message || typeof message !== 'string') {
    return new Response('Message required', { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const result = await generateChatResponse({
          userMessage: message,
          userFacts: [],
          recentMessages: [],
          locale: locale === 'en' ? 'en' : 'sv',
        });

        for (const ch of result.response.intro_md) write('intro', { token: ch });
        write('blocks', { blocks: result.response.blocks });
        write('outro', {
          outro_md: result.response.outro_md,
          followup_suggestions: result.response.followup_suggestions,
        });
        write('done', { provider: result.provider, latencyMs: result.latencyMs });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        write('error', { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
    },
  });
}
