import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ljudochbildParser } from '@/lib/scraper/parsers/ljudochbild';

describe('ljudochbildParser', () => {
  it('parses a review page', () => {
    const html = readFileSync('tests/fixtures/ljudochbild-xm5.html', 'utf8');
    const parsed = ljudochbildParser.parse(
      html,
      'https://www.ljudochbild.se/test/horlurar/sony-wh-1000xm5/'
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.publisher).toBe('Ljud & Bild');
    expect(parsed!.title?.toLowerCase()).toContain('sony');
    expect(parsed!.raw_text.length).toBeGreaterThan(500);
  });

  it('matches only Ljud & Bild URLs', () => {
    expect(ljudochbildParser.canParse('https://www.ljudochbild.se/test/horlurar/xm5/')).toBe(true);
    expect(ljudochbildParser.canParse('https://example.com')).toBe(false);
  });
});
