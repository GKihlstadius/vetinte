import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('products table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('products')
      .select(
        'id, slug, brand, model, category, summary_sv, summary_en, specs_json, image_url, editorial_notes, created_at, updated_at'
      )
      .limit(0);
    expect(error).toBeNull();
  });
});
