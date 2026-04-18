import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const explicitNext = req.nextUrl.searchParams.get('next');

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  let dest = explicitNext || '/';
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && !explicitNext) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('onboarded_at')
        .eq('id', user.id)
        .single();
      if (!profile?.onboarded_at) dest = '/onboarding';
    }
  } catch {
    // fall through to default dest
  }

  return NextResponse.redirect(new URL(dest, req.url));
}
