import type { NextRequest } from 'next/server';
import { generateChatResponse } from '@/lib/chat/service';
import { ensureSession, saveTurn } from '@/lib/chat/persist';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { message, locale, sessionId: clientSessionId } = await req.json();
  if (!message || typeof message !== 'string') {
    return new Response('Message required', { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const sessionId = await ensureSession(userId, clientSessionId ?? null, message);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        write('session', { session_id: sessionId });

        const result = await generateChatResponse({
          userMessage: message,
          userId,
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

        const assistantMessage = [
          result.response.intro_md,
          result.response.outro_md,
        ]
          .filter(Boolean)
          .join('\n\n');

        await saveTurn({
          sessionId,
          userId,
          userMessage: message,
          assistantMessage,
          cardsJson: result.response.blocks,
          usage: result.usage,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          ragChunksUsed: result.ragChunksUsed,
        });
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
