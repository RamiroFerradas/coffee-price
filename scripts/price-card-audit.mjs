import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const url = "https://www.quierocafe.shop/es";
const out = "scripts/out";
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const desktop = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});
await desktop.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await desktop.screenshot({ path: `${out}/prod-top.png` });
await windowScroll(desktop, 1800);
await desktop.screenshot({ path: `${out}/prod-mid.png` });

const cards = await desktop.evaluate(() => {
  return [...document.querySelectorAll('a[target="_blank"]')].map((a) => ({
    name: a.querySelector("h3")?.textContent?.trim() ?? null,
    price: a.querySelector('[class*="font-mono"]')?.textContent?.trim() ?? null,
    text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
  }));
});
await writeFile(`${out}/prod-cards.json`, JSON.stringify(cards, null, 2));

await windowScroll(desktop, 3600);
await desktop.screenshot({ path: `${out}/prod-lower.png` });

console.log(JSON.stringify({ cards: cards.length, url }));

// helpers
async function windowScroll(page, y) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(600);
}
await browser.close();
