import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { rtingsParser } from '@/lib/scraper/parsers/rtings';

describe('rtingsParser', () => {
  it('parses a review page', () => {
    const html = readFileSync('tests/fixtures/rtings-xm5.html', 'utf8');
    const parsed = rtingsParser.parse(
      html,
      'https://www.rtings.com/headphones/reviews/sony/wh-1000xm5-wireless'
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.publisher).toBe('RTINGS');
    expect(parsed!.title?.toLowerCase()).toContain('sony');
    expect(parsed!.raw_text.length).toBeGreaterThan(500);
  });

  it('matches only RTINGS URLs', () => {
    expect(rtingsParser.canParse('https://www.rtings.com/headphones/reviews/sony/xm5')).toBe(true);
    expect(rtingsParser.canParse('https://example.com')).toBe(false);
  });
});
