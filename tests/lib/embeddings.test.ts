import { describe, it, expect } from 'vitest';
import { embed } from '@/lib/llm/embeddings';

describe('embeddings', () => {
  it('returns a 768-dim vector', async () => {
    const vec = await embed('bästa hörlurar för pendling');
    expect(vec).toHaveLength(768);
    expect(vec[0]).toBeTypeOf('number');
  });

  it('batches multiple texts', async () => {
    const vecs = await embed(['a', 'b', 'c']);
    expect(vecs).toHaveLength(3);
    expect(vecs[0]).toHaveLength(768);
  });
});
