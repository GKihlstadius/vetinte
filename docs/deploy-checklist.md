# Betyget deploy checklist

## Before first production deploy

- [ ] All Vercel env vars set (copy from `.env.local`):
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - LLM: `GEMINI_API_KEY`, `GROQ_API_KEY`, `LLM_PROVIDER`, `EMBEDDING_PROVIDER`
  - Memory: `ZEP_API_KEY`
  - Scraping: `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CRON_SECRET`
  - Admin: `ADMIN_EMAILS` (comma-separated)
  - Rate limit (when added): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Observability (when added): `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- [ ] Supabase Auth URL Configuration: Site URL + `https://betyget.vercel.app/auth/callback` whitelisted.
- [ ] Supabase magic link email template includes `{{ .Token }}` so OTP-code fallback works.
- [ ] Google OAuth credentials configured in Supabase Auth if Google sign-in is desired.
- [ ] At least 20 products seeded (`npm run seed` + expand `seed-data/products.json`).
- [ ] At least 60 review sources ingested (3+ per product). Run `npm run ingest` against a fuller `seed-data/ingest-tasks.json`.
- [ ] After large ingest, run `analyze review_chunks;` in Supabase SQL editor for pgvector index stats.
- [ ] Affiliate programs approved for at least 3 retailers (Adtraction / Awin / Amazon Associates).

## Before each deploy

- [ ] `npm run test` passes (excluding regression suite which hits LLM).
- [ ] `npm run build` succeeds locally.
- [ ] Regression suite passes on a day where Gemini/Groq quota is intact: `npm run test -- tests/regression`.
- [ ] Manual smoke on preview URL: ask 3 test questions, verify product cards render, click a /go link.

## Post deploy

- [ ] `GET /` returns 200.
- [ ] `POST /api/chat` returns SSE stream with `event: blocks` and `event: done`.
- [ ] `GET /api/products?slugs=sony-wh-1000xm5` returns the product.
- [ ] Cron `/api/cron/scrape-reviews` is scheduled in Vercel dashboard.
- [ ] `llm_usage` table has a row for today after first chat (check via Supabase MCP or dashboard).
- [ ] Admin page `/admin` loads for whitelisted email.
- [ ] Sentry (when added) receives a test error.
