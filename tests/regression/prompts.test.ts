import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateChatResponse } from '@/lib/chat/service';
import type { ChatBlock } from '@/lib/chat/schema';

interface Fixture {
  id: string;
  query: string;
  locale: 'sv' | 'en';
  expect: {
    min_products?: number;
    must_include_any_of?: string[];
    block_types?: string[];
  };
}

const fixtures: Fixture[] = JSON.parse(
  readFileSync('tests/regression/fixtures/queries.json', 'utf8')
);

describe('prompt regression', () => {
  for (const f of fixtures) {
    it(
      f.id,
      async () => {
        const result = await generateChatResponse({
          userMessage: f.query,
          recentMessages: [],
          locale: f.locale,
        });
        const blocks = result.response.blocks;
        const productIds = blocks
          .flatMap((b: ChatBlock) => {
            if (b.type === 'product_card') return [b.product_id];
            if (b.type === 'comparison_table') return b.product_ids;
            return [];
          })
          .filter(Boolean);

        if (f.expect.min_products !== undefined) {
          expect(productIds.length).toBeGreaterThanOrEqual(f.expect.min_products);
        }
        if (f.expect.must_include_any_of) {
          expect(
            f.expect.must_include_any_of.some((slug) => productIds.includes(slug))
          ).toBe(true);
        }
        if (f.expect.block_types) {
          expect(
            f.expect.block_types.some((t) => blocks.some((b) => b.type === t))
          ).toBe(true);
        }
      },
      60000
    );
  }
});
