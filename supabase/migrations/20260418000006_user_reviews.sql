create table user_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index idx_user_reviews_product on user_reviews(product_id, created_at desc);
create index idx_user_reviews_user on user_reviews(user_id, created_at desc);

alter table user_reviews enable row level security;

create policy "anyone reads reviews" on user_reviews for select using (true);
create policy "user inserts own review" on user_reviews for insert with check (auth.uid() = user_id);
create policy "user updates own review" on user_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user deletes own review" on user_reviews for delete using (auth.uid() = user_id);

create or replace function update_review_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  new_count integer;
begin
  uid := coalesce(new.user_id, old.user_id);
  select count(*) into new_count from user_reviews where user_id = uid;
  update profiles
  set review_count = new_count,
      trust_score = least(100, new_count * 5),
      updated_at = now()
  where id = uid;
  return coalesce(new, old);
end;
$$;

create trigger user_reviews_count_after_insert
  after insert on user_reviews
  for each row execute function update_review_count();

create trigger user_reviews_count_after_delete
  after delete on user_reviews
  for each row execute function update_review_count();
