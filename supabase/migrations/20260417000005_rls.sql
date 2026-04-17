alter table products enable row level security;
alter table review_sources enable row level security;
alter table review_chunks enable row level security;
alter table affiliate_links enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table user_memory enable row level security;
alter table long_tail_misses enable row level security;
alter table affiliate_clicks enable row level security;
alter table llm_usage enable row level security;

create policy "anyone can read products" on products for select using (true);
create policy "anyone can read review_sources" on review_sources for select using (true);
create policy "anyone can read review_chunks" on review_chunks for select using (true);
create policy "anyone can read affiliate_links" on affiliate_links for select using (true);

create policy "user reads own sessions" on chat_sessions for select using (auth.uid() = user_id);
create policy "user inserts own sessions" on chat_sessions for insert with check (auth.uid() = user_id);

create policy "user reads own messages" on chat_messages for select using (
  session_id in (select id from chat_sessions where user_id = auth.uid())
);

create policy "user reads own memory" on user_memory for select using (auth.uid() = user_id);
create policy "user upserts own memory" on user_memory for all using (auth.uid() = user_id);
