create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  ai_tone text not null default 'casual' check (ai_tone in ('casual', 'formal', 'direct', 'funny')),
  preferences_json jsonb not null default '{}'::jsonb,
  review_count integer not null default 0,
  trust_score integer not null default 0 check (trust_score between 0 and 100),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_profiles_username_lower on profiles (lower(username));

alter table profiles enable row level security;

create policy "anyone reads profiles" on profiles for select using (true);
create policy "user inserts own profile" on profiles for insert with check (auth.uid() = id);
create policy "user updates own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
