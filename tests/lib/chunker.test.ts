import { describe, it, expect } from 'vitest';
import { chunkText } from '@/lib/scraper/chunker';

describe('chunkText', () => {
  it('splits long text into multiple chunks', () => {
    const text = 'lorem ipsum '.repeat(500);
    const chunks = chunkText(text, { targetTokens: 100, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks[0].length).toBeLessThan(text.length);
  });

  it('does not chunk short text', () => {
    const chunks = chunkText('short text here', { targetTokens: 100, overlapTokens: 20 });
    expect(chunks).toHaveLength(1);
  });

  it('chunks have overlap', () => {
    const words = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkText(words, { targetTokens: 100, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    const overlapSize = 15; // floor(20 / 1.3)
    const firstLast = chunks[0].split(/\s+/).slice(-overlapSize).join(' ');
    const secondStart = chunks[1].split(/\s+/).slice(0, overlapSize).join(' ');
    expect(firstLast).toBe(secondStart);
  });
});
