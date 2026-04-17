create table review_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  source_type text not null check (source_type in ('article', 'youtube', 'editorial')),
  publisher text not null,
  url text unique not null,
  title text,
  published_at date,
  rating_normalized numeric(3,1),
  raw_text text,
  created_at timestamptz not null default now()
);

create index idx_review_sources_product on review_sources(product_id);

create table review_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references review_sources(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  chunk_text text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index idx_review_chunks_product on review_chunks(product_id);
