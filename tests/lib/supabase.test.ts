import { describe, it, expect } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';

describe('admin client', () => {
  it('can read products with service role', async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.from('products').select('id').limit(1);
    expect(error).toBeNull();
  });
});
