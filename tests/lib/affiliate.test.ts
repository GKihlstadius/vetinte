import { describe, it, expect } from 'vitest';
import { resolvePrimaryLink } from '@/lib/affiliate/resolve';

describe('resolvePrimaryLink', () => {
  it('returns the cheapest SE link for a known product', async () => {
    const link = await resolvePrimaryLink('sony-wh-1000xm5', 'SE');
    expect(link).not.toBeNull();
    expect(link!.region).toBe('SE');
    expect(link!.url_template).toContain('http');
  });

  it('returns null for unknown slug', async () => {
    const link = await resolvePrimaryLink('does-not-exist', 'SE');
    expect(link).toBeNull();
  });
});
