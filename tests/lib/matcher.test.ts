import { describe, it, expect } from 'vitest';
import { matchProduct } from '@/lib/scraper/matcher';

describe('matchProduct', () => {
  it(
    'matches a Sony XM5 article to the right product slug',
    async () => {
      const slug = await matchProduct({
        title: 'Sony WH-1000XM5 review',
        text: 'The WH-1000XM5 is Sony flagship with industry-leading ANC...',
        candidates: [
          { slug: 'sony-wh-1000xm5', brand: 'Sony', model: 'WH-1000XM5' },
          { slug: 'bose-quietcomfort-ultra', brand: 'Bose', model: 'QC Ultra' },
        ],
      });
      expect(slug).toBe('sony-wh-1000xm5');
    },
    30000
  );
});
