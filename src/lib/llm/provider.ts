import type { LLMProvider, LLMGenerateParams, LLMResult } from './types';
import { createGeminiProvider } from './gemini';
import { createGroqProvider } from './groq';

const cache = new Map<string, LLMProvider>();

function buildProvider(name: string): LLMProvider {
  switch (name) {
    case 'gemini':
      return createGeminiProvider();
    case 'groq':
      return createGroqProvider();
    default:
      throw new Error(`Unknown LLM provider: ${name}`);
  }
}

function get(name: string): LLMProvider {
  const cached = cache.get(name);
  if (cached) return cached;
  const built = buildProvider(name);
  cache.set(name, built);
  return built;
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

function fallbackName(primary: string): string | null {
  if (primary === 'groq') return 'gemini';
  if (primary === 'gemini') return 'groq';
  return null;
}

export function getLLMProvider(): LLMProvider {
  const primaryName = process.env.LLM_PROVIDER || 'gemini';
  const primary = get(primaryName);
  const fallbackProviderName = fallbackName(primaryName);

  return {
    name: primary.name,
    async generate(params: LLMGenerateParams): Promise<LLMResult> {
      try {
        const result = await primary.generate(params);
        return { ...result, provider: primary.name };
      } catch (e) {
        if (!fallbackProviderName || !isRateLimit(e)) throw e;
        console.warn(`LLM ${primaryName} rate-limited, falling back to ${fallbackProviderName}`);
        const fb = get(fallbackProviderName);
        const result = await fb.generate(params);
        return { ...result, provider: fb.name };
      }
    },
    async *generateStream(params: LLMGenerateParams) {
      try {
        for await (const ev of primary.generateStream(params)) yield ev;
      } catch (e) {
        if (!fallbackProviderName || !isRateLimit(e)) throw e;
        console.warn(`LLM ${primaryName} rate-limited, falling back to ${fallbackProviderName}`);
        const fb = get(fallbackProviderName);
        for await (const ev of fb.generateStream(params)) yield ev;
      }
    },
  };
}

export function resetProviderCache() {
  cache.clear();
}
