import { describe, it, expect } from 'vitest';
import { renderPage } from '@/lib/scraper/cloudflare';

describe('renderPage', () => {
  it(
    'fetches a static HTML page',
    async () => {
      const html = await renderPage('https://example.com');
      expect(html.toLowerCase()).toContain('<html');
    },
    30000
  );
});
