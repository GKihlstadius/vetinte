import { describe, it, expect } from 'vitest';
import { generateChatResponse } from '@/lib/chat/service';

describe('generateChatResponse', () => {
  it(
    'returns a valid ChatResponse for a headphone question',
    async () => {
      const result = await generateChatResponse({
        userMessage: 'Vilka hörlurar är bäst för pendling, budget 3000 kr?',
        userFacts: [],
        recentMessages: [],
        locale: 'sv',
      });
      expect(result.response.intro_md.length).toBeGreaterThan(0);
      expect(result.response.blocks.length).toBeGreaterThan(0);
      expect(result.response.followup_suggestions.length).toBeGreaterThan(0);
      expect(result.usage.completionTokens).toBeGreaterThan(0);
    },
    60000
  );
});
