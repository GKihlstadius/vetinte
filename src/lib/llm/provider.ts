import type { LLMProvider, LLMGenerateParams, LLMResult } from './types';
import { createGeminiProvider } from './gemini';
import { createGroqProvider } from './groq';
import { createOpenRouterProvider } from './openrouter';

const KNOWN = ['gemini', 'groq', 'openrouter'] as const;
type ProviderName = (typeof KNOWN)[number];

const cache = new Map<string, LLMProvider>();

function buildProvider(name: ProviderName): LLMProvider {
  switch (name) {
    case 'gemini':
      return createGeminiProvider();
    case 'groq':
      return createGroqProvider();
    case 'openrouter':
      return createOpenRouterProvider();
  }
}

function get(name: ProviderName): LLMProvider {
  const cached = cache.get(name);
  if (cached) return cached;
  const built = buildProvider(name);
  cache.set(name, built);
  return built;
}

function isAvailable(name: ProviderName): boolean {
  if (name === 'gemini') return !!process.env.GEMINI_API_KEY;
  if (name === 'groq') return !!process.env.GROQ_API_KEY;
  if (name === 'openrouter') return !!process.env.OPENROUTER_API_KEY;
  return false;
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

function buildChain(): ProviderName[] {
  const primary = (process.env.LLM_PROVIDER || 'groq') as ProviderName;
  const fallbackOrder: ProviderName[] = ['groq', 'openrouter', 'gemini'];
  const order = [primary, ...fallbackOrder.filter((p) => p !== primary)];
  const seen = new Set<ProviderName>();
  return order.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return KNOWN.includes(p) && isAvailable(p);
  });
}

export function getLLMProvider(): LLMProvider {
  const chain = buildChain();
  if (chain.length === 0) {
    throw new Error('No LLM provider configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY.');
  }
  const primary = get(chain[0]);

  return {
    name: primary.name,

    async generate(params: LLMGenerateParams): Promise<LLMResult> {
      let lastErr: unknown = null;
      for (const name of chain) {
        try {
          const provider = get(name);
          const result = await provider.generate(params);
          return { ...result, provider: provider.name };
        } catch (e) {
          lastErr = e;
          if (!isRateLimit(e)) throw e;
          console.warn(`LLM ${name} rate-limited, trying next in chain`);
        }
      }
      throw lastErr ?? new Error('All LLM providers exhausted');
    },

    async *generateStream(params: LLMGenerateParams) {
      let lastErr: unknown = null;
      for (const name of chain) {
        try {
          const provider = get(name);
          for await (const ev of provider.generateStream(params)) yield ev;
          return;
        } catch (e) {
          lastErr = e;
          if (!isRateLimit(e)) throw e;
          console.warn(`LLM ${name} rate-limited, trying next in chain`);
        }
      }
      throw lastErr ?? new Error('All LLM providers exhausted');
    },
  };
}

export function resetProviderCache() {
  cache.clear();
}
