import type { Config } from "@netlify/functions";
import { handleScrapeAll } from "../../src/lib/netlify-cron";

// Background function (15 min limit): receives the scheduled hand-off and scrapes
// every store through one short `/api/scrape?store=` request per store.
export default async (request: Request) =>
  handleScrapeAll(request, {
    URL: process.env.URL,
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
    CRON_SECRET: process.env.CRON_SECRET,
  });

export const config: Config = {
  background: true,
  path: "/api/scrape-all",
};
