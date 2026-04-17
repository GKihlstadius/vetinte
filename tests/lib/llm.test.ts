import { describe, it, expect } from 'vitest';
import { getLLMProvider, resetProviderCache } from '@/lib/llm/provider';

describe('LLM provider', () => {
  it('returns Gemini provider when LLM_PROVIDER=gemini', () => {
    resetProviderCache();
    process.env.LLM_PROVIDER = 'gemini';
    const provider = getLLMProvider();
    expect(provider.name).toBe('gemini');
  });

  it('generates a response', async () => {
    const provider = getLLMProvider();
    const result = await provider.generate({
      system: 'Du är en hjälpsam assistent.',
      messages: [{ role: 'user', content: 'Säg hej på svenska.' }],
      maxTokens: 400,
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
  });
});
