create extension if not exists vector;

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand text not null,
  model text not null,
  category text not null check (category in ('in-ear', 'over-ear', 'true-wireless')),
  summary_sv text,
  summary_en text,
  specs_json jsonb default '{}'::jsonb,
  image_url text,
  editorial_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_slug on products(slug);
create index idx_products_category on products(category);
