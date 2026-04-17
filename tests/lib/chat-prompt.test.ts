import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/chat/prompt';

describe('buildSystemPrompt', () => {
  it('includes persona and locale', () => {
    const p = buildSystemPrompt({ locale: 'sv' });
    expect(p).toContain('varm');
    expect(p).toContain('svenska');
  });

  it('switches tone to English for en locale', () => {
    const p = buildSystemPrompt({ locale: 'en' });
    expect(p).toContain('English');
  });
});

describe('buildUserPrompt', () => {
  it('embeds product summaries into prompt', () => {
    const p = buildUserPrompt({
      userMessage: 'bästa för pendling?',
      products: [
        {
          slug: 'sony-wh-1000xm5',
          brand: 'Sony',
          model: 'WH-1000XM5',
          summary_sv: 'stark ANC',
          summary_en: '',
          category: 'over-ear',
          specs_json: {},
          image_url: null,
          editorial_notes: null,
          id: '1',
        },
      ],
      userFacts: [],
      recentMessages: [],
      locale: 'sv',
    });
    expect(p).toContain('Sony');
    expect(p).toContain('stark ANC');
    expect(p).toContain('bästa för pendling?');
  });
});
