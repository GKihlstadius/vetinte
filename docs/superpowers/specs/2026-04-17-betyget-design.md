# Betyget: Design Spec

**Datum:** 2026-04-17
**Status:** Godkänd brainstorming, under spec-review
**Arbetsnamn:** Betyget (namnkandidat med bock i anteckningarna)

## Översikt

Betyget är en AI-driven produktrekommendationsapp, en sorts "Prisjakt fast för bäst i test". Användaren ställer frågor i naturligt språk ("vilka hörlurar är bäst för pendling, budget 3000 kr?") och får svar byggda på skrapade tester, YouTube-recensioner och egen kurerad data. Primär affärsmodell är affiliate-intäkter via köp-knappar.

MVP fokuserar på en kategori (hörlurar) och två språk (svenska + engelska) med mål att sedan expandera.

## Mål

- Användaren kan ställa både specifika köpfrågor och utforskande frågor via en chat och få relevanta rekommendationer.
- Svar backas av riktig testdata, inte bara LLM-kunskap.
- Köp-knappar går via affiliate-länkar med spårning.
- Användarkonto med synkad chatthistorik och personlig anpassning över tid (minne av preferenser).
- Snabba svar: genereringstid under 3 sekunder för huvuddelen av frågor.
- Dubbel språkstart (svenska + engelska) från dag ett.

## Icke-mål för MVP

- Andra kategorier än hörlurar. Expansion kommer senare.
- Community-recensioner, användarkommentarer, betyg satta av användare.
- Prishistorik-grafer. Endast aktuellt pris visas.
- Realtid-skrapning vid query-tid. All data förbereds offline.
- Filter-sidopanel (sortera på pris/varumärke). Chatten ersätter filter.
- Mobilapp. Responsiv webbapp räcker.
- Betalmodul, prenumerationer, premium-features.
- Avancerat admin-UI. Enkel produktlista med flagga/redigera räcker.
- Bildgenerering. Externa produktbilder (Prisjakt, Amazon) räcker.
- Automatisk upptäckt av nya produkter. Manuell seed-lista kuraterar de ~100 som täcks.
- Egna videoreviews. Kommer senare, YouTube-inbäddningar räcker nu.

## Primär målgrupp och kärnanvändning

Svensk- och engelsktalande konsumenter som ska köpa hörlurar och vill ha ett snabbt, tydligt, trovärdigt svar. Både de som vet exakt vad de vill ha ("Sony XM5 vs Bose QC Ultra") och de som utforskar ("vad finns det för bra trådlösa under 1500 kr?").

Samma chat-UI hanterar båda flödena. LLM:en avgör svarsformat per fråga.

## Arkitektur

Tre lager plus externt.

### Klient

- Webbapp (Next.js 16 + React 19 + Tailwind v4 + shadcn/ui).
- Responsiv desktop och mobil.
- Språkvalet SV/EN är per session, drivet av en knapp i toppen och användarens locale i Supabase.

### Applikation

- **API-backend** (Next.js API routes): chat-endpoint, auth, historik-synk, affiliate-klickspårning, cron-mottagare.
- **RAG-motor**: tar användarfråga, hämtar användar-fakta från Zep, kör semantisk sök i `review_chunks`, bygger prompt, anropar LLM med structured output, returnerar blocks-struktur.
- **LLM-provider-abstraktion** (`src/lib/llm/provider.ts`): switch mellan Gemini, Groq, Claude via env-var. Samma mönster för embeddings.

### Data

- Supabase Postgres + pgvector extension.
- Zep Cloud för AI-extraherade användar-fakta (över-session minne).
- Supabase Auth för Google + e-post magic link.

### Externt

- Scraping-jobb via Vercel Cron (veckovis reviews, dagligen priser).
- Affiliate-nätverk (Adtraction, Awin, Amazon Associates) för länkgenerering och provisionsspårning.
- YouTube för transkript-hämtning.

### Dataflöde vid en fråga

1. Användare skickar fråga från klienten till `/api/chat`.
2. API:et autentiserar användaren, laddar session + senaste N meddelanden från `chat_messages`.
3. RAG-motorn hämtar Zep-fakta för user_id + aktuell query.
4. RAG-motorn kör semantisk sök i `review_chunks` (embedding av frågan, topp K relevanta chunks).
5. RAG-motorn bygger prompt: systemprompt (persona: "varm kunnig kompis") + Zep-fakta + RAG-chunks + produktdata + senaste N chat-meddelanden + aktuell fråga.
6. LLM anropas med structured output schema (blocks).
7. Affiliate-länkar slås upp för alla `product_card` och `comparison_table`-block, ersätts med redirect-URLer (`/go/[link_id]`).
8. Svar streamas till klient: intro_md först token-för-token, sedan blocks som helhet, sedan outro_md och followup_suggestions.
9. User + assistant-par sparas i Supabase och skickas till Zep för fakta-extraktion.

### Scraping-flöde (offline, cron)

1. **Upptäck**: seed-lista av produkter manuellt kuraterad. Sitemap-crawl (via `/browser-rendering/crawl`) på testsajter för att hitta artiklar som nämner dem.
2. **Hämta**: direkt fetch först, Cloudflare Browser Rendering som fallback för JS-tunga sidor. Återanvänd mönstret från `e-scraper-v2/src/lib/scraper/cloudflare.ts`. Rate-limit 2s mellan CF-anrop.
3. **Parsa**: Cheerio för HTML, `youtube-transcript-api` för YouTube. Extrahera titel, författare, publiceringsdatum, rating, body-text.
4. **Matcha produkt**: LLM-assisterad matchning mot produktkatalogen. Mönster från `analyze_product_matching_v3.mjs`.
5. **Chunka**: 500-token chunks med 50-token overlap.
6. **Embedda**: Gemini `text-embedding-004` (primär) eller Cloudflare Workers AI BGE (fallback). Batch-anrop.
7. **Lagra**: `review_sources` och `review_chunks` i Supabase. URL som unique key för dedup.

## Datamodell

Supabase Postgres, pgvector för embeddings, `ivfflat`-index på `review_chunks.embedding`.

### Produktkatalog

**`products`**: de kurerade hörlurarna.
- `id`, `slug`, `brand`, `model`, `category` (in-ear, over-ear, true-wireless).
- `summary_sv`, `summary_en`: korta beskrivningar, LLM-genererade och editerbara.
- `specs_json`: ANC, batteritid, vikt, Bluetooth-version, kodekar.
- `image_url`, `editorial_notes`.
- `created_at`, `updated_at`.

### Recensionsdata

**`review_sources`**: var recensionerna kommer ifrån.
- `id`, `product_id`, `source_type` (article, youtube, editorial).
- `publisher` (M3, RTINGS, Ljud & Bild, osv), `url` (unique), `title`, `published_at`.
- `rating_normalized` (0 till 10, nullable).
- `raw_text`: full artikel eller YouTube-transkript.

**`review_chunks`**: för RAG-sök.
- `id`, `source_id`, `product_id`.
- `chunk_text`.
- `embedding` (vector, dimension beror på provider, default 768 för Gemini).

### Affiliate och priser

**`affiliate_links`**: köp-knapp-mål.
- `id`, `product_id`, `retailer` (Webhallen, Komplett, Amazon, osv).
- `url_template`, `network` (adtraction, awin, amazon), `currency`, `region` (SE, EN).
- `price_current`, `last_checked_at`.

**`affiliate_clicks`**: intäktsspårning.
- `id`, `user_id` (nullable), `session_id` (nullable), `product_id`, `affiliate_link_id`.
- `ip_hash` (SHA-256 av IP + daglig salt, för rate-limit och fraud-kontroll utan att lagra raw IP).
- `user_agent`, `referer` (nullable).
- `clicked_at`.

**`long_tail_misses`**: frågor där vi inte hade bra data.
- `id`, `user_id` (nullable), `session_id` (nullable, gäster utan session undantas), `query_text`, `detected_product_hint` (nullable), `created_at`.

Gäster tilldelas alltid en `session_id` när de gör sin första fråga (cookie-baserad anonym session), så `session_id` är i praktiken nästan alltid satt.

### Användare och chat

**`users`**: Supabase Auth ger grundfält. Vi lägger till:
- `locale` (sv, en).
- `created_at`.

**`chat_sessions`**: en konversation.
- `id`, `user_id`, `title` (auto-genererad från första frågan), `created_at`.

**`chat_messages`**: individuella turer.
- `id`, `session_id`, `role` (user, assistant), `content_md`, `cards_json` (exakt de produktkort som visades), `created_at`.
- Observabilitets-kolumner (nullable, fylls för assistant-rader): `llm_provider`, `llm_model`, `latency_ms`, `prompt_tokens`, `completion_tokens`, `rag_chunks_used`.

### Minne

**Zep Cloud Knowledge Graph** är primärt för AI-extraherade användar-fakta (preferenser, budget, lyssningssammanhang). Exempel: "föredrar over-ear", "pendlar med tåg", "budget 1500 till 3000 SEK". Hämtas per fråga via `graph.search({query})`.

**`user_memory`** (fallback i Supabase): enkel key-value-tabell om Zep inte är tillgängligt.

## Chat-svarsformat

LLM returnerar strukturerad JSON via structured output. Frontend renderar blocks-strukturen.

```json
{
  "intro_md": "För pendling på tåg är ANC nyckeln, här är mina topp tre:",
  "blocks": [
    { "type": "product_card", "product_id": "sony-wh1000xm5", "angle": "Bästa ANC" },
    { "type": "product_card", "product_id": "bose-qc-ultra", "angle": "Mest komfort" },
    { "type": "comparison_table", "product_ids": ["...", "..."], "columns": ["ANC", "Batteri", "Pris"] },
    { "type": "video", "youtube_id": "abc123", "caption": "RTINGS test av XM5" },
    { "type": "quote", "text": "...", "source": "M3.se, feb 2026" }
  ],
  "outro_md": "Om du vill begränsa till under 3000 kr, säg till.",
  "followup_suggestions": ["Jämför XM5 mot QC Ultra", "Visa över-öron under 2000 kr"]
}
```

### Blocktyper för MVP

- `product_card`: en rekommendation med bild, "angle"-tag (t.ex. "Bästa ANC"), stjärnor, pris, "från X kr i N butiker", köp-knapp.
- `comparison_table`: 2 till 5 produkter med nyckelegenskaper. Varje rad visar produktnamn + de valda kolumnerna + en köp-knapp som länkar till produktens primära affiliate-länk (samma länkval som i `product_card` för samma locale).
- `video`: YouTube-inbäddning när transkript är vår källa.
- `quote`: citat från en testartikel för bevisning.

### Hur format väljs

Via systemprompt och exempel, inte hårda regler. LLM:en instrueras: specifik köpfråga ger 1 till 3 `product_card`, utforskning ger `comparison_table`, påståenden som backas av test ger `quote` eller `video`.

### Affiliate-injektion

Efter LLM-svar, innan det skickas till klienten: för varje `product_id` som förekommer i `product_card` eller `comparison_table` slås `affiliate_links` upp för (produkt, user-locale) och den billigaste aktiva butiken väljs som primär. Klick-URL blir `/go/[link_id]` som loggar klicket och gör 302-redirect till retailer. LLM:en rör aldrig direkta URLer.

### Long-tail-frågor

LLM:en får ett funktionsverktyg `search_reviews(query: string, top_k: int = 8)` som returnerar chunks från vektor-indexet. Detta är ett tool-call i samma anrop som genererar blocks-svaret (function calling). Om `top_k` chunks har relevans-score under tröskel, instrueras LLM:en att svara ärligt ("Jag har inte djup data där ännu, här är närmaste jag kan stå bakom...") och frågan loggas till `long_tail_misses`-tabellen som kandidat för DB-utökning.

### Streaming-kontrakt

SSE (Server-Sent Events) från `/api/chat` med tre eventtyper:
- `event: intro` / `data: {"token": "..."}` en per token-chunk.
- `event: blocks` / `data: {"blocks": [...]}` en gång, helheten.
- `event: outro` / `data: {"outro_md": "...", "followup_suggestions": [...]}` en gång.
- `event: done` avslutar strömmen.

Frontend ackumulerar intro-tokens i UI:et medan blocks renderas när de kommer.

## UI och UX

ChatGPT-liknande men med rent, produktfokuserat utseende. Inga emojis. Inga tankstreck.

### Toppnav (minimal)

- Logotyp "Betyget" i blått, ingen symbol.
- Ingen bakgrundsfärg, ingen bottenkant.
- Höger sida: "Historik" (öppnar drawer), kategori-selector ("Hörlurar"), språkväljare ("SV"), "Ny fråga" (primärknapp).

### Startvy (tom chat)

- Stor rubrik "Vad letar du efter?".
- Sub-text kort.
- Stor sökruta med placeholder.
- Chips med populära frågor ("Pendling, ANC", "Gym, svettsäkra", "Under 1000 kr").
- Sektion "Populära hörlurar nu" med 3 till 4 produktkort inkl. "Bäst i test"-badge (orange) på vinnaren.

### Konversationsvy

- Användarens meddelanden till höger, blå bakgrund.
- Assistent-svar till vänster, vit med tunn ram, full bredd.
- Produktkort i grid inom svarsbubblan.
- Testcitat i blå vänsterkantad box.
- Följdfråge-chips (blå outline) under svaret.
- Input-ruta i botten, alltid synlig.

### Produktkort (Prisjakt-inspirerat)

- Orange "Bäst i test"-badge (övre vänster) på vinnaren.
- Grå "angle"-tag ("Bästa ANC") övre höger.
- Produktbild (från extern källa).
- Varumärke (litet uppercase), modellnamn (fet).
- Stjärnor (orange) plus antal tester ("4.7, 247 tester").
- Spec-chips (ANC, batteritid, vikt).
- Pris-bar med "Från X kr" (blå) och "i N butiker" (liten), orange köp-knapp till höger.

### Detaljvy (drawer inline i chat)

Öppnas när användare klickar på ett produktkort. Innehåller: full specs, alla butiker sorterade på pris med var sin köp-knapp, testcitat från flera källor med poäng.

### Historik-drawer

Öppnas via "Historik"-knappen i toppnav. Lista med senaste chattarna, grupperat på "Idag", "Denna vecka", "Tidigare". Klick öppnar den chatten.

### Färgschema

- Primär: Prisjakt-blå (#0268c9).
- Accent/CTA: Prisjakt-orange (#f57c00).
- Bakgrund: vit.
- Gränser: ljusgrå (#e2e8f0).
- Text: mörkgrå (#2d3748) och sekundär grå (#4a5568).

## Auth

- Supabase Auth.
- Google OAuth och e-post magic link i MVP.
- Locale (sv/en) sparas på användaren.
- Gäster (ej inloggade) kan ställa frågor men får inte synkad historik. De får uppmaning att logga in efter 2 till 3 frågor för att spara historiken.

### Rate limiting

- **Gäster:** 10 frågor per IP-hash per timme till `/api/chat`. 429 vid överträdelse med retry-after header.
- **Inloggade:** 60 frågor per användare per timme.
- **Affiliate-redirect (`/go/:link_id`):** 100 klick per IP per minut, för att mota botfraud.
- Implementeras med Upstash Redis (sliding window via `@upstash/ratelimit`). Upstash valt över Supabase-tabell för låg latens och inbyggd sliding window-logik.

## Tech stack

### Frontend och backend
- Next.js 16 (app router, ESM).
- React 19.
- TypeScript.
- Tailwind v4.
- shadcn/ui för basprimitiv.
- Streaming via Server-Sent Events eller Next streaming responses.

### Data
- Supabase Postgres.
- pgvector extension.
- Supabase Auth.
- Zep Cloud (`@getzep/zep-cloud`).

### LLM (gratis-API först)

Abstraktion i `src/lib/llm/provider.ts` så provider kan bytas på env-variabel.

| Användning | Primär (gratis) | Fallback (betald) |
|------------|------------------|---------------------|
| Chat-LLM | Google Gemini 2.0 Flash (structured output, generös gratis-tier) eller Groq Llama 3.3 70B (snabb) | Claude Sonnet 4.6 |
| Lättare tasks (matchning, titelgen) | Gemini 2.0 Flash-Lite eller Groq Llama 3.1 8B | Claude Haiku 4.5 |
| Embeddings | Gemini `text-embedding-004` (768 dim) eller CF Workers AI `@cf/baai/bge-large-en-v1.5` (1024 dim) | OpenAI `text-embedding-3-small` |

Embedding-dimension fixeras vid start (768 om Gemini blir primär) och måste matcha pgvector-kolumnens deklaration.

### Scraping
- Direkt fetch först, Cloudflare Browser Rendering som fallback. Återanvänd `e-scraper-v2/src/lib/scraper/cloudflare.ts`-mönstret.
- Cheerio för HTML-parsning.
- `youtube-transcript-api` för YouTube.

### Jobb-schemaläggning
- Vercel Cron.
- `POST /api/cron/scrape-reviews`: söndag 03:00.
- `POST /api/cron/update-prices`: dagligen 04:00.
- Authenticated med `CRON_SECRET` header.

### Hosting
- Vercel.

### Affiliate
- Adtraction, Awin, Amazon Associates. API för länkgenerering där det finns, annars template-URL per retailer.

### Env-variabler (sammanfattning)

```
GEMINI_API_KEY=
GROQ_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
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
```

Notera: `ZEP_API_KEY` (vanlig SNAKE_CASE). Detta bryter från e-scraper-v2 som använder `ZEP_API_Key`. Betyget följer standard-konvention; existerande kod som portas över uppdateras vid inklistring.

## Kvalitetskontroll och admin

Enkel admin-vy för MVP:
- Produktlista med "senaste review-uppdatering", antal källor per produkt, "pris senast verifierat"-tidsstämpel.
- Redigera `editorial_notes` och `summary_sv`/`summary_en` per produkt.
- Flagga en produkt för omkörning av scrape-jobb.
- Logg över "ingen data"-träffar (frågor där LLM inte kunde svara bra) för att guida DB-utökning.

## Observability och test

### Logging och metrics

- **Strukturerad logg** via `pino` eller motsvarande, JSON-output, skickas till Vercel logs. Nivåer: debug, info, warn, error.
- **Per-query-mått i `chat_messages`**: `llm_provider`, `latency_ms`, `prompt_tokens`, `completion_tokens`, `rag_chunks_used`.
- **Fel-tracking** via Sentry (gratis-tier).
- **Kostnads-tabell `llm_usage`**: daglig aggregering per provider och modell för att se när vi närmar oss gratis-tak.

### Test-strategi

- **Enhetstester** (Vitest) för: prompt-konstruktion, affiliate-länk-uppslag, block-format-validering, scraping-parsers.
- **Integrationstester** mot riktig Supabase (test-projekt) för: migrations, RAG-sök, chat-endpoint end-to-end (med mockad LLM).
- **Prompt-regression**: en fixed suite av 20 till 30 frågor (t.ex. "bästa för pendling 3000 kr", "XM5 vs QC Ultra") körs mot aktuell LLM-provider, resultat snapshots mot referens, manuell granskning av diff vid provider-byte eller prompt-ändring.
- **Scraping-robusthet**: fixture-HTML sparad per testsajt så vi upptäcker layout-ändringar tidigt.

### Observabilitets-dashboard (Supabase SQL-vyer)

- Frågor per dag, per locale.
- Genomsnittlig latens per provider.
- Top 20 produkter i klick-lista.
- Top 20 `long_tail_misses` (kandidater för DB-utökning).

## Risker och öppna beslut

### Beslutade

- **Affiliate-ansökningar:** påbörjas omedelbart i steg 1 (parallellt med utveckling), eftersom godkännanden kan ta 2 till 4 veckor. Gäller Adtraction (primär för SE), Amazon Associates, Awin.
- **Scraping-approach:** starta endast med källor som (a) har publik API (Prisjakt), (b) har tillåtande robots.txt, eller (c) där vi kommit överens med publisher. YouTube-transkript hämtas via officiell YouTube Data API + auto-caption där det finns. Inga sajter utanför denna lista skrapas i MVP.
- **Embedding-dimension:** fixerad till 768 (Gemini `text-embedding-004`) för MVP. Re-embedding krävs vid byte, accepteras.
- **YouTube-källor:** begränsa MVP till verifierade kanaler med rena transkript (t.ex. Resolve Audio Review, RTINGS, Dave2D, svenska Tech-kanaler vi kollat). Lista hårdkodad, utökas manuellt.

### Fortfarande öppet

- **Translation-kvalitet:** LLM-översättning fungerar för RAG-chunks vid query-tid. Egen-redaktionella sammanfattningar skrivs i båda språken. Locale-fallback: om `summary_en` saknas använder vi `summary_sv` + LLM-översättning i svaret och visar en markör ("Maskinöversatt").
- **Produktmatchning:** använd mönstret från `e-scraper-v2/analyze_product_matching_v3.mjs` som utgångspunkt. Normaliseras med LLM-assisterat steg. Finjusteras när vi ser fel i praktiken.
- **Gemini gratis-tier-limits** (15 RPM för Flash vid AI Studio): acceptera för MVP, övervakas via `llm_usage`-tabell. Automatisk fallback till Groq vid 429.

### pgvector-detaljer

- Kolumn: `embedding vector(768)`.
- Index: `ivfflat` med `lists = 100` (lagom för 100 produkter * 3 källor * 20 chunks ≈ 6000 rader).
- Similaritet: cosinus (`vector_cosine_ops`).

## Implementationsordning (översiktlig, detaljeras i plan)

1. Skaffa infrastruktur: Supabase-projekt, Vercel-projekt, Gemini/Groq-nycklar, Zep-konto, Cloudflare-token, Upstash Redis, Sentry-projekt, samt påbörja affiliate-ansökningar (parallellt).
2. Datamodell och migrationer.
3. Provider-abstraktion för LLM och embeddings.
4. Scraping-pipeline med Cloudflare Browser Rendering (portera från e-scraper-v2).
5. Seed-data: 10 till 20 hörlurar manuellt, kör pipeline, fyll DB.
6. RAG-motor: semantisk sök + prompt-konstruktion + structured output.
7. API-endpoints: `/api/chat`, `/api/auth/*`, `/api/go/[link_id]`.
8. Frontend: startvy, chat-vy, historik-drawer, produktkort, detaljvy.
9. Auth-flöde med Supabase Auth.
10. Zep-integration för användar-fakta.
11. Enkel admin-vy.
12. Affiliate-klickspårning.
13. Testning med riktiga frågor, finjustering av prompt.
14. Expansion av seed-lista till ~100 hörlurar.
15. Lansering.
