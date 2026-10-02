# coffee-price

Argentine specialty-coffee price aggregator. It collects product listings from Argentine specialty coffee roasters (Café Delirante, Flat&White, Indigo Roasters, Momo Tostadores, Buna Tostadores, Fuego Tostadores), normalizes grammage and prices into a single schema, and stores them in Supabase so prices can be compared on a common `price_per_kg` basis. External cron scrapers run hourly and upsert rows; the web UI reads them back.

## Stack

- **Next.js 16** (App Router, Cache Components enabled) + TypeScript
- **Supabase Postgres** as the datastore (service-role writes from the server, public read via RLS policy)
- **Vitest** for unit tests
- **Tailwind CSS 4** + ESLint
- Deployed on **Vercel**, scraped hourly by an **external cron**

## Setup

```bash
npm i
cp .env.example .env.local   # then fill in the values
npm test
npm run build
```

## Supabase migration

Apply the schema in `supabase/migrations/0001_init.sql` with either:

```bash
# Supabase CLI (from the repo root, after `supabase link`)
supabase db push
```

```bash
# or plain psql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
```

## Environment variables

| Variable | Where to get it | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | Supabase project endpoint used by the server client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Server-only key that bypasses RLS for scraper writes |
| `CRON_SECRET` | You generate it | Shared secret the external cron must present to trigger scraping |

## Deploy

1. **Supabase**: create a free project → SQL Editor → paste `supabase/migrations/0001_init.sql` → run. Copy the Project URL and the `service_role` key (Settings → API).
2. **Vercel**: import the repo → set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (generate a random string) → deploy.
3. **First sync** (the UI stays in its empty state until this runs):

   ```bash
   curl -H "x-cron-secret: $CRON_SECRET" "https://<app>.vercel.app/api/scrape?all=1"
   ```

4. **cron-job.org** (free, Vercel's Hobby cron is daily-only): sign up → New cronjob →
   - URL: `https://<app>.vercel.app/api/scrape`
   - Method: GET · extra header: `x-cron-secret: <your CRON_SECRET>`
   - Schedule: every hour (custom `0 * * * *`)

   The endpoint scrapes only stores that are due (all refresh every 60 min except flatnwhite, every 6 h) and revalidates the cached catalog via `revalidateTag`.

## Project structure

```
supabase/migrations/0001_init.sql  products table, indexes, RLS public read
src/
  app/
    api/scrape/route.ts   cron endpoint: auth → runScrape → revalidateTag('products')
    layout.tsx, page.tsx  metadata (es-AR) + Suspense-wrapped catalog
  components/
    catalog.tsx           client: filters, sort, URL sync, grid, empty states
    product-card.tsx      price + price/kg + direct link to the store
    updated-badge.tsx     "Actualizado hace X min"
  lib/
    types.ts              Product / RawProduct / StoreId
    supabase.ts           server-only client factory (service role)
    catalog.ts            getCatalog/getCatalogMeta — 'use cache' + tag 'products'
    refresh.ts            dueStores gating per store refresh interval
    persistence.ts        toRow, syncStore (upsert-then-prune)
    run-scrape.ts         orchestration, per-store error isolation, 250s budget
    filter-catalog.ts     filter/sort/URL-serialization pure logic
    format.ts             ARS currency, relative time (es-AR)
    normalize.ts          parseGrams, parseArsPrice, pricePerKg
  scrapers/
    stores.ts             registry: 6 stores, source URLs, refresh intervals
    http.ts               fetch wrapper: browser UA, timeout, retries, delay
    woocommerce-api.ts    Café Delirante (Woo Store API)
    woocommerce-html.ts   Flat&White (product sitemap + JSON-LD; robots-safe)
    tiendanube.ts         Indigo, Momo, Buna, Fuego (listing JSON-LD + pagination)
    enrich.ts             origin/variety/category/grind/equipment heuristics
    index.ts              scrapeStore(id) dispatcher
    __fixtures__/         real payload excerpts powering the offline tests
next.config.ts            cacheComponents: true
vitest.config.ts          node environment, src/**/*.test.ts
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite once (offline fixtures only) |
| `npm run test:watch` | Run tests in watch mode |
| `LIVE=1 npx vitest run src/scrapers/__tests__/live.test.ts` | Live smoke against the 6 real stores (~2 min) |
