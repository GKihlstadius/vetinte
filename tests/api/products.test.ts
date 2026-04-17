import { describe, it, expect } from 'vitest';

describe('GET /api/products', () => {
  it('returns products when filtering by slugs', async () => {
    const res = await fetch('http://localhost:3000/api/products?slugs=sony-wh-1000xm5');
    expect(res.status).toBe(200);
    const { products } = await res.json();
    expect(products.length).toBe(1);
    expect(products[0].slug).toBe('sony-wh-1000xm5');
  });
});
