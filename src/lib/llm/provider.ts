import type { LLMProvider } from './types';
import { createGeminiProvider } from './gemini';
import { createGroqProvider } from './groq';

let cached: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cached) return cached;
  const name = process.env.LLM_PROVIDER || 'gemini';
  switch (name) {
    case 'gemini':
      cached = createGeminiProvider();
      return cached;
    case 'groq':
      cached = createGroqProvider();
      return cached;
    default:
      throw new Error(`Unknown LLM provider: ${name}`);
  }
}

export function resetProviderCache() {
  cached = null;
}
