import { describe, it, expect } from 'vitest';
import { retrieveProducts } from '@/lib/rag/retrieve';

describe('retrieveProducts', () => {
  it('returns products matching brand keyword', async () => {
    const results = await retrieveProducts('Sony', 3);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.brand === 'Sony')).toBe(true);
  });

  it('returns all products for empty query up to limit', async () => {
    const results = await retrieveProducts('', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
  });
});
