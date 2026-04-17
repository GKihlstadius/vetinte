create table affiliate_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  retailer text not null,
  url_template text not null,
  network text not null check (network in ('adtraction', 'awin', 'amazon', 'direct')),
  currency text not null check (currency in ('SEK', 'EUR', 'USD', 'GBP')),
  region text not null check (region in ('SE', 'EN')),
  price_current numeric(10,2),
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_affiliate_links_product on affiliate_links(product_id, region);

create table affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  product_id uuid references products(id) on delete cascade,
  affiliate_link_id uuid references affiliate_links(id) on delete set null,
  ip_hash text,
  user_agent text,
  referer text,
  clicked_at timestamptz not null default now()
);

create index idx_affiliate_clicks_product on affiliate_clicks(product_id);
create index idx_affiliate_clicks_user on affiliate_clicks(user_id);
