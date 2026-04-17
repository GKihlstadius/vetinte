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

describe('review_sources table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('review_sources')
      .select(
        'id, product_id, source_type, publisher, url, title, published_at, rating_normalized, raw_text'
      )
      .limit(0);
    expect(error).toBeNull();
  });
});

describe('review_chunks table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('review_chunks')
      .select('id, source_id, product_id, chunk_text, embedding')
      .limit(0);
    expect(error).toBeNull();
  });
});

describe('affiliate_links table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('affiliate_links')
      .select(
        'id, product_id, retailer, url_template, network, currency, region, price_current, last_checked_at'
      )
      .limit(0);
    expect(error).toBeNull();
  });
});

describe('affiliate_clicks table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('affiliate_clicks')
      .select(
        'id, user_id, session_id, product_id, affiliate_link_id, ip_hash, user_agent, referer, clicked_at'
      )
      .limit(0);
    expect(error).toBeNull();
  });
});

describe('chat_sessions table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('chat_sessions')
      .select('id, user_id, title, created_at')
      .limit(0);
    expect(error).toBeNull();
  });
});

describe('chat_messages table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('chat_messages')
      .select(
        'id, session_id, role, content_md, cards_json, llm_provider, llm_model, latency_ms, prompt_tokens, completion_tokens, rag_chunks_used'
      )
      .limit(0);
    expect(error).toBeNull();
  });
});

describe('user_memory table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('user_memory')
      .select('user_id, key, value_text, updated_at')
      .limit(0);
    expect(error).toBeNull();
  });
});

describe('long_tail_misses table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('long_tail_misses')
      .select('id, user_id, session_id, query_text, detected_product_hint, created_at')
      .limit(0);
    expect(error).toBeNull();
  });
});

describe('llm_usage table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase
      .from('llm_usage')
      .select('day, provider, model, request_count, prompt_tokens, completion_tokens')
      .limit(0);
    expect(error).toBeNull();
  });
});
