import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('RLS', () => {
  it('anon cannot insert into chat_messages', async () => {
    const { error } = await anon.from('chat_messages').insert({
      session_id: '00000000-0000-0000-0000-000000000000',
      role: 'user',
      content_md: 'hack',
    });
    expect(error).not.toBeNull();
  });

  it('anon can read products', async () => {
    const { error } = await anon.from('products').select('id').limit(1);
    expect(error).toBeNull();
  });
});
