import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ messages: [] }, { status: 401 });

  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, user_id')
    .eq('id', id)
    .single();
  if (!session || session.user_id !== user.id) {
    return Response.json({ messages: [] }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content_md, cards_json, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  return Response.json({ session, messages: messages ?? [] });
}
