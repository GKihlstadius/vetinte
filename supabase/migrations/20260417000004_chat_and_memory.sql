create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create index idx_chat_sessions_user on chat_sessions(user_id, created_at desc);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content_md text not null,
  cards_json jsonb default '[]'::jsonb,
  llm_provider text,
  llm_model text,
  latency_ms integer,
  prompt_tokens integer,
  completion_tokens integer,
  rag_chunks_used integer,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_session on chat_messages(session_id, created_at);

create table user_memory (
  user_id uuid references auth.users(id) on delete cascade,
  key text not null,
  value_text text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table long_tail_misses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  query_text text not null,
  detected_product_hint text,
  created_at timestamptz not null default now()
);

create index idx_long_tail_misses_created on long_tail_misses(created_at desc);

create table llm_usage (
  day date not null,
  provider text not null,
  model text not null,
  request_count bigint not null default 0,
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  primary key (day, provider, model)
);
