import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.argv[2] ?? "https://coffee-price-sigma.vercel.app";
const out = "scripts/out";

await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.screenshot({ path: `${out}/home-top.png` });
await page.evaluate(() => window.scrollTo(0, 1800));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/home-mid.png` });

const data = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('a[target="_blank"]')];
  return cards.map((a) => ({
    name: a.querySelector("h3")?.textContent?.trim() ?? null,
    roaster: a.querySelector("span.text-xs")?.textContent?.trim() ?? null,
    chips: [...a.querySelectorAll("span.rounded-full")].map((s) =>
      s.textContent.trim(),
    ),
    text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
    href: a.getAttribute("href"),
  }));
});

await writeFile(`${out}/cards.json`, JSON.stringify(data, null, 2));

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await mobile.screenshot({ path: `${out}/home-mobile.png` });

console.log(JSON.stringify({ cards: data.length, url }));
await browser.close();
