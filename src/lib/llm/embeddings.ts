import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-embedding-001';
const DIM = 768;

export async function embed(input: string): Promise<number[]>;
export async function embed(input: string[]): Promise<number[][]>;
export async function embed(input: string | string[]): Promise<number[] | number[][]> {
  const provider = process.env.EMBEDDING_PROVIDER || 'gemini';
  if (provider !== 'gemini') {
    throw new Error(`Unknown embedding provider: ${provider}`);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const texts = Array.isArray(input) ? input : [input];
  const results = await Promise.all(
    texts.map(async (text) => {
      const res = await ai.models.embedContent({
        model: MODEL,
        contents: text,
        config: { outputDimensionality: DIM },
      });
      return res.embeddings?.[0]?.values ?? [];
    })
  );
  return Array.isArray(input) ? results : results[0];
}

export const EMBEDDING_DIM = DIM;
