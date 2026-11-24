import type { Config } from "@netlify/functions";
import { handleScrapeDaily } from "../../src/lib/netlify-cron";

// Scheduled function (30s limit): only triggers the background scrape and returns.
export default async () =>
  handleScrapeDaily({
    URL: process.env.URL,
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
    CRON_SECRET: process.env.CRON_SECRET,
  });

export const config: Config = {
  schedule: "0 14 * * *",
};
