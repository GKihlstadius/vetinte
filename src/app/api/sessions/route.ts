import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ sessions: [] });
  const { data } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return Response.json({ sessions: data ?? [] });
}
