alter table user_reviews add column status text not null default 'approved' check (status in ('pending', 'approved', 'rejected'));
alter table user_reviews add column rejection_reason text;
create index idx_user_reviews_status on user_reviews(status, created_at desc);

create table product_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  parent_id uuid references product_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_product_comments_product on product_comments(product_id, created_at desc);
create index idx_product_comments_user on product_comments(user_id, created_at desc);
create index idx_product_comments_status on product_comments(status);

alter table product_comments enable row level security;
create policy "anyone reads approved comments" on product_comments for select using (status = 'approved');
create policy "user reads own comments" on product_comments for select using (auth.uid() = user_id);
create policy "user inserts own comment" on product_comments for insert with check (auth.uid() = user_id);
create policy "user updates own comment" on product_comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user deletes own comment" on product_comments for delete using (auth.uid() = user_id);

create or replace function update_review_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  approved_count integer;
begin
  uid := coalesce(new.user_id, old.user_id);
  select count(*) into approved_count
    from user_reviews
    where user_id = uid and status = 'approved';
  update profiles
  set review_count = approved_count,
      trust_score = least(100, approved_count * 5),
      updated_at = now()
  where id = uid;
  return coalesce(new, old);
end;
$$;

create or replace view product_review_stats as
select
  p.id as product_id,
  coalesce(round(avg(ur.rating)::numeric, 2), 0) as avg_rating,
  coalesce(count(ur.id), 0) as review_count
from products p
left join user_reviews ur on ur.product_id = p.id and ur.status = 'approved'
group by p.id;
grant select on product_review_stats to anon, authenticated, service_role;
