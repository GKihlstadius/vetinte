create index if not exists idx_review_chunks_embedding
  on review_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_review_chunks(query_embedding vector(768), match_limit int default 10)
returns table (id uuid, product_id uuid, chunk_text text, similarity float)
language sql stable as $$
  select id, product_id, chunk_text, 1 - (embedding <=> query_embedding) as similarity
  from review_chunks
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_limit;
$$;
