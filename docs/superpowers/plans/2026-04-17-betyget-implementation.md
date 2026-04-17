# Betyget Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Betyget MVP, an AI-driven product recommendation web app for headphones (SV + EN) with scraped review data, chat UI with Prisjakt-inspired product cards, Supabase Auth, Zep-backed user memory, and affiliate monetization.

**Architecture:** Next.js 16 full-stack app on Vercel. Supabase Postgres with pgvector for product and review data. Provider-abstracted LLM (Gemini 2.0 Flash as primary gratis-tier) for chat. Cloudflare Browser Rendering for scraping. Zep Cloud for user memory. Upstash Redis for rate limiting.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, shadcn/ui, TypeScript (ESM), Supabase, pgvector, Google Gemini 2.0 Flash, Cloudflare Browser Rendering, Zep Cloud, Upstash Redis, Vercel Cron, Vitest, Playwright.

**Spec reference:** `docs/superpowers/specs/2026-04-17-betyget-design.md`

**Phases as chunks:**
1. Foundation: project setup, Supabase, schema, provider abstraction.
2. Walking skeleton: seed data, minimal chat API, frontend chat UI.
3. Real data pipeline: Cloudflare scraping, embeddings, vector RAG.
4. Accounts: Supabase Auth, chat history, Zep memory.
5. Polish: affiliate tracking, rate limiting, admin, observability.

**User preferences (from CLAUDE.md and memory):**
- ESM only (no CommonJS).
- No emojis in code, commits, or UI.
- No em dashes (—) anywhere.
- Responses to user in Swedish when collaborating.
- No unnecessary comments or docstrings.

---

## Chunk 1: Foundation (project setup, schema, provider abstraction)

### Task 1.1: Git init and initial commit of spec

**Files:**
- Create: `.gitignore`
- Commit: `docs/superpowers/specs/2026-04-17-betyget-design.md`

- [ ] **Step 1: Initialize git**

Run:
```bash
cd /Users/gabriellundberg/vetintenamn
git init
git branch -m main
```

Expected: `Initialized empty Git repository in ...`

- [ ] **Step 2: Create `.gitignore`**

Write to `.gitignore`:
```
node_modules/
.next/
.env
.env.local
.env*.local
.DS_Store
.vercel
.superpowers/
dist/
coverage/
*.log
```

- [ ] **Step 3: Initial commit**

Run:
```bash
git add .gitignore docs/
git commit -m "chore: initial commit with spec and gitignore"
```

Expected: one commit on main with two files.

---

### Task 1.2: Initialize Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `postcss.config.mjs`, `tailwind.config.ts`, `components.json`.

- [ ] **Step 1: Run create-next-app**

Run (from project root):
```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Answer: no to experimental features if prompted.

Expected: Next.js 16 scaffold created in current dir with Turbopack as default.

- [ ] **Step 2: Add test script**

Open `package.json`. Do NOT add `"type": "module"` (Next.js manages this). Ensure scripts include:
```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"test": "vitest run"
```
Add `"test"` if missing.

- [ ] **Step 3: Run dev server and verify**

Run:
```bash
npm run dev
```

Open http://localhost:3000. Expected: default Next.js welcome page renders. Stop server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js 16 app with TypeScript and Tailwind"
```

---

### Task 1.3: Install core dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install @supabase/supabase-js @supabase/ssr @google/genai groq-sdk @anthropic-ai/sdk openai @getzep/zep-cloud @upstash/redis @upstash/ratelimit cheerio zod pino @sentry/nextjs
```

- [ ] **Step 2: Install shadcn/ui and peers**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add button input dialog sheet dropdown-menu card
```

Expected: `src/components/ui/` populated with shadcn primitives, `components.json` created.

- [ ] **Step 3: Install dev deps**

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom playwright @playwright/test tsx supabase
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components.json src/components/ui src/lib/utils.ts
git commit -m "chore: add runtime and dev dependencies"
```

---

### Task 1.4: Supabase project setup and local link

**Files:**
- Create: `supabase/config.toml` (via CLI), `.env.local`.

- [ ] **Step 1: Create Supabase project via dashboard**

Go to https://supabase.com/dashboard, create a new project named `betyget-dev`. Enable `vector` extension under Database → Extensions.

Copy: Project URL, anon key, service_role key.

- [ ] **Step 2: Initialize Supabase CLI and link**

```bash
npx supabase init
npx supabase link --project-ref <project-ref>
```

Enter DB password when prompted.

Expected: `supabase/` directory created, project linked.

- [ ] **Step 3: Create `.env.local`**

Write to `.env.local` (user fills values):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ZEP_API_KEY=
CF_ACCOUNT_ID=
CF_API_TOKEN=
CRON_SECRET=
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini
ADTRACTION_API_KEY=
AWIN_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
```

- [ ] **Step 4: Create `.env.example`** (same keys, empty values, safe to commit)

Copy `.env.local` structure with empty values into `.env.example`.

- [ ] **Step 5: Commit**

```bash
git add supabase/ .env.example
git commit -m "chore: link Supabase project and add env template"
```

---

### Task 1.5: Database migration - products table

**Files:**
- Create: `supabase/migrations/20260417000001_products.sql`

- [ ] **Step 1: Write failing test**

Create `tests/db/schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('products table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('products').select('id, slug, brand, model, category, summary_sv, summary_en, specs_json, image_url, editorial_notes, created_at, updated_at').limit(0);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- tests/db/schema.test.ts
```

Expected: FAIL, table `products` does not exist.

- [ ] **Step 3: Write migration SQL**

`supabase/migrations/20260417000001_products.sql`:
```sql
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
```

- [ ] **Step 4: Apply migration**

```bash
npx supabase db push
```

Expected: migration applied to remote DB.

- [ ] **Step 5: Run test to verify pass**

```bash
npm run test -- tests/db/schema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260417000001_products.sql tests/db/schema.test.ts
git commit -m "feat(db): add products table with pgvector extension"
```

---

### Task 1.6: Migration - review sources and chunks

**Files:**
- Create: `supabase/migrations/20260417000002_reviews.sql`

- [ ] **Step 1: Extend schema test**

Add to `tests/db/schema.test.ts`:
```ts
describe('review_sources table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('review_sources').select('id, product_id, source_type, publisher, url, title, published_at, rating_normalized, raw_text').limit(0);
    expect(error).toBeNull();
  });
});

describe('review_chunks table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('review_chunks').select('id, source_id, product_id, chunk_text, embedding').limit(0);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify fail**

```bash
npm run test -- tests/db/schema.test.ts
```

Expected: FAIL, review_sources does not exist.

- [ ] **Step 3: Write migration SQL**

`supabase/migrations/20260417000002_reviews.sql`:
```sql
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
```

Note: pgvector ivfflat index added later when we have embeddings; empty table gives bad centroids.

- [ ] **Step 4: Apply and verify**

```bash
npx supabase db push
npm run test -- tests/db/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260417000002_reviews.sql tests/db/schema.test.ts
git commit -m "feat(db): add review_sources and review_chunks tables"
```

---

### Task 1.7: Migration - affiliate and clicks

**Files:**
- Create: `supabase/migrations/20260417000003_affiliate.sql`

- [ ] **Step 1: Extend schema test**

Add:
```ts
describe('affiliate_links table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('affiliate_links').select('id, product_id, retailer, url_template, network, currency, region, price_current, last_checked_at').limit(0);
    expect(error).toBeNull();
  });
});

describe('affiliate_clicks table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('affiliate_clicks').select('id, user_id, session_id, product_id, affiliate_link_id, ip_hash, user_agent, referer, clicked_at').limit(0);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
npm run test -- tests/db/schema.test.ts
```

- [ ] **Step 3: Write migration**

`supabase/migrations/20260417000003_affiliate.sql`:
```sql
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
```

- [ ] **Step 4: Apply and verify**

```bash
npx supabase db push
npm run test -- tests/db/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260417000003_affiliate.sql tests/db/schema.test.ts
git commit -m "feat(db): add affiliate_links and affiliate_clicks tables"
```

---

### Task 1.8: Migration - chat and memory

**Files:**
- Create: `supabase/migrations/20260417000004_chat_and_memory.sql`

- [ ] **Step 1: Extend schema test**

Add:
```ts
describe('chat_sessions table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('chat_sessions').select('id, user_id, title, created_at').limit(0);
    expect(error).toBeNull();
  });
});

describe('chat_messages table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('chat_messages').select('id, session_id, role, content_md, cards_json, llm_provider, llm_model, latency_ms, prompt_tokens, completion_tokens, rag_chunks_used').limit(0);
    expect(error).toBeNull();
  });
});

describe('user_memory table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('user_memory').select('user_id, key, value_text, updated_at').limit(0);
    expect(error).toBeNull();
  });
});

describe('long_tail_misses table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('long_tail_misses').select('id, user_id, session_id, query_text, detected_product_hint, created_at').limit(0);
    expect(error).toBeNull();
  });
});

describe('llm_usage table', () => {
  it('has expected columns', async () => {
    const { error } = await supabase.from('llm_usage').select('day, provider, model, request_count, prompt_tokens, completion_tokens').limit(0);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Write migration**

`supabase/migrations/20260417000004_chat_and_memory.sql`:
```sql
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
```

- [ ] **Step 4: Apply and verify**

```bash
npx supabase db push
npm run test -- tests/db/schema.test.ts
```

Expected: all schema tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260417000004_chat_and_memory.sql tests/db/schema.test.ts
git commit -m "feat(db): add chat, memory, long_tail_misses, and llm_usage tables"
```

---

### Task 1.9: Row-level security (RLS) policies

**Files:**
- Create: `supabase/migrations/20260417000005_rls.sql`

- [ ] **Step 1: Write RLS test**

Create `tests/db/rls.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('RLS', () => {
  it('anon cannot insert into chat_messages', async () => {
    const { error } = await anon.from('chat_messages').insert({
      session_id: '00000000-0000-0000-0000-000000000000',
      role: 'user',
      content_md: 'hack',
    });
    expect(error).not.toBeNull();
  });

  it('anon can read products', async () => {
    const { error } = await anon.from('products').select('id').limit(1);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect first test to fail** (no RLS yet, insert succeeds)

- [ ] **Step 3: Write migration**

`supabase/migrations/20260417000005_rls.sql`:
```sql
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
```

Notera: `affiliate_clicks`, `long_tail_misses`, och `llm_usage` har RLS enabled utan policies, vilket innebär att dessa är service-role-only (ingen anon- eller authenticated-access). Detta är avsiktligt eftersom dessa skrivs av backend-kod och läses bara av admin-vyn via service role.

- [ ] **Step 4: Apply and verify**

```bash
npx supabase db push
npm run test -- tests/db/rls.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260417000005_rls.sql tests/db/rls.test.ts
git commit -m "feat(db): enable RLS with public read and user-scoped writes"
```

---

### Task 1.10: Generate TypeScript types from DB

**Files:**
- Create: `src/types/supabase.ts`

- [ ] **Step 1: Generate types**

```bash
npx supabase gen types typescript --linked > src/types/supabase.ts
```

- [ ] **Step 2: Verify types file**

Open `src/types/supabase.ts` and confirm interface `Database` exists with all tables. No manual edits.

- [ ] **Step 3: Commit**

```bash
git add src/types/supabase.ts
git commit -m "chore: generate TypeScript types from Supabase schema"
```

---

### Task 1.11: Supabase clients (server and browser)

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/admin.ts`.

- [ ] **Step 1: Write test**

Create `tests/lib/supabase.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';

describe('admin client', () => {
  it('can read products with service role', async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.from('products').select('id').limit(1);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Implement clients**

`src/lib/supabase/admin.ts`:
```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

`src/lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all) => { all.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
}
```

`src/lib/supabase/browser.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npm run test -- tests/lib/supabase.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/ tests/lib/supabase.test.ts
git commit -m "feat: add Supabase server, browser, and admin clients"
```

---

### Task 1.12: LLM provider abstraction - interface and Gemini implementation

**Files:**
- Create: `src/lib/llm/types.ts`, `src/lib/llm/gemini.ts`, `src/lib/llm/provider.ts`.

- [ ] **Step 1: Write test**

Create `tests/lib/llm.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getLLMProvider } from '@/lib/llm/provider';

describe('LLM provider', () => {
  it('returns Gemini provider when LLM_PROVIDER=gemini', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    const provider = getLLMProvider();
    expect(provider.name).toBe('gemini');
  });

  it('generates a response', async () => {
    const provider = getLLMProvider();
    const result = await provider.generate({
      system: 'Du är en hjälpsam assistent.',
      messages: [{ role: 'user', content: 'Säg hej på svenska.' }],
      maxTokens: 50,
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Define types**

`src/lib/llm/types.ts`:
```ts
export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateParams {
  system: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  responseSchema?: object;
  tools?: LLMTool[];
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: object;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface LLMResult {
  text: string;
  parsed?: unknown;
  toolCalls?: { name: string; args: unknown }[];
  usage: LLMUsage;
}

export interface LLMProvider {
  name: string;
  generate(params: LLMGenerateParams): Promise<LLMResult>;
  generateStream(params: LLMGenerateParams): AsyncIterable<{ type: 'token' | 'tool_call' | 'done'; data: unknown }>;
}
```

- [ ] **Step 4: Implement Gemini**

`src/lib/llm/gemini.ts`:
```ts
import { GoogleGenAI } from '@google/genai';
import type { LLMProvider, LLMGenerateParams, LLMResult } from './types';

const MODEL = 'gemini-2.0-flash';

export function createGeminiProvider(): LLMProvider {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  return {
    name: 'gemini',

    async generate(params: LLMGenerateParams): Promise<LLMResult> {
      const contents = params.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const config: Record<string, unknown> = {
        systemInstruction: params.system,
        temperature: params.temperature ?? 0.4,
        maxOutputTokens: params.maxTokens ?? 2048,
      };

      if (params.responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = params.responseSchema;
      }

      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config,
      });

      const text = response.text || '';
      let parsed: unknown = undefined;
      if (params.responseSchema) {
        try { parsed = JSON.parse(text); }
        catch (e) { throw new Error(`Gemini returned non-JSON despite schema: ${text.slice(0, 200)}`); }
      }
      return {
        text,
        parsed,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    },

    async *generateStream(params: LLMGenerateParams) {
      const contents = params.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
      const stream = await ai.models.generateContentStream({
        model: MODEL,
        contents,
        config: {
          systemInstruction: params.system,
          temperature: params.temperature ?? 0.4,
          maxOutputTokens: params.maxTokens ?? 2048,
        },
      });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) yield { type: 'token' as const, data: text };
      }
      yield { type: 'done' as const, data: null };
    },
  };
}
```

- [ ] **Step 5: Implement provider dispatcher**

`src/lib/llm/provider.ts`:
```ts
import type { LLMProvider } from './types';
import { createGeminiProvider } from './gemini';

let cached: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cached) return cached;
  const name = process.env.LLM_PROVIDER || 'gemini';
  switch (name) {
    case 'gemini':
      cached = createGeminiProvider();
      return cached;
    default:
      throw new Error(`Unknown LLM provider: ${name}`);
  }
}

export function resetProviderCache() {
  cached = null;
}
```

- [ ] **Step 6: Run tests**

```bash
npm run test -- tests/lib/llm.test.ts
```

Expected: PASS. (Requires `GEMINI_API_KEY` in `.env.local`.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/llm/ tests/lib/llm.test.ts
git commit -m "feat(llm): add provider abstraction and Gemini 2.0 Flash implementation"
```

---

### Task 1.13: Embedding provider abstraction

**Files:**
- Create: `src/lib/llm/embeddings.ts`.

- [ ] **Step 1: Write test**

Create `tests/lib/embeddings.test.ts`:
```ts
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
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement**

`src/lib/llm/embeddings.ts`:
```ts
import { GoogleGenAI } from '@google/genai';

const MODEL = 'text-embedding-004';
const DIM = 768;

export async function embed(input: string): Promise<number[]>;
export async function embed(input: string[]): Promise<number[][]>;
export async function embed(input: string | string[]): Promise<number[] | number[][]> {
  const provider = process.env.EMBEDDING_PROVIDER || 'gemini';
  if (provider !== 'gemini') {
    throw new Error(`Unknown embedding provider: ${provider}`);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const texts = Array.isArray(input) ? input : [input];
  const results = await Promise.all(
    texts.map(async (text) => {
      const res = await ai.models.embedContent({
        model: MODEL,
        contents: text,
      });
      return res.embeddings?.[0]?.values ?? [];
    })
  );
  return Array.isArray(input) ? results : results[0];
}

export const EMBEDDING_DIM = DIM;
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/lib/embeddings.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/embeddings.ts tests/lib/embeddings.test.ts
git commit -m "feat(llm): add Gemini embeddings with 768-dim output"
```

---

### Task 1.14: Vitest configuration

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`.

- [ ] **Step 1: Write config**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

`tests/setup.ts`:
```ts
import { config } from 'dotenv';
config({ path: '.env.local' });
```

- [ ] **Step 2: Install dotenv**

```bash
npm install -D dotenv
```

- [ ] **Step 3: Run full test suite**

```bash
npm run test
```

Expected: all previously written tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json package-lock.json
git commit -m "chore(test): configure Vitest with env loading and path aliases"
```

---

## Chunk 2: Walking skeleton (seed data, chat API, frontend chat UI)

### Task 2.1: Seed script for 5 headphones

**Files:**
- Create: `scripts/seed-products.ts`, `seed-data/products.json`.

- [ ] **Step 1: Write seed data**

`seed-data/products.json`:
```json
[
  {
    "slug": "sony-wh-1000xm5",
    "brand": "Sony",
    "model": "WH-1000XM5",
    "category": "over-ear",
    "summary_sv": "Sonys flaggskepp med branschledande ANC, 30 timmars batteritid och bekväm passform för långa lyssningssessioner.",
    "summary_en": "Sony's flagship with industry-leading ANC, 30 hours battery and a comfortable fit for long listening sessions.",
    "specs_json": {"anc": true, "battery_h": 30, "weight_g": 250, "bluetooth": "5.2", "codecs": ["LDAC", "AAC", "SBC"]},
    "image_url": "https://example.com/xm5.jpg",
    "editorial_notes": "Bäst i test hos M3 och Ljud & Bild 2025-2026."
  },
  {
    "slug": "bose-quietcomfort-ultra",
    "brand": "Bose",
    "model": "QuietComfort Ultra",
    "category": "over-ear",
    "summary_sv": "Bose QC Ultra prioriterar komfort och ljudmiljö, med marknadens bekvämaste passform.",
    "summary_en": "Bose QC Ultra prioritises comfort and sound staging with arguably the most comfortable fit on the market.",
    "specs_json": {"anc": true, "battery_h": 24, "weight_g": 254, "bluetooth": "5.3", "codecs": ["aptX Adaptive", "AAC"]},
    "image_url": "https://example.com/qc-ultra.jpg",
    "editorial_notes": ""
  },
  {
    "slug": "sennheiser-momentum-4",
    "brand": "Sennheiser",
    "model": "Momentum 4",
    "category": "over-ear",
    "summary_sv": "Sennheiser Momentum 4 har 60 timmars batteritid och ett raffinerat ljud som många testare kallar branschbäst.",
    "summary_en": "Sennheiser Momentum 4 has 60 hours of battery life and refined sound that many reviewers call best in class.",
    "specs_json": {"anc": true, "battery_h": 60, "weight_g": 293, "bluetooth": "5.2", "codecs": ["aptX Adaptive", "AAC"]},
    "image_url": "https://example.com/momentum4.jpg",
    "editorial_notes": ""
  },
  {
    "slug": "apple-airpods-pro-2",
    "brand": "Apple",
    "model": "AirPods Pro 2",
    "category": "true-wireless",
    "summary_sv": "Apples in-ear med stark ANC, transparensläge och djup iOS-integration.",
    "summary_en": "Apple in-ear with strong ANC, transparency mode and deep iOS integration.",
    "specs_json": {"anc": true, "battery_h": 6, "weight_g": 5, "bluetooth": "5.3", "codecs": ["AAC"]},
    "image_url": "https://example.com/airpods-pro2.jpg",
    "editorial_notes": ""
  },
  {
    "slug": "sony-wf-1000xm5",
    "brand": "Sony",
    "model": "WF-1000XM5",
    "category": "true-wireless",
    "summary_sv": "Sony WF-1000XM5 är små, bekväma och har mycket stark ANC för in-ear.",
    "summary_en": "Sony WF-1000XM5 are small, comfortable and have very strong ANC for in-ear.",
    "specs_json": {"anc": true, "battery_h": 8, "weight_g": 6, "bluetooth": "5.3", "codecs": ["LDAC", "AAC"]},
    "image_url": "https://example.com/wf-xm5.jpg",
    "editorial_notes": ""
  }
]
```

- [ ] **Step 2: Write seed script**

`scripts/seed-products.ts`:
```ts
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@/lib/supabase/admin';

async function main() {
  const data = JSON.parse(readFileSync('seed-data/products.json', 'utf8'));
  const supabase = createAdminClient();
  const { error } = await supabase.from('products').upsert(data, { onConflict: 'slug' });
  if (error) throw error;
  console.log(`Seeded ${data.length} products`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Add package.json script**

Modify `package.json` scripts:
```json
"seed": "tsx scripts/seed-products.ts"
```

- [ ] **Step 4: Run seed**

```bash
npm run seed
```

Expected: `Seeded 5 products`.

- [ ] **Step 5: Verify in Supabase dashboard** and confirm 5 rows in `products`.

- [ ] **Step 6: Commit**

```bash
git add seed-data/ scripts/seed-products.ts package.json
git commit -m "feat: seed 5 reference headphones into products table"
```

---

### Task 2.2: Simple RAG retrieval (text search fallback for now)

**Files:**
- Create: `src/lib/rag/retrieve.ts`.

- [ ] **Step 1: Write test**

Create `tests/lib/rag.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { retrieveProducts } from '@/lib/rag/retrieve';

describe('retrieveProducts', () => {
  it('returns products matching brand keyword', async () => {
    const results = await retrieveProducts('Sony', 3);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.brand === 'Sony')).toBe(true);
  });

  it('returns all products for empty query up to limit', async () => {
    const results = await retrieveProducts('', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement**

`src/lib/rag/retrieve.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin';

export interface RetrievedProduct {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  summary_sv: string | null;
  summary_en: string | null;
  specs_json: Record<string, unknown>;
  image_url: string | null;
  editorial_notes: string | null;
}

export async function retrieveProducts(query: string, limit = 5): Promise<RetrievedProduct[]> {
  const supabase = createAdminClient();
  const qb = supabase.from('products').select('*');
  const { data, error } = query
    ? await qb.or(`brand.ilike.%${query}%,model.ilike.%${query}%,summary_sv.ilike.%${query}%,summary_en.ilike.%${query}%`).limit(limit)
    : await qb.limit(limit);
  if (error) throw error;
  return (data ?? []) as RetrievedProduct[];
}
```

Note: this is a text-match placeholder. Replaced by vector search in Chunk 3.

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/lib/rag.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/ tests/lib/rag.test.ts
git commit -m "feat(rag): add naive text-match product retrieval (placeholder for vector search)"
```

---

### Task 2.3: Response schema and prompt builder

**Files:**
- Create: `src/lib/chat/schema.ts`, `src/lib/chat/prompt.ts`.

- [ ] **Step 1: Write test**

Create `tests/lib/chat-prompt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/chat/prompt';

describe('buildSystemPrompt', () => {
  it('includes persona and locale', () => {
    const p = buildSystemPrompt({ locale: 'sv' });
    expect(p).toContain('varm');
    expect(p).toContain('svenska');
  });

  it('switches tone to English for en locale', () => {
    const p = buildSystemPrompt({ locale: 'en' });
    expect(p).toContain('English');
  });
});

describe('buildUserPrompt', () => {
  it('embeds product summaries into prompt', () => {
    const p = buildUserPrompt({
      userMessage: 'bästa för pendling?',
      products: [{ slug: 'sony-wh-1000xm5', brand: 'Sony', model: 'WH-1000XM5', summary_sv: 'stark ANC', summary_en: '', category: 'over-ear', specs_json: {}, image_url: null, editorial_notes: null, id: '1' }],
      userFacts: [],
      recentMessages: [],
      locale: 'sv',
    });
    expect(p).toContain('Sony');
    expect(p).toContain('stark ANC');
    expect(p).toContain('bästa för pendling?');
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement schema**

`src/lib/chat/schema.ts`:
```ts
export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    intro_md: { type: 'string' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['product_card', 'comparison_table', 'video', 'quote'] },
          product_id: { type: 'string' },
          product_ids: { type: 'array', items: { type: 'string' } },
          angle: { type: 'string' },
          columns: { type: 'array', items: { type: 'string' } },
          youtube_id: { type: 'string' },
          caption: { type: 'string' },
          text: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['type'],
      },
    },
    outro_md: { type: 'string' },
    followup_suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['intro_md', 'blocks', 'outro_md', 'followup_suggestions'],
};

export interface ChatResponse {
  intro_md: string;
  blocks: ChatBlock[];
  outro_md: string;
  followup_suggestions: string[];
}

export type ChatBlock =
  | { type: 'product_card'; product_id: string; angle: string }
  | { type: 'comparison_table'; product_ids: string[]; columns: string[] }
  | { type: 'video'; youtube_id: string; caption: string }
  | { type: 'quote'; text: string; source: string };
```

- [ ] **Step 4: Implement prompt builder**

`src/lib/chat/prompt.ts`:
```ts
import type { RetrievedProduct } from '@/lib/rag/retrieve';
import type { LLMMessage } from '@/lib/llm/types';

export interface BuildPromptParams {
  userMessage: string;
  products: RetrievedProduct[];
  userFacts: string[];
  recentMessages: LLMMessage[];
  locale: 'sv' | 'en';
}

export function buildSystemPrompt({ locale }: { locale: 'sv' | 'en' }): string {
  const sv = `Du är Betyget, en varm och kunnig kompis som hjälper användare hitta bästa hörlurarna för deras behov.
Svara alltid på svenska. Var konkret och rak, undvik svammel. Håll tonen som en knowledgeable vän, inte som en säljare.
Använd endast produkt-slugs från listan under "TILLGÄNGLIGA PRODUKTER". Hitta inte på produkter.
Returnera strukturerat JSON enligt det angivna schemat. Välj format baserat på frågan:
- Specifik köpfråga (1 produkt): ett eller tre product_card-block med "angle" som summerar varför.
- Utforskande fråga (flera kandidater): comparison_table med 3-5 produkter.
- Påstående som bevisas av test: inkludera ett quote-block med citat och källa.
Om användaren frågar om en produkt som inte finns i listan, var ärlig och säg att du inte har djup data där ännu.`;

  const en = `You are Betyget, a warm and knowledgeable friend helping users find the best headphones for their needs.
Always respond in English. Be concrete and direct, avoid fluff. Keep the tone of a knowledgeable friend, not a salesperson.
Only use product slugs from the "AVAILABLE PRODUCTS" list. Do not make up products.
Return structured JSON matching the schema. Choose format based on the question:
- Specific purchase question: one or three product_card blocks with "angle" summarising why.
- Exploratory question: comparison_table with 3-5 products.
- Claim backed by a test: include a quote block with citation.
If the user asks about a product not in the list, be honest that you do not have deep data on it yet.`;

  return locale === 'sv' ? sv : en;
}

export function buildUserPrompt(params: BuildPromptParams): string {
  const { userMessage, products, userFacts, recentMessages, locale } = params;
  const lines: string[] = [];

  if (userFacts.length > 0) {
    lines.push(locale === 'sv' ? 'VAD VI VET OM ANVÄNDAREN:' : 'WHAT WE KNOW ABOUT THE USER:');
    for (const f of userFacts) lines.push(`- ${f}`);
    lines.push('');
  }

  lines.push(locale === 'sv' ? 'TILLGÄNGLIGA PRODUKTER:' : 'AVAILABLE PRODUCTS:');
  for (const p of products) {
    const summary = locale === 'sv' ? (p.summary_sv ?? p.summary_en ?? '') : (p.summary_en ?? p.summary_sv ?? '');
    lines.push(`- slug: ${p.slug} | ${p.brand} ${p.model} | ${p.category} | specs: ${JSON.stringify(p.specs_json)} | ${summary}`);
  }
  lines.push('');

  if (recentMessages.length > 0) {
    lines.push(locale === 'sv' ? 'SENASTE SAMTALET:' : 'RECENT CONVERSATION:');
    for (const m of recentMessages) lines.push(`${m.role}: ${m.content}`);
    lines.push('');
  }

  lines.push(locale === 'sv' ? 'ANVÄNDARENS FRÅGA:' : 'USER QUESTION:');
  lines.push(userMessage);

  return lines.join('\n');
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- tests/lib/chat-prompt.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chat/ tests/lib/chat-prompt.test.ts
git commit -m "feat(chat): add response schema and SV/EN prompt builder"
```

---

### Task 2.4: Chat service (compose RAG + prompt + LLM)

**Files:**
- Create: `src/lib/chat/service.ts`.

- [ ] **Step 1: Write test**

Create `tests/lib/chat-service.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateChatResponse } from '@/lib/chat/service';

describe('generateChatResponse', () => {
  it('returns a valid ChatResponse for a headphone question', async () => {
    const result = await generateChatResponse({
      userMessage: 'Vilka hörlurar är bäst för pendling, budget 3000 kr?',
      userFacts: [],
      recentMessages: [],
      locale: 'sv',
    });
    expect(result.response.intro_md.length).toBeGreaterThan(0);
    expect(result.response.blocks.length).toBeGreaterThan(0);
    expect(result.response.followup_suggestions.length).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
  }, 60000);
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement**

`src/lib/chat/service.ts`:
```ts
import { getLLMProvider } from '@/lib/llm/provider';
import { retrieveProducts } from '@/lib/rag/retrieve';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { RESPONSE_SCHEMA, type ChatResponse } from './schema';
import type { LLMMessage } from '@/lib/llm/types';

export interface GenerateChatParams {
  userMessage: string;
  userFacts: string[];
  recentMessages: LLMMessage[];
  locale: 'sv' | 'en';
}

export interface GenerateChatResult {
  response: ChatResponse;
  usage: { promptTokens: number; completionTokens: number };
  provider: string;
  model: string;
  latencyMs: number;
  ragChunksUsed: number;
}

export async function generateChatResponse(params: GenerateChatParams): Promise<GenerateChatResult> {
  const start = Date.now();
  const products = await retrieveProducts(params.userMessage, 10);

  const llm = getLLMProvider();
  const result = await llm.generate({
    system: buildSystemPrompt({ locale: params.locale }),
    messages: [
      ...params.recentMessages,
      { role: 'user', content: buildUserPrompt({ ...params, products }) },
    ],
    responseSchema: RESPONSE_SCHEMA,
    temperature: 0.4,
    maxTokens: 2048,
  });

  return {
    response: result.parsed as ChatResponse,
    usage: result.usage,
    provider: llm.name,
    model: 'gemini-2.0-flash',
    latencyMs: Date.now() - start,
    ragChunksUsed: products.length,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/lib/chat-service.test.ts
```

Expected: PASS (requires working Gemini API key).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/service.ts tests/lib/chat-service.test.ts
git commit -m "feat(chat): compose RAG retrieval, prompt, and LLM call into chat service"
```

---

### Task 2.5: Chat API endpoint with streaming

**Files:**
- Create: `src/app/api/chat/route.ts`.

- [ ] **Step 1: Write integration test**

Create `tests/api/chat.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('POST /api/chat', () => {
  it('returns SSE events including blocks', async () => {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Vilka hörlurar är bäst för pendling?', locale: 'sv' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('event: blocks');
    expect(text).toContain('event: done');
  }, 60000);
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement endpoint**

`src/app/api/chat/route.ts`:
```ts
import { NextRequest } from 'next/server';
import { generateChatResponse } from '@/lib/chat/service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { message, locale } = await req.json();
  if (!message || typeof message !== 'string') {
    return new Response('Message required', { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await generateChatResponse({
          userMessage: message,
          userFacts: [],
          recentMessages: [],
          locale: locale === 'en' ? 'en' : 'sv',
        });

        for (const ch of result.response.intro_md) write('intro', { token: ch });
        write('blocks', { blocks: result.response.blocks });
        write('outro', { outro_md: result.response.outro_md, followup_suggestions: result.response.followup_suggestions });
        write('done', { provider: result.provider, latencyMs: result.latencyMs });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        write('error', { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
    },
  });
}
```

- [ ] **Step 4: Run dev server, run test, kill server**

```bash
npm run dev &
DEV_PID=$!
sleep 4
npm run test -- tests/api/chat.test.ts
RESULT=$?
kill $DEV_PID 2>/dev/null
exit $RESULT
```

Expected: PASS. Server killed after test.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/chat/route.ts tests/api/chat.test.ts
git commit -m "feat(api): add /api/chat endpoint with SSE streaming"
```

---

### Task 2.6: Root layout and Tailwind globals

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`.

- [ ] **Step 1: Write layout**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Betyget',
  description: 'AI-driven produktrekommendation för hörlurar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-white text-gray-800 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Extend globals**

Append to `src/app/globals.css`:
```css
:root {
  --brand-blue: #0268c9;
  --brand-blue-dark: #0256a3;
  --brand-orange: #f57c00;
  --brand-orange-dark: #e06e00;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(ui): configure root layout and brand color variables"
```

---

### Task 2.7: Topnav component

**Files:**
- Create: `src/components/topnav.tsx`.

- [ ] **Step 1: Write component**

`src/components/topnav.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Topnav() {
  return (
    <nav className="flex items-center gap-3 px-5 py-3 bg-white">
      <Link href="/" className="font-bold text-xl text-[var(--brand-blue)]">Betyget</Link>
      <div className="flex-1" />
      <Button variant="outline" size="sm">Historik</Button>
      <Button variant="outline" size="sm">Hörlurar</Button>
      <Button variant="outline" size="sm">SV</Button>
      <Button size="sm" className="bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-dark)]">Ny fråga</Button>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/topnav.tsx
git commit -m "feat(ui): add minimal Topnav component with brand styling"
```

---

### Task 2.8: Product card component

**Files:**
- Create: `src/components/product-card.tsx`.

- [ ] **Step 1: Write test**

Create `tests/components/product-card.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/product-card';

const sample = {
  id: '1',
  slug: 'sony-wh-1000xm5',
  brand: 'Sony',
  model: 'WH-1000XM5',
  price_from: 2990,
  store_count: 6,
  rating: 4.7,
  test_count: 247,
  specs: ['ANC', '30h batteri', '250 g'],
  image_url: null,
  is_winner: true,
  angle: 'Bästa ANC',
  affiliate_link_id: 'abc',
};

describe('ProductCard', () => {
  it('renders brand and model', () => {
    render(<ProductCard {...sample} />);
    expect(screen.getByText('Sony')).toBeDefined();
    expect(screen.getByText('WH-1000XM5')).toBeDefined();
  });

  it('shows Bäst i test badge for winners', () => {
    render(<ProductCard {...sample} />);
    expect(screen.getByText('Bäst i test')).toBeDefined();
  });
});
```

Update `tests/setup.ts` to include jsdom for React tests:
```ts
import { config } from 'dotenv';
import '@testing-library/jest-dom/vitest';
config({ path: '.env.local' });
```

Add environment override in `vitest.config.ts` for `.tsx` tests (or use `// @vitest-environment jsdom` at top of test file). For simplicity, set `environment: 'jsdom'` globally.

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement**

`src/components/product-card.tsx`:
```tsx
export interface ProductCardProps {
  id: string;
  slug: string;
  brand: string;
  model: string;
  price_from: number | null;
  store_count: number;
  rating: number | null;
  test_count: number;
  specs: string[];
  image_url: string | null;
  is_winner?: boolean;
  angle?: string;
  affiliate_link_id: string | null;
}

export function ProductCard(p: ProductCardProps) {
  const priceFormatted = p.price_from ? `${p.price_from.toLocaleString('sv-SE')} kr` : null;
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-[var(--brand-blue)] hover:shadow-md transition">
      {p.is_winner && (
        <span className="absolute top-2 left-2 bg-[var(--brand-orange)] text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
          Bäst i test
        </span>
      )}
      {p.angle && (
        <span className="absolute top-2 right-2 bg-gray-100 text-gray-700 text-[0.6rem] font-semibold px-1.5 py-0.5 rounded">
          {p.angle}
        </span>
      )}
      <div className="h-24 bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center text-gray-400 text-xs">
        {p.image_url ? <img src={p.image_url} alt={p.model} className="h-full object-contain" /> : `${p.brand} ${p.model}`}
      </div>
      <div className="px-3 py-2">
        <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-gray-500">{p.brand}</div>
        <div className="text-sm font-semibold text-gray-800">{p.model}</div>
        {p.rating !== null && (
          <div className="text-xs text-gray-600 mt-1">
            <span className="text-[var(--brand-orange)]">{'★'.repeat(Math.round(p.rating))}</span> {p.rating.toFixed(1)} · {p.test_count} tester
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {p.specs.map((s) => (
            <span key={s} className="text-[0.6rem] bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">{s}</span>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-200 px-3 py-2 flex justify-between items-center bg-gray-50">
        <div className="flex flex-col">
          <span className="text-[0.6rem] text-gray-500">Från</span>
          <span className="text-sm font-bold text-[var(--brand-blue)]">{priceFormatted ?? 'pris saknas'}</span>
        </div>
        {p.affiliate_link_id && (
          <a href={`/go/${p.affiliate_link_id}`} className="bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-dark)] text-white text-xs font-semibold px-2.5 py-1.5 rounded">
            Köp
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/components/product-card.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/product-card.tsx tests/components/product-card.test.tsx vitest.config.ts tests/setup.ts
git commit -m "feat(ui): add ProductCard component with Bäst i test badge"
```

---

### Task 2.9: Chat view with streaming rendering

**Files:**
- Create: `src/components/chat-view.tsx`, `src/lib/sse-client.ts`.

- [ ] **Step 1: Write SSE helper**

`src/lib/sse-client.ts`:
```ts
export interface SSEHandlers {
  onIntroToken?: (token: string) => void;
  onBlocks?: (blocks: unknown[]) => void;
  onOutro?: (outro: string, followups: string[]) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

export async function streamChat(message: string, locale: 'sv' | 'en', handlers: SSEHandlers) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, locale }),
  });
  if (!res.ok || !res.body) {
    handlers.onError?.('Request failed');
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const raw of events) {
      const lines = raw.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event: '));
      const dataLine = lines.find((l) => l.startsWith('data: '));
      if (!eventLine || !dataLine) continue;
      const event = eventLine.slice('event: '.length);
      const data = JSON.parse(dataLine.slice('data: '.length));
      if (event === 'intro') handlers.onIntroToken?.(data.token);
      else if (event === 'blocks') handlers.onBlocks?.(data.blocks);
      else if (event === 'outro') handlers.onOutro?.(data.outro_md, data.followup_suggestions);
      else if (event === 'done') handlers.onDone?.();
      else if (event === 'error') handlers.onError?.(data.message);
    }
  }
}
```

- [ ] **Step 2: Implement ChatView**

`src/components/chat-view.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { streamChat } from '@/lib/sse-client';
import { ProductCard } from '@/components/product-card';

interface Turn {
  role: 'user' | 'assistant';
  intro: string;
  blocks: unknown[];
  outro: string;
  followups: string[];
}

export function ChatView() {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);

  async function send() {
    if (!input.trim() || streaming) return;
    const userTurn: Turn = { role: 'user', intro: input, blocks: [], outro: '', followups: [] };
    const botTurn: Turn = { role: 'assistant', intro: '', blocks: [], outro: '', followups: [] };
    setTurns((t) => [...t, userTurn, botTurn]);
    const message = input;
    setInput('');
    setStreaming(true);
    await streamChat(message, 'sv', {
      onIntroToken: (tok) => setTurns((t) => {
        const updated = [...t];
        updated[updated.length - 1] = { ...updated[updated.length - 1], intro: updated[updated.length - 1].intro + tok };
        return updated;
      }),
      onBlocks: (blocks) => setTurns((t) => {
        const updated = [...t];
        updated[updated.length - 1] = { ...updated[updated.length - 1], blocks };
        return updated;
      }),
      onOutro: (outro, followups) => setTurns((t) => {
        const updated = [...t];
        updated[updated.length - 1] = { ...updated[updated.length - 1], outro, followups };
        return updated;
      }),
      onDone: () => setStreaming(false),
      onError: () => setStreaming(false),
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {turns.map((t, i) => (
          <TurnBubble key={i} turn={t} />
        ))}
      </div>
      <div className="p-5">
        <input
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Fråga om hörlurar..."
          disabled={streaming}
        />
      </div>
    </div>
  );
}

function TurnBubble({ turn }: { turn: Turn }) {
  if (turn.role === 'user') {
    return <div className="self-end max-w-[85%] bg-[var(--brand-blue)] text-white rounded-xl px-4 py-3 text-sm">{turn.intro}</div>;
  }
  return (
    <div className="self-start w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
      <div>{turn.intro}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
        {turn.blocks.map((b, i) => {
          const block = b as { type: string; product_id?: string; angle?: string };
          if (block.type === 'product_card') {
            return <div key={i}>{/* Full ProductCard needs product lookup - see Task 2.10 */}<ProductCardPlaceholder angle={block.angle} productId={block.product_id} /></div>;
          }
          return null;
        })}
      </div>
      {turn.outro && <div className="mt-2">{turn.outro}</div>}
      {turn.followups.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {turn.followups.map((f) => (
            <span key={f} className="text-xs border border-[var(--brand-blue)] text-[var(--brand-blue)] rounded-full px-3 py-1 cursor-pointer">{f}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCardPlaceholder({ productId, angle }: { productId?: string; angle?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase">{angle}</div>
      <div className="text-sm">{productId}</div>
    </div>
  );
}
```

Note: Task 2.10 replaces the placeholder with real product lookup.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat-view.tsx src/lib/sse-client.ts
git commit -m "feat(ui): add ChatView with SSE streaming and input handling"
```

---

### Task 2.10: Product lookup API and integration

**Files:**
- Create: `src/app/api/products/route.ts`, `tests/api/products.test.ts`.
- Modify: `src/components/chat-view.tsx`.

- [ ] **Step 1: Write API test**

Create `tests/api/products.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('GET /api/products', () => {
  it('returns products when filtering by slugs', async () => {
    const res = await fetch('http://localhost:3000/api/products?slugs=sony-wh-1000xm5');
    expect(res.status).toBe(200);
    const { products } = await res.json();
    expect(products.length).toBe(1);
    expect(products[0].slug).toBe('sony-wh-1000xm5');
  });
});
```

- [ ] **Step 2: Implement products API**

`src/app/api/products/route.ts`:
```ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  const slugs = req.nextUrl.searchParams.get('slugs')?.split(',').filter(Boolean) ?? [];
  const supabase = createAdminClient();
  let query = supabase.from('products').select('*');
  if (ids.length > 0) query = query.in('id', ids);
  else if (slugs.length > 0) query = query.in('slug', slugs);
  else query = query.limit(20);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ products: data });
}
```

- [ ] **Step 3: Replace placeholder in ChatView**

In `src/components/chat-view.tsx`, at the top add imports:
```tsx
import { useEffect, useState } from 'react';
import { ProductCard, type ProductCardProps } from '@/components/product-card';
```

Remove the `ProductCardPlaceholder` function. Add `ProductCardFromSlug`:
```tsx
function ProductCardFromSlug({ slug, angle, isWinner }: { slug: string; angle?: string; isWinner?: boolean }) {
  const [product, setProduct] = useState<ProductCardProps | null>(null);
  useEffect(() => {
    fetch(`/api/products?slugs=${slug}`).then(r => r.json()).then(({ products }) => {
      const p = products[0];
      if (!p) return;
      setProduct({
        id: p.id, slug: p.slug, brand: p.brand, model: p.model,
        price_from: null, store_count: 0, rating: null, test_count: 0,
        specs: Object.entries(p.specs_json ?? {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`),
        image_url: p.image_url, is_winner: isWinner, angle, affiliate_link_id: null,
      });
    });
  }, [slug]);
  if (!product) return <div className="h-36 bg-gray-100 animate-pulse rounded-xl" />;
  return <ProductCard {...product} />;
}
```

In `TurnBubble`, change the block-rendering branch from:
```tsx
if (block.type === 'product_card') {
  return <div key={i}>{/* ... */}<ProductCardPlaceholder angle={block.angle} productId={block.product_id} /></div>;
}
```
to:
```tsx
if (block.type === 'product_card') {
  return <ProductCardFromSlug key={i} slug={block.product_id} angle={block.angle} isWinner={i === 0} />;
}
```

Also update `ProductCard` component and the schema: `product_card.product_id` is currently a slug (we use slugs in prompts). Keep slugs as the input.

- [ ] **Step 4: Run API test**

Start dev server and run test with kill:
```bash
npm run dev &
DEV_PID=$!
sleep 4
npm run test -- tests/api/products.test.ts
RESULT=$?
kill $DEV_PID 2>/dev/null
exit $RESULT
```

Expected: PASS.

- [ ] **Step 5: Manual test**

Run `npm run dev`, open http://localhost:3000, type "bästa hörlurar för pendling", confirm streaming text and that product cards render with real brand/model.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/products/ tests/api/products.test.ts src/components/chat-view.tsx
git commit -m "feat: fetch real products from API to render streamed ProductCards"
```

---

### Task 2.11: Homepage with startvy and chat view

**Files:**
- Modify: `src/app/page.tsx`.

- [ ] **Step 1: Implement**

`src/app/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Topnav } from '@/components/topnav';
import { ChatView } from '@/components/chat-view';
import { ProductCard } from '@/components/product-card';

export default function HomePage() {
  const [started, setStarted] = useState(false);

  return (
    <>
      <Topnav />
      {started ? <ChatView /> : <Landing onStart={() => setStarted(true)} />}
    </>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="text-3xl font-bold text-center text-gray-800 tracking-tight">Vad letar du efter?</h1>
      <p className="text-center text-gray-600 mt-2 text-base">Fråga om hörlurar så guidar jag dig till bäst i test för just ditt behov.</p>
      <input
        className="w-full mt-6 border-2 border-[var(--brand-blue)] rounded-xl px-5 py-4 text-base"
        placeholder="Vilka är de bästa hörlurarna för..."
        onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) onStart(); }}
      />
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {['Pendling, ANC', 'Gym, svettsäkra', 'Under 1000 kr', 'Bäst ljud 2026'].map((c) => (
          <span key={c} className="text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full text-gray-700 cursor-pointer hover:border-[var(--brand-blue)]" onClick={onStart}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
```

Note: a fuller landing page with "Populära hörlurar nu" cards is added in Task 2.12.

- [ ] **Step 2: Manual test**

Run `npm run dev`, go to http://localhost:3000, verify:
- Topnav with "Betyget" logo and buttons.
- Big "Vad letar du efter?" heading.
- Clicking a chip or pressing Enter enters chat view.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): add landing page with start view and chat transition"
```

---

### Task 2.12: Populära hörlurar section on landing

**Files:**
- Modify: `src/app/page.tsx`.

- [ ] **Step 1: Fetch on landing**

Modify `Landing` to fetch `/api/products?ids=` (or latest 4) on mount and render as ProductCards under the chips:

```tsx
const [popular, setPopular] = useState<ProductCardProps[]>([]);
useEffect(() => {
  fetch('/api/products').then(r => r.json()).then(({ products }) => {
    setPopular(products.slice(0, 4).map((p: any, i: number) => ({
      id: p.id, slug: p.slug, brand: p.brand, model: p.model,
      price_from: null, store_count: 0, rating: 4.5 + i * 0.1, test_count: 100 + i * 50,
      specs: Object.keys(p.specs_json ?? {}).slice(0, 3),
      image_url: p.image_url, is_winner: i === 0, angle: undefined, affiliate_link_id: null,
    })));
  });
}, []);
```

Render below chips:
```tsx
<div className="mt-10">
  <h2 className="text-base font-semibold text-gray-800 mb-3">Populära hörlurar nu</h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
    {popular.map((p) => <ProductCard key={p.id} {...p} />)}
  </div>
</div>
```

- [ ] **Step 2: Manual verify**

Page loads, 4 product cards render in grid under chips, orange "Bäst i test" badge on first card.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): add 'Populära hörlurar nu' section on landing"
```

---

### Task 2.13: Deploy walking skeleton to Vercel

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Write and commit vercel.json**

`vercel.json`:
```json
{
  "framework": "nextjs",
  "regions": ["arn1"]
}
```

Commit before deploy:
```bash
git add vercel.json
git commit -m "chore: configure Vercel deployment in Stockholm region"
```

- [ ] **Step 2: Deploy**

```bash
npx vercel
```

First run prompts for linking. After link, run:
```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add GEMINI_API_KEY production
```

Then deploy:
```bash
npx vercel --prod
```

- [ ] **Step 3: Smoke test production**

Open the production URL. Type a question. Verify end-to-end flow works.

**End of Chunk 2. Walking skeleton is now live in production.**

---

## Chunk 3: Real data pipeline (scraping, embeddings, vector RAG)

### Task 3.1: Port Cloudflare Browser Rendering module

**Files:**
- Create: `src/lib/scraper/cloudflare.ts`.
- Reference: `/Users/gabriellundberg/e-scraper-v2/src/lib/scraper/cloudflare.ts`.

- [ ] **Step 1: Copy and adapt**

Copy `cloudflare.ts` from e-scraper-v2 to `src/lib/scraper/cloudflare.ts`. Keep: `startCrawl`, `getCrawlResult`, `crawlAndWait`, `renderPage`, `renderWithCF`. Remove the SPA-specific heuristics for now (keep generic).

Ensure TypeScript strict mode compiles. Replace any `any` usages with proper types where cheap.

- [ ] **Step 2: Write smoke test**

Create `tests/lib/cloudflare.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderPage } from '@/lib/scraper/cloudflare';

describe('renderPage', () => {
  it('fetches a static HTML page', async () => {
    const html = await renderPage('https://example.com');
    expect(html.toLowerCase()).toContain('<html');
  }, 30000);
});
```

- [ ] **Step 3: Run test**

```bash
npm run test -- tests/lib/cloudflare.test.ts
```

Expected: PASS (requires CF env vars).

- [ ] **Step 4: Commit**

```bash
git add src/lib/scraper/cloudflare.ts tests/lib/cloudflare.test.ts
git commit -m "feat(scraper): port Cloudflare Browser Rendering client from e-scraper-v2"
```

---

### Task 3.2: Review source parsers (start with one site)

**Files:**
- Create: `src/lib/scraper/parsers/rtings.ts`, `src/lib/scraper/parsers/types.ts`.

- [ ] **Step 1: Define parser interface**

`src/lib/scraper/parsers/types.ts`:
```ts
export interface ParsedReview {
  publisher: string;
  url: string;
  title: string | null;
  published_at: string | null;
  rating_normalized: number | null;
  raw_text: string;
}

export interface Parser {
  publisher: string;
  canParse(url: string): boolean;
  parse(html: string, url: string): ParsedReview | null;
}
```

- [ ] **Step 2: Write test**

Create `tests/lib/parsers/rtings.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { rtingsParser } from '@/lib/scraper/parsers/rtings';

describe('rtingsParser', () => {
  it('parses a review page', () => {
    const html = readFileSync('tests/fixtures/rtings-xm5.html', 'utf8');
    const parsed = rtingsParser.parse(html, 'https://www.rtings.com/headphones/reviews/sony/wh-1000xm5-wireless');
    expect(parsed).not.toBeNull();
    expect(parsed!.publisher).toBe('RTINGS');
    expect(parsed!.title).toContain('Sony');
    expect(parsed!.raw_text.length).toBeGreaterThan(500);
    expect(parsed!.rating_normalized).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Fetch fixture**

Run once:
```bash
mkdir -p tests/fixtures
curl -A 'Mozilla/5.0' -L 'https://www.rtings.com/headphones/reviews/sony/wh-1000xm5-wireless' -o tests/fixtures/rtings-xm5.html
```

- [ ] **Step 4: Implement parser**

`src/lib/scraper/parsers/rtings.ts`:
```ts
import * as cheerio from 'cheerio';
import type { Parser, ParsedReview } from './types';

export const rtingsParser: Parser = {
  publisher: 'RTINGS',
  canParse(url) {
    return url.includes('rtings.com/headphones/reviews/');
  },
  parse(html, url): ParsedReview | null {
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim() || null;
    const score = parseFloat($('.product-page-score, .score').first().text().trim());
    const body = $('.product-review, .review-body, article').first().text().replace(/\s+/g, ' ').trim();
    if (!body) return null;
    return {
      publisher: 'RTINGS',
      url,
      title,
      published_at: null,
      rating_normalized: isFinite(score) ? score : null,
      raw_text: body,
    };
  },
};
```

- [ ] **Step 5: Run test**

```bash
npm run test -- tests/lib/parsers/rtings.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scraper/parsers/ tests/lib/parsers/ tests/fixtures/rtings-xm5.html
git commit -m "feat(scraper): add RTINGS review parser with fixture-based test"
```

---

### Task 3.3: Add two more parsers (M3, Ljud & Bild)

**Files:**
- Create: `src/lib/scraper/parsers/m3.ts`, `src/lib/scraper/parsers/ljudochbild.ts`.

- [ ] **Step 1: Fetch fixtures**

```bash
curl -A 'Mozilla/5.0' -L '<m3 article URL>' -o tests/fixtures/m3-xm5.html
curl -A 'Mozilla/5.0' -L '<ljudochbild article URL>' -o tests/fixtures/ljudochbild-xm5.html
```

- [ ] **Step 2: Write tests mirroring rtings.test.ts** for each site.

- [ ] **Step 3: Implement parsers**

Each follows the same shape as `rtings.ts`. Selectors vary per site. Start with greedy `article` selector, refine later.

- [ ] **Step 4: Run tests, ensure all pass.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper/parsers/m3.ts src/lib/scraper/parsers/ljudochbild.ts tests/lib/parsers/ tests/fixtures/m3-xm5.html tests/fixtures/ljudochbild-xm5.html
git commit -m "feat(scraper): add M3 and Ljud & Bild review parsers"
```

---

### Task 3.4: Parser registry and dispatcher

**Files:**
- Create: `src/lib/scraper/parsers/index.ts`.

- [ ] **Step 1: Implement**

```ts
import { rtingsParser } from './rtings';
import { m3Parser } from './m3';
import { ljudochbildParser } from './ljudochbild';
import type { Parser, ParsedReview } from './types';

const PARSERS: Parser[] = [rtingsParser, m3Parser, ljudochbildParser];

export function parseReview(url: string, html: string): ParsedReview | null {
  const parser = PARSERS.find((p) => p.canParse(url));
  if (!parser) return null;
  return parser.parse(html, url);
}

export { PARSERS };
```

- [ ] **Step 2: Write integration test**

Verify dispatcher picks correct parser for each URL pattern.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scraper/parsers/index.ts tests/lib/parsers/index.test.ts
git commit -m "feat(scraper): add parser registry and URL-based dispatcher"
```

---

### Task 3.5: YouTube transcript fetcher

**Files:**
- Create: `src/lib/scraper/youtube.ts`.

- [ ] **Step 1: Install dep**

```bash
npm install youtube-transcript
```

- [ ] **Step 2: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { fetchTranscript } from '@/lib/scraper/youtube';

describe('fetchTranscript', () => {
  it('returns transcript text for a known video', async () => {
    const result = await fetchTranscript('dQw4w9WgXcQ');
    expect(result.text.length).toBeGreaterThan(100);
  }, 30000);
});
```

- [ ] **Step 3: Implement**

`src/lib/scraper/youtube.ts`:
```ts
import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptResult {
  videoId: string;
  text: string;
}

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  const text = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  return { videoId, text };
}
```

- [ ] **Step 4: Run test and commit**

```bash
git add src/lib/scraper/youtube.ts tests/lib/youtube.test.ts package.json
git commit -m "feat(scraper): add YouTube transcript fetcher"
```

---

### Task 3.6: Product matcher (LLM-assisted)

**Files:**
- Create: `src/lib/scraper/matcher.ts`.

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { matchProduct } from '@/lib/scraper/matcher';

describe('matchProduct', () => {
  it('matches a Sony XM5 article to the right product slug', async () => {
    const slug = await matchProduct({
      title: 'Sony WH-1000XM5 review',
      text: 'The WH-1000XM5 is Sony flagship with industry-leading ANC...',
      candidates: [
        { slug: 'sony-wh-1000xm5', brand: 'Sony', model: 'WH-1000XM5' },
        { slug: 'bose-quietcomfort-ultra', brand: 'Bose', model: 'QC Ultra' },
      ],
    });
    expect(slug).toBe('sony-wh-1000xm5');
  }, 30000);
});
```

- [ ] **Step 2: Implement**

`src/lib/scraper/matcher.ts`:
```ts
import { getLLMProvider } from '@/lib/llm/provider';

export interface MatchInput {
  title: string | null;
  text: string;
  candidates: { slug: string; brand: string; model: string }[];
}

export async function matchProduct(input: MatchInput): Promise<string | null> {
  const llm = getLLMProvider();
  const list = input.candidates.map((c) => `- ${c.slug}: ${c.brand} ${c.model}`).join('\n');
  const snippet = input.text.slice(0, 2000);
  const result = await llm.generate({
    system: 'You match product reviews to catalog entries. Return the slug of the single best match, or the word "none".',
    messages: [{ role: 'user', content: `Title: ${input.title}\nText: ${snippet}\n\nCandidates:\n${list}\n\nReturn only the slug (or "none").` }],
    maxTokens: 30,
    temperature: 0,
  });
  const raw = result.text.trim().replace(/^["']|["']$/g, '');
  if (raw === 'none') return null;
  const match = input.candidates.find((c) => c.slug === raw);
  return match ? raw : null;
}
```

- [ ] **Step 3: Run test and commit**

```bash
git add src/lib/scraper/matcher.ts tests/lib/matcher.test.ts
git commit -m "feat(scraper): add LLM-assisted product matcher"
```

---

### Task 3.7: Chunker

**Files:**
- Create: `src/lib/scraper/chunker.ts`.

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { chunkText } from '@/lib/scraper/chunker';

describe('chunkText', () => {
  it('splits long text into ~500-token chunks', () => {
    const text = 'lorem ipsum '.repeat(500);
    const chunks = chunkText(text, { targetTokens: 100, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks[0].length).toBeLessThan(text.length);
  });

  it('does not chunk short text', () => {
    const chunks = chunkText('short text here', { targetTokens: 100, overlapTokens: 20 });
    expect(chunks).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implement**

```ts
export interface ChunkOptions {
  targetTokens: number;
  overlapTokens: number;
}

export function chunkText(text: string, opts: ChunkOptions): string[] {
  const words = text.split(/\s+/);
  const tokensPerWord = 1.3;
  const wordsPerChunk = Math.floor(opts.targetTokens / tokensPerWord);
  const overlapWords = Math.floor(opts.overlapTokens / tokensPerWord);
  if (words.length <= wordsPerChunk) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
    i += wordsPerChunk - overlapWords;
  }
  return chunks;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/scraper/chunker.ts tests/lib/chunker.test.ts
git commit -m "feat(scraper): add word-based chunker with configurable overlap"
```

---

### Task 3.8: Ingest pipeline end-to-end

**Files:**
- Create: `src/lib/scraper/ingest.ts`, `scripts/ingest.ts`.

- [ ] **Step 1: Implement ingest function**

`src/lib/scraper/ingest.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin';
import { renderPage } from './cloudflare';
import { parseReview } from './parsers';
import { fetchTranscript } from './youtube';
import { matchProduct } from './matcher';
import { chunkText } from './chunker';
import { embed } from '@/lib/llm/embeddings';

export interface IngestTask {
  type: 'article' | 'youtube';
  url: string;
  video_id?: string;
}

export async function ingestOne(task: IngestTask) {
  const supabase = createAdminClient();
  const { data: products } = await supabase.from('products').select('id, slug, brand, model');
  const candidates = (products ?? []).map((p) => ({ slug: p.slug, brand: p.brand, model: p.model }));

  let raw_text = '';
  let title: string | null = null;
  let publisher = '';
  let rating: number | null = null;

  if (task.type === 'article') {
    const html = await renderPage(task.url);
    const parsed = parseReview(task.url, html);
    if (!parsed) { console.warn(`No parser matched ${task.url}`); return; }
    raw_text = parsed.raw_text;
    title = parsed.title;
    publisher = parsed.publisher;
    rating = parsed.rating_normalized;
  } else {
    const transcript = await fetchTranscript(task.video_id!);
    raw_text = transcript.text;
    publisher = 'YouTube';
    title = `YouTube ${task.video_id}`;
  }

  const slug = await matchProduct({ title, text: raw_text, candidates });
  if (!slug) { console.warn(`No product match for ${task.url}`); return; }

  const product = (products ?? []).find((p) => p.slug === slug)!;

  const { data: source } = await supabase
    .from('review_sources')
    .upsert({ product_id: product.id, source_type: task.type, publisher, url: task.url, title, rating_normalized: rating, raw_text }, { onConflict: 'url' })
    .select('id')
    .single();
  if (!source) return;

  await supabase.from('review_chunks').delete().eq('source_id', source.id);

  const chunks = chunkText(raw_text, { targetTokens: 500, overlapTokens: 50 });
  const embeddings = await embed(chunks);

  const rows = chunks.map((chunk_text, i) => ({
    source_id: source.id,
    product_id: product.id,
    chunk_text,
    embedding: embeddings[i],
  }));
  await supabase.from('review_chunks').insert(rows);

  console.log(`Ingested ${task.url} -> ${slug} (${chunks.length} chunks)`);
}
```

- [ ] **Step 2: CLI runner**

`scripts/ingest.ts`:
```ts
import { readFileSync } from 'node:fs';
import { ingestOne, type IngestTask } from '@/lib/scraper/ingest';

async function main() {
  const file = process.argv[2] || 'seed-data/ingest-tasks.json';
  const tasks: IngestTask[] = JSON.parse(readFileSync(file, 'utf8'));
  for (const task of tasks) {
    try { await ingestOne(task); }
    catch (e) { console.error(`Failed ${task.url}:`, e); }
  }
}

main();
```

Add to package.json: `"ingest": "tsx scripts/ingest.ts"`.

- [ ] **Step 3: Create seed ingest tasks**

`seed-data/ingest-tasks.json`:
```json
[
  { "type": "article", "url": "https://www.rtings.com/headphones/reviews/sony/wh-1000xm5-wireless" },
  { "type": "article", "url": "https://www.rtings.com/headphones/reviews/bose/quietcomfort-ultra-wireless" },
  { "type": "youtube", "url": "https://youtube.com/watch?v=<real-id>", "video_id": "<real-id>" }
]
```

- [ ] **Step 4: Run ingest**

```bash
npm run ingest
```

Expected: logs `Ingested ... (N chunks)` per task.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper/ingest.ts scripts/ingest.ts seed-data/ingest-tasks.json package.json
git commit -m "feat(scraper): add end-to-end ingest pipeline"
```

---

### Task 3.9: pgvector index and vector RAG

**Files:**
- Create: `supabase/migrations/20260418000001_vector_index.sql`.
- Modify: `src/lib/rag/retrieve.ts`.

- [ ] **Step 1: Create vector index**

`supabase/migrations/20260418000001_vector_index.sql`:
```sql
create index if not exists idx_review_chunks_embedding on review_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_review_chunks(query_embedding vector(768), match_limit int default 10)
returns table (id uuid, product_id uuid, chunk_text text, similarity float)
language sql stable as $$
  select id, product_id, chunk_text, 1 - (embedding <=> query_embedding) as similarity
  from review_chunks
  order by embedding <=> query_embedding
  limit match_limit;
$$;
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

- [ ] **Step 3: Update retrieve.ts to use vector search**

```ts
import { createAdminClient } from '@/lib/supabase/admin';
import { embed } from '@/lib/llm/embeddings';

export interface RetrievedProduct {
  id: string; slug: string; brand: string; model: string; category: string;
  summary_sv: string | null; summary_en: string | null; specs_json: Record<string, unknown>;
  image_url: string | null; editorial_notes: string | null;
}

export interface RetrievedChunk {
  id: string; product_id: string; chunk_text: string; similarity: number;
}

export async function retrieveProductsAndChunks(query: string, topK = 10): Promise<{ products: RetrievedProduct[]; chunks: RetrievedChunk[] }> {
  const supabase = createAdminClient();
  const queryEmbedding = await embed(query);
  const { data: chunks, error } = await supabase.rpc('match_review_chunks', {
    query_embedding: queryEmbedding,
    match_limit: topK,
  });
  if (error) throw error;
  const productIds = [...new Set((chunks ?? []).map((c: RetrievedChunk) => c.product_id))];
  if (productIds.length === 0) {
    const { data } = await supabase.from('products').select('*').limit(topK);
    return { products: (data ?? []) as RetrievedProduct[], chunks: [] };
  }
  const { data: products } = await supabase.from('products').select('*').in('id', productIds);
  return { products: (products ?? []) as RetrievedProduct[], chunks: (chunks ?? []) as RetrievedChunk[] };
}

export async function retrieveProducts(query: string, limit = 10): Promise<RetrievedProduct[]> {
  const result = await retrieveProductsAndChunks(query, limit);
  return result.products;
}
```

- [ ] **Step 4: Extend chat prompt to include chunks**

Modify `src/lib/chat/prompt.ts`: add `chunks: RetrievedChunk[]` to `buildUserPrompt` params and embed them in the prompt under "RELEVANT EVIDENS:" section. Update chat service to pass chunks.

- [ ] **Step 5: Update service to use new retrieve**

```ts
// in service.ts
const { products, chunks } = await retrieveProductsAndChunks(params.userMessage, 10);
```

Pass `chunks` to `buildUserPrompt`.

- [ ] **Step 6: Test end-to-end**

```bash
npm run test -- tests/lib/rag.test.ts
npm run test -- tests/lib/chat-service.test.ts
```

Expected: PASS. Manual test: ask a pendling question and verify responses cite actual scraped content.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/ src/lib/rag/ src/lib/chat/
git commit -m "feat(rag): add pgvector ivfflat index and vector-based retrieval"
```

---

### Task 3.10: Scraping cron endpoint

**Files:**
- Create: `src/app/api/cron/scrape-reviews/route.ts`.
- Modify: `vercel.json`.

- [ ] **Step 1: Implement endpoint**

```ts
import { NextRequest } from 'next/server';
import { ingestOne } from '@/lib/scraper/ingest';
import { readFileSync } from 'node:fs';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const tasks = JSON.parse(readFileSync('seed-data/ingest-tasks.json', 'utf8'));
  const results = [];
  for (const task of tasks) {
    try { await ingestOne(task); results.push({ url: task.url, ok: true }); }
    catch (e) { results.push({ url: task.url, ok: false, error: (e as Error).message }); }
  }
  return Response.json({ results });
}
```

- [ ] **Step 2: Schedule in vercel.json**

```json
{
  "framework": "nextjs",
  "regions": ["arn1"],
  "crons": [
    { "path": "/api/cron/scrape-reviews", "schedule": "0 3 * * 0" }
  ]
}
```

- [ ] **Step 3: Commit and deploy**

```bash
git add src/app/api/cron/ vercel.json
git commit -m "feat(cron): add weekly scrape-reviews endpoint"
npx vercel --prod
```

**End of Chunk 3. Real data pipeline is live.**

---

## Chunk 4: Accounts (auth, chat history, Zep memory)

### Task 4.1: Supabase Auth configuration

- [ ] **Step 1: Enable providers in Supabase dashboard**

In Supabase dashboard → Authentication → Providers: enable Google (supply OAuth client id/secret from Google Cloud Console) and Email (with magic link only, no password).

- [ ] **Step 2: Configure redirect URLs**

Add to Supabase Auth settings: `http://localhost:3000/auth/callback`, `https://<your-vercel-domain>/auth/callback`.

- [ ] **Step 3: Note** (no code yet, just config). Commit no-op with `git commit --allow-empty -m "chore: enable Google and email magic link auth in Supabase dashboard"`.

---

### Task 4.2: Auth callback route

**Files:**
- Create: `src/app/auth/callback/route.ts`.

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('next') || '/';
  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, req.url));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat(auth): add Supabase OAuth callback route"
```

---

### Task 4.3: Sign-in page

**Files:**
- Create: `src/app/sign-in/page.tsx`.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const supabase = createBrowserSupabase();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` } });
  }

  async function signInWithEmail() {
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setSent(true);
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 border rounded-xl">
      <h1 className="text-xl font-bold mb-4">Logga in på Betyget</h1>
      <Button onClick={signInWithGoogle} className="w-full bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-dark)]">Fortsätt med Google</Button>
      <div className="text-center my-3 text-gray-500 text-sm">eller</div>
      {sent ? (
        <p className="text-sm text-gray-600">Kolla din e-post för en magisk länk.</p>
      ) : (
        <>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@email.se" />
          <Button onClick={signInWithEmail} className="w-full mt-2" variant="outline">Skicka magisk länk</Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/sign-in/
git commit -m "feat(auth): add sign-in page with Google and email magic link"
```

---

### Task 4.4: Auth middleware

**Files:**
- Create: `src/middleware.ts`.

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (all) => all.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );
  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron).*)'],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): add middleware to refresh sessions on each request"
```

---

### Task 4.5: Persist chat sessions and messages

**Files:**
- Modify: `src/app/api/chat/route.ts`.
- Create: `src/lib/chat/persist.ts`.

- [ ] **Step 1: Implement persistence helpers**

`src/lib/chat/persist.ts`:
```ts
import { createServerSupabase } from '@/lib/supabase/server';

export async function ensureSession(userId: string | null, sessionId: string | null, firstMessage: string): Promise<string> {
  const supabase = await createServerSupabase();
  if (sessionId) return sessionId;
  if (!userId) {
    const anon = crypto.randomUUID();
    return anon;
  }
  const title = firstMessage.slice(0, 60);
  const { data } = await supabase.from('chat_sessions').insert({ user_id: userId, title }).select('id').single();
  return data!.id;
}

export async function saveTurn(params: {
  sessionId: string;
  userId: string | null;
  userMessage: string;
  assistantMessage: string;
  cardsJson: unknown[];
  usage: { promptTokens: number; completionTokens: number };
  provider: string;
  model: string;
  latencyMs: number;
  ragChunksUsed: number;
}) {
  const supabase = await createServerSupabase();
  if (!params.userId) return;
  await supabase.from('chat_messages').insert([
    { session_id: params.sessionId, role: 'user', content_md: params.userMessage },
    {
      session_id: params.sessionId, role: 'assistant', content_md: params.assistantMessage,
      cards_json: params.cardsJson,
      llm_provider: params.provider, llm_model: params.model,
      latency_ms: params.latencyMs,
      prompt_tokens: params.usage.promptTokens, completion_tokens: params.usage.completionTokens,
      rag_chunks_used: params.ragChunksUsed,
    },
  ]);
}
```

- [ ] **Step 2: Update /api/chat to use persist**

Extract user from `createServerSupabase().auth.getUser()`, pass session_id from request body (optional), call `ensureSession` and `saveTurn`. Emit `session_id` in first SSE event so frontend can correlate.

- [ ] **Step 3: Commit**

```bash
git add src/lib/chat/persist.ts src/app/api/chat/route.ts
git commit -m "feat(chat): persist sessions and messages for logged-in users"
```

---

### Task 4.6: History drawer UI

**Files:**
- Create: `src/components/history-drawer.tsx`, `src/app/api/sessions/route.ts`.

- [ ] **Step 1: Sessions list API**

`src/app/api/sessions/route.ts`:
```ts
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ sessions: [] });
  const { data } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return Response.json({ sessions: data ?? [] });
}
```

- [ ] **Step 2: Drawer component**

Uses shadcn Sheet. Groups sessions into "Idag", "Denna vecka", "Tidigare" by `created_at`. Click loads session into ChatView (stores current session_id and fetches messages).

- [ ] **Step 3: Hook up to Topnav**

Modify `Topnav` to render `<HistoryDrawer />` behind "Historik"-button.

- [ ] **Step 4: Commit**

```bash
git add src/components/history-drawer.tsx src/app/api/sessions/ src/components/topnav.tsx
git commit -m "feat(ui): add history drawer with grouped session list"
```

---

### Task 4.7: Zep user memory integration

**Files:**
- Create: `src/lib/memory/zep.ts`.
- Modify: `src/lib/chat/service.ts`.

- [ ] **Step 1: Port from e-scraper-v2**

Reference `/Users/gabriellundberg/e-scraper-v2/src/lib/memory/zep-memory.ts`. Adapt to our use case.

`src/lib/memory/zep.ts`:
```ts
import { ZepClient } from '@getzep/zep-cloud';

let client: ZepClient | null = null;
function getZep(): ZepClient | null {
  if (!process.env.ZEP_API_KEY) return null;
  if (!client) client = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  return client;
}

export async function ensureUser(userId: string): Promise<boolean> {
  const zep = getZep();
  if (!zep) return false;
  try { await zep.user.get(userId); return true; }
  catch { try { await zep.user.add({ userId, metadata: { source: 'betyget' } }); return true; } catch { return false; } }
}

export async function addMessages(userId: string, userMsg: string, assistantMsg: string): Promise<void> {
  const zep = getZep();
  if (!zep) return;
  await ensureUser(userId);
  try {
    await (zep.graph as unknown as { add: (p: unknown) => Promise<void> }).add({
      userId,
      type: 'message',
      data: JSON.stringify({ messages: [{ role: 'user', content: userMsg }, { role: 'assistant', content: assistantMsg }] }),
    });
  } catch { /* swallow */ }
}

export async function getUserFacts(userId: string, query: string): Promise<string[]> {
  const zep = getZep();
  if (!zep) return [];
  try {
    const results = await (zep.graph as unknown as { search: (p: unknown) => Promise<{ edges?: { fact?: string }[] }> }).search({ userId, query, limit: 8 });
    return (results.edges ?? []).map((e) => e.fact ?? '').filter((f): f is string => f.length > 10);
  } catch { return []; }
}
```

- [ ] **Step 2: Supabase fallback**

`src/lib/memory/supabase.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin';

export async function getSupabaseFacts(userId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('user_memory').select('key, value_text').eq('user_id', userId).limit(20);
  return (data ?? []).map((m) => `${m.key}: ${m.value_text}`);
}

export async function upsertSupabaseFact(userId: string, key: string, value: string) {
  const supabase = createAdminClient();
  await supabase.from('user_memory').upsert({ user_id: userId, key, value_text: value, updated_at: new Date().toISOString() });
}
```

- [ ] **Step 3: Combined facts getter**

`src/lib/memory/index.ts`:
```ts
import { getUserFacts, addMessages } from './zep';
import { getSupabaseFacts } from './supabase';

export async function getMemoryFacts(userId: string | null, query: string): Promise<string[]> {
  if (!userId) return [];
  const zepFacts = await getUserFacts(userId, query);
  if (zepFacts.length > 0) return zepFacts;
  return getSupabaseFacts(userId);
}

export { addMessages };
```

- [ ] **Step 4: Integrate into chat service**

In `generateChatResponse`, accept `userId`, call `getMemoryFacts(userId, userMessage)` before RAG, pass to prompt builder as `userFacts`.

After response, call `addMessages(userId, userMessage, assistantIntroAndOutro)` (best-effort, non-blocking).

- [ ] **Step 5: Commit**

```bash
git add src/lib/memory/ src/lib/chat/service.ts
git commit -m "feat(memory): add Zep-first user memory with Supabase fallback"
```

**End of Chunk 4. Users have accounts, synced history, and personal memory.**

---

## Chunk 5: Polish (affiliate, rate limiting, admin, observability)

### Task 5.1: Affiliate link resolver

**Files:**
- Create: `src/lib/affiliate/resolve.ts`, `tests/lib/affiliate.test.ts`.

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { resolvePrimaryLink } from '@/lib/affiliate/resolve';

describe('resolvePrimaryLink', () => {
  it('returns cheapest active link for region', async () => {
    const link = await resolvePrimaryLink('sony-wh-1000xm5', 'SE');
    expect(link).not.toBeNull();
    expect(link!.region).toBe('SE');
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { createAdminClient } from '@/lib/supabase/admin';

export interface AffiliateLink {
  id: string; product_id: string; retailer: string; url_template: string;
  network: string; currency: string; region: 'SE' | 'EN'; price_current: number | null;
}

export async function resolvePrimaryLink(productSlug: string, region: 'SE' | 'EN'): Promise<AffiliateLink | null> {
  const supabase = createAdminClient();
  const { data: product } = await supabase.from('products').select('id').eq('slug', productSlug).single();
  if (!product) return null;
  const { data } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('product_id', product.id)
    .eq('region', region)
    .order('price_current', { ascending: true, nullsFirst: false })
    .limit(1)
    .single();
  return (data as AffiliateLink) ?? null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/affiliate/resolve.ts tests/lib/affiliate.test.ts
git commit -m "feat(affiliate): resolve primary link by cheapest price per region"
```

---

### Task 5.2: Affiliate injection in chat service

**Files:**
- Modify: `src/lib/chat/service.ts`, `src/lib/chat/schema.ts`.

- [ ] **Step 1: Extend block types to carry affiliate_link_id**

In `src/lib/chat/schema.ts`, add `affiliate_link_id?: string` to `product_card` and a parallel `affiliate_link_ids?: string[]` to `comparison_table`:
```ts
export type ChatBlock =
  | { type: 'product_card'; product_id: string; angle: string; affiliate_link_id?: string }
  | { type: 'comparison_table'; product_ids: string[]; columns: string[]; affiliate_link_ids?: string[] }
  | { type: 'video'; youtube_id: string; caption: string }
  | { type: 'quote'; text: string; source: string };
```

LLM does NOT produce these fields (keep schema optional). Backend fills them after LLM call.

- [ ] **Step 2: Enrich blocks in chat service**

In `src/lib/chat/service.ts`, after LLM returns, iterate blocks:
```ts
import { resolvePrimaryLink } from '@/lib/affiliate/resolve';

const region = params.locale === 'sv' ? 'SE' : 'EN';
const enrichedBlocks = await Promise.all(result.parsed!.blocks.map(async (b) => {
  if (b.type === 'product_card') {
    const link = await resolvePrimaryLink(b.product_id, region);
    return { ...b, affiliate_link_id: link?.id };
  }
  if (b.type === 'comparison_table') {
    const links = await Promise.all(b.product_ids.map((slug) => resolvePrimaryLink(slug, region)));
    return { ...b, affiliate_link_ids: links.map((l) => l?.id ?? '') };
  }
  return b;
}));

return {
  response: { ...result.parsed, blocks: enrichedBlocks },
  // ... rest
};
```

- [ ] **Step 3: Update frontend ProductCardFromSlug**

In `chat-view.tsx`, pass `affiliate_link_id` from the block into the `ProductCard` prop so the Köp-button link works.

- [ ] **Step 4: Commit**

```bash
git add src/lib/chat/service.ts
git commit -m "feat(chat): inject affiliate link IDs into product_card and comparison_table blocks"
```

---

### Task 5.3: /go redirect with click tracking

**Files:**
- Create: `src/app/go/[link_id]/route.ts`.

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { createHash } from 'node:crypto';

const DAILY_SALT = () => new Date().toISOString().slice(0, 10) + (process.env.CRON_SECRET || 'salt');

export async function GET(req: NextRequest, { params }: { params: Promise<{ link_id: string }> }) {
  const { link_id } = await params;
  const admin = createAdminClient();
  const { data: link } = await admin.from('affiliate_links').select('*').eq('id', link_id).single();
  if (!link) return new NextResponse('Not found', { status: 404 });

  const server = await createServerSupabase();
  const { data: { user } } = await server.auth.getUser();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '0.0.0.0';
  const ipHash = createHash('sha256').update(ip + DAILY_SALT()).digest('hex').slice(0, 32);

  await admin.from('affiliate_clicks').insert({
    user_id: user?.id ?? null,
    product_id: link.product_id,
    affiliate_link_id: link.id,
    ip_hash: ipHash,
    user_agent: req.headers.get('user-agent'),
    referer: req.headers.get('referer'),
  });

  return NextResponse.redirect(link.url_template);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/go/
git commit -m "feat(affiliate): add /go/[id] redirect with click tracking and ip_hash"
```

---

### Task 5.4: Rate limiting with Upstash

**Files:**
- Create: `src/lib/rate-limit.ts`.
- Modify: `src/app/api/chat/route.ts`, `src/app/go/[link_id]/route.ts`.

- [ ] **Step 1: Implement helper**

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const chatGuest = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'betyget:chat:guest' });
export const chatUser = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 h'), prefix: 'betyget:chat:user' });
export const goIp = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m'), prefix: 'betyget:go' });
```

- [ ] **Step 2: Apply to /api/chat**

```ts
const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
const limiter = user ? chatUser : chatGuest;
const key = user ? user.id : ip;
const { success, reset } = await limiter.limit(key);
if (!success) return new Response('Too many requests', { status: 429, headers: { 'retry-after': String(Math.ceil((reset - Date.now()) / 1000)) } });
```

Apply similar check in `/go/[link_id]` with `goIp`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts src/app/api/chat/route.ts src/app/go/
git commit -m "feat: add Upstash-based rate limiting for chat and affiliate redirects"
```

---

### Task 5.5: Admin page

**Files:**
- Create: `src/app/admin/page.tsx`, `src/app/api/admin/products/route.ts`.

- [ ] **Step 1: Guard**

Require email domain or allow-list. For MVP: check `user.email` against env var `ADMIN_EMAILS` (comma-separated).

- [ ] **Step 2: Admin API**

Endpoints: `GET /api/admin/products` returns list with review counts and last scrape. `POST /api/admin/products/:id` edits editorial_notes and summaries.

- [ ] **Step 3: Admin page**

Simple table: brand | model | source count | last scraped | edit button → modal with editable `editorial_notes`, `summary_sv`, `summary_en`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/ src/app/api/admin/
git commit -m "feat(admin): add minimal admin product list with edit"
```

---

### Task 5.6: llm_usage tracking

**Files:**
- Create: `src/lib/llm/usage.ts`.
- Modify: `src/lib/chat/service.ts`.

- [ ] **Step 1: Implement**

```ts
import { createAdminClient } from '@/lib/supabase/admin';

export async function trackUsage(provider: string, model: string, usage: { promptTokens: number; completionTokens: number }) {
  const supabase = createAdminClient();
  const day = new Date().toISOString().slice(0, 10);
  await supabase.rpc('increment_llm_usage', { p_day: day, p_provider: provider, p_model: model, p_requests: 1, p_prompt_tokens: usage.promptTokens, p_completion_tokens: usage.completionTokens });
}
```

- [ ] **Step 2: Migration for RPC**

`supabase/migrations/20260417000006_llm_usage_rpc.sql`:
```sql
create or replace function increment_llm_usage(p_day date, p_provider text, p_model text, p_requests bigint, p_prompt_tokens bigint, p_completion_tokens bigint)
returns void language sql as $$
  insert into llm_usage (day, provider, model, request_count, prompt_tokens, completion_tokens)
  values (p_day, p_provider, p_model, p_requests, p_prompt_tokens, p_completion_tokens)
  on conflict (day, provider, model) do update set
    request_count = llm_usage.request_count + excluded.request_count,
    prompt_tokens = llm_usage.prompt_tokens + excluded.prompt_tokens,
    completion_tokens = llm_usage.completion_tokens + excluded.completion_tokens;
$$;
```

- [ ] **Step 3: Call from chat service**

After each LLM call, `await trackUsage(provider, model, usage);`. Do not let tracking errors break the request.

- [ ] **Step 4: Commit**

```bash
git add src/lib/llm/usage.ts supabase/migrations/ src/lib/chat/service.ts
git commit -m "feat(observability): track daily LLM usage per provider and model"
```

---

### Task 5.7: Sentry setup

**Files:**
- Create: `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`.
- Modify: `next.config.ts`.

- [ ] **Step 1: Write client config**

`sentry.client.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

- [ ] **Step 2: Write server and edge configs**

`sentry.server.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

`sentry.edge.config.ts`: same content as server.

- [ ] **Step 3: Write instrumentation hook**

`instrumentation.ts`:
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config');
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config');
}
```

- [ ] **Step 4: Wrap Next config**

Modify `next.config.ts` to use `withSentryConfig`:
```ts
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
```

- [ ] **Step 5: Add Sentry env vars**

Add to `.env.local` and `.env.example`:
```
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

- [ ] **Step 6: Verify build succeeds**

```bash
npm run build
```

Expected: build succeeds with Sentry source map upload (or silent skip without auth token).

- [ ] **Step 7: Commit**

```bash
git add sentry.*.ts instrumentation.ts next.config.ts .env.example
git commit -m "chore(observability): add Sentry error tracking with 10% trace sampling"
```

---

### Task 5.8: Long-tail miss logging

**Files:**
- Modify: `src/lib/chat/service.ts`.

- [ ] **Step 1: Detect misses**

In `generateChatResponse`, if `chunks.length === 0` or average similarity below threshold (e.g., 0.6), log to `long_tail_misses`.

- [ ] **Step 2: Add helper**

```ts
async function logLongTailMiss(userId: string | null, sessionId: string | null, query: string) {
  const supabase = createAdminClient();
  await supabase.from('long_tail_misses').insert({ user_id: userId, session_id: sessionId, query_text: query });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/chat/service.ts
git commit -m "feat(observability): log long-tail misses as DB-expansion candidates"
```

---

### Task 5.9: Prompt regression test suite

**Files:**
- Create: `tests/regression/prompts.test.ts`, `tests/regression/fixtures/queries.json`.

- [ ] **Step 1: Define fixtures**

`tests/regression/fixtures/queries.json`:
```json
[
  { "id": "pendling-3000", "query": "Vilka hörlurar är bäst för tågpendling, budget 3000 kr?", "locale": "sv", "expect": { "min_products": 2, "must_include_any_of": ["sony-wh-1000xm5", "bose-quietcomfort-ultra", "sennheiser-momentum-4"] } },
  { "id": "compare-xm5-qc", "query": "Jämför Sony XM5 och Bose QC Ultra.", "locale": "sv", "expect": { "block_types": ["comparison_table"] } }
]
```

- [ ] **Step 2: Write runner**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateChatResponse } from '@/lib/chat/service';

const fixtures = JSON.parse(readFileSync('tests/regression/fixtures/queries.json', 'utf8'));

describe('prompt regression', () => {
  for (const f of fixtures) {
    it(f.id, async () => {
      const result = await generateChatResponse({ userMessage: f.query, userFacts: [], recentMessages: [], locale: f.locale });
      const productIds = result.response.blocks
        .flatMap((b: any) => b.product_id ? [b.product_id] : b.product_ids || [])
        .filter(Boolean);
      if (f.expect.min_products) expect(productIds.length).toBeGreaterThanOrEqual(f.expect.min_products);
      if (f.expect.must_include_any_of) expect(f.expect.must_include_any_of.some((slug: string) => productIds.includes(slug))).toBe(true);
      if (f.expect.block_types) expect(f.expect.block_types.some((t: string) => result.response.blocks.some((b: any) => b.type === t))).toBe(true);
    }, 60000);
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add tests/regression/
git commit -m "test: add prompt regression suite with fixture queries"
```

---

### Task 5.10: Production deploy checklist

**Files:**
- Create: `docs/deploy-checklist.md`.

- [ ] **Step 1: Write**

```markdown
# Deploy checklist

## Before first production deploy

- [ ] All Vercel env vars set (copy from .env.local): Supabase, Gemini, Zep, Cloudflare, Upstash, Sentry, ADMIN_EMAILS, CRON_SECRET.
- [ ] Supabase production project exists (not shared with dev).
- [ ] Google OAuth credentials have production domain in redirect URIs.
- [ ] Magic link email template customized in Supabase dashboard.
- [ ] Sitemap allowed in robots.txt for scraping targets (verified).
- [ ] Affiliate programs approved (Adtraction, Amazon, Awin) for at least 3 retailers.
- [ ] At least 20 products seeded.
- [ ] At least 60 review sources ingested (3+ per product).
- [ ] pgvector index rebuilt after large ingest (ANALYZE review_chunks).

## Before each deploy

- [ ] `npm run test` passes.
- [ ] Regression suite passes (`npm run test -- tests/regression`).
- [ ] `npm run build` succeeds locally.
- [ ] Manual smoke on preview URL: ask 3 test questions, verify product cards render, click a buy button.

## Post deploy

- [ ] Verify /api/chat works in production with real LLM call.
- [ ] Cron job shows as scheduled in Vercel dashboard.
- [ ] Sentry receives test error (trigger from /admin page).
- [ ] Check `llm_usage` table increments after first query.
```

- [ ] **Step 2: Commit**

```bash
git add docs/deploy-checklist.md
git commit -m "docs: add production deploy checklist"
```

**End of Chunk 5. MVP is complete and ready for launch preparation.**

---

## Post-launch work (not covered by this plan)

- Bilingual SEO pages for top queries ("Bästa hörlurar 2026").
- Expand DB to ~100 products, extend seed list iteratively.
- Add second category (högtalare or TV) as separate spec + plan.
- Add own video reviews (separate pipeline).
- Community reviews or ratings (needs community first).
- Price history and alerts.
- Mobile native app (later).
