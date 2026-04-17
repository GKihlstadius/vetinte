import { createServerSupabase } from '@/lib/supabase/server';

export async function requireAdmin(): Promise<{ email: string } | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allow.includes(user.email.toLowerCase())) return null;
  return { email: user.email };
}
