export interface ChunkOptions {
  targetTokens: number;
  overlapTokens: number;
}

export function chunkText(text: string, opts: ChunkOptions): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const tokensPerWord = 1.3;
  const wordsPerChunk = Math.floor(opts.targetTokens / tokensPerWord);
  const overlapWords = Math.floor(opts.overlapTokens / tokensPerWord);
  if (words.length <= wordsPerChunk) return [text.trim()];
  const chunks: string[] = [];
  const step = Math.max(1, wordsPerChunk - overlapWords);
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
    if (i + wordsPerChunk >= words.length) break;
    i += step;
  }
  return chunks;
}
