import { createBrowserSupabase } from '@/lib/supabase/browser';

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createBrowserSupabase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
