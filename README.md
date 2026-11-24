# coffee-price

Argentine specialty-coffee price aggregator. It collects product listings from 17 Argentine stores (specialty roasters plus their MercadoLibre shops), normalizes grammage and prices into a single schema, and stores them in Supabase so prices can be compared on a common `price_per_kg` basis. A daily Netlify scheduled function (plus on-demand runs) scrapes and upserts rows; the web UI reads them back.

## Stack

- **Next.js 16** (App Router, Cache Components enabled) + TypeScript
- **Supabase Postgres** as the datastore (service-role writes from the server, public read via RLS policy)
- **Vitest** for unit tests
- **Tailwind CSS 4** + ESLint
- Deployed on **Netlify**, scraped daily by a scheduled function (and on demand)

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
| `CRON_SECRET` | You generate it | Shared secret the cron (Netlify scheduled function or manual/external trigger) must present to trigger scraping |

## Deploy

1. **Supabase**: create a free project → SQL Editor → paste `supabase/migrations/0001_init.sql` → run. Copy the Project URL and the `service_role` key (Settings → API).
2. **Netlify**: connect the repo → Netlify detects Next.js and uses the Next.js Runtime automatically (`netlify.toml` pins Node 24, build command, and publish dir) → set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (generate a random string) → deploy.
3. **Domain**: add `quierocafe.shop` (and `www`) to the site, then point the DNS records at Netlify from the registrar (Hostinger). Netlify provisions TLS automatically once DNS resolves.
4. **First sync** (the UI stays in its empty state until this runs):

   ```bash
   curl -H "x-cron-secret: $CRON_SECRET" "https://www.quierocafe.shop/api/scrape?all=1"
   ```

   A full `?all=1` run has to finish inside Netlify's 60s synchronous function limit. If it does not, scrape store by store (ids come from `src/scrapers/stores.ts`):

   ```bash
   for store in cafedelirante cofijaus ruffocoffee; do
     curl -H "x-cron-secret: $CRON_SECRET" "https://www.quierocafe.shop/api/scrape?store=$store"
   done
   ```

5. **Scheduled scrape**: `netlify/functions/scrape-daily.mts` runs at 14:00 UTC and POSTs to the background function `/api/scrape-all`, which scrapes every store with one short `?store=` request each (15 min budget, so the 30s scheduled-function limit is never a problem).
6. *(Optional)* **cron-job.org** for hourly refreshes — call `/api/scrape` without `all=1` so only due stores run:
   - URL: `https://www.quierocafe.shop/api/scrape`
   - Method: GET · extra header: `x-cron-secret: <your CRON_SECRET>`
   - Schedule: every hour (custom `0 * * * *`)

   The endpoint scrapes only stores that are due (all refresh every 60 min except flatnwhite, every 6 h) and revalidates the cached catalog via `revalidateTag`. It stays well inside the 60s limit because it skips stores that are not due.

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
    stores.ts             registry: 17 stores, source URLs, refresh intervals
    http.ts               fetch wrapper: browser UA, timeout, retries, delay
    woocommerce-api.ts    Café Delirante, Cofi Jaus, Ruffo Coffee (Woo Store API)
    woocommerce-html.ts   Flat&White (product sitemap + JSON-LD; robots-safe)
    tiendanube.ts         Indigo, Momo, Buna, Fuego, Modo Barista, Kapselmaker, John & Joe, República del Café, Puerto Blest, Bruno Brown (listing JSON-LD + pagination)
    mercadolibre.ts       Café Indios Verdes, Drupa (card HTML, Googlebot UA)
    enrich.ts             origin/variety/category/grind/equipment heuristics
    index.ts              scrapeStore(id) dispatcher
    __fixtures__/         real payload excerpts powering the offline tests
next.config.ts            cacheComponents: true
netlify.toml              build command, publish dir, Node 24
netlify/functions/
  scrape-daily.mts        scheduled function (14:00 UTC) -> background trigger
  scrape-all.mts          background function: one /api/scrape?store= per store
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
| `LIVE=1 npx vitest run src/scrapers/__tests__/live.test.ts` | Live smoke against the 17 real stores (~2 min) |
