import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { m3Parser } from '@/lib/scraper/parsers/m3';

describe('m3Parser', () => {
  it('parses a review page', () => {
    const html = readFileSync('tests/fixtures/m3-xm5.html', 'utf8');
    const parsed = m3Parser.parse(html, 'https://www.m3.se/article/1829878/sony-wh-1000xm5.html');
    expect(parsed).not.toBeNull();
    expect(parsed!.publisher).toBe('M3');
    expect(parsed!.title?.toLowerCase()).toContain('sony');
    expect(parsed!.raw_text.length).toBeGreaterThan(500);
  });

  it('matches only M3 URLs', () => {
    expect(m3Parser.canParse('https://www.m3.se/article/123/foo.html')).toBe(true);
    expect(m3Parser.canParse('https://example.com')).toBe(false);
  });
});
