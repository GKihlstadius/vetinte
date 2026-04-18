import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ profile: null }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return Response.json({ profile, email: user.email });
}

const ALLOWED_TONES = ['casual', 'formal', 'direct', 'funny'];
const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.username === 'string') {
    const u = body.username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) {
      return Response.json(
        { error: 'username must be 3-20 chars, a-z, 0-9, _ or -' },
        { status: 400 }
      );
    }
    updates.username = u;
  }
  if (typeof body.display_name === 'string') {
    updates.display_name = body.display_name.trim().slice(0, 60) || null;
  }
  if (typeof body.bio === 'string') {
    updates.bio = body.bio.trim().slice(0, 280) || null;
  }
  if (typeof body.ai_tone === 'string' && ALLOWED_TONES.includes(body.ai_tone)) {
    updates.ai_tone = body.ai_tone;
  }
  if (typeof body.avatar_url === 'string') {
    updates.avatar_url = body.avatar_url;
  }
  if (body.preferences_json && typeof body.preferences_json === 'object') {
    updates.preferences_json = body.preferences_json;
  }
  if (body.complete_onboarding) {
    updates.onboarded_at = new Date().toISOString();
  }
  updates.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .update(updates as never)
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'username taken' }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ profile: data });
}
