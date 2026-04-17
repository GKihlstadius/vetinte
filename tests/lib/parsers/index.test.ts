import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseReview } from '@/lib/scraper/parsers';

describe('parseReview dispatcher', () => {
  it('dispatches RTINGS urls to RTINGS parser', () => {
    const html = readFileSync('tests/fixtures/rtings-xm5.html', 'utf8');
    const p = parseReview(
      'https://www.rtings.com/headphones/reviews/sony/wh-1000xm5-wireless',
      html
    );
    expect(p?.publisher).toBe('RTINGS');
  });

  it('dispatches M3 urls to M3 parser', () => {
    const html = readFileSync('tests/fixtures/m3-xm5.html', 'utf8');
    const p = parseReview('https://www.m3.se/article/1829878/sony-wh-1000xm5.html', html);
    expect(p?.publisher).toBe('M3');
  });

  it('dispatches Ljud & Bild urls to its parser', () => {
    const html = readFileSync('tests/fixtures/ljudochbild-xm5.html', 'utf8');
    const p = parseReview('https://www.ljudochbild.se/test/horlurar/sony-wh-1000xm5/', html);
    expect(p?.publisher).toBe('Ljud & Bild');
  });

  it('returns null for unknown URLs', () => {
    expect(parseReview('https://example.com', '<html></html>')).toBeNull();
  });
});
