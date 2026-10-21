import { chromium } from "playwright";

const OUT = "C:/Users/ramir/AppData/Local/Temp/opencode";
const base = "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: "es-AR" });
const page = await ctx.newPage();
const issues = [];
page.on("console", (m) => {
  if (m.type() === "error") issues.push("console.error: " + m.text().slice(0, 300));
});
page.on("pageerror", (e) => issues.push("pageerror: " + String(e).slice(0, 300)));
page.on("requestfailed", (r) =>
  issues.push("requestfailed: " + r.url().slice(0, 200) + " " + (r.failure()?.errorText ?? "")),
);

let r = await page.goto(base + "/", { waitUntil: "load", timeout: 60000 });
console.log("ROOT:", r?.status(), "->", page.url());
await page.waitForTimeout(1500);
await page.screenshot({ path: OUT + "/root.png" });

r = await page.goto(base + "/es", { waitUntil: "load", timeout: 60000 });
console.log("ES:", r?.status(), "|", page.url(), "| title:", await page.title());
await page.waitForTimeout(3000);
const canonical = await page
  .locator('link[rel="canonical"]')
  .first()
  .getAttribute("href")
  .catch(() => null);
console.log("canonical:", canonical);
const cards = await page.locator("a.group").count();
const priceBlocks = await page.locator("a.group span.font-mono.text-3xl").count();
console.log("cards:", cards, "| con precio/kg:", priceBlocks, "| SIN precio:", cards - priceBlocks);
await page.screenshot({ path: OUT + "/es-home.png", fullPage: true });

r = await page.goto(base + "/en", { waitUntil: "load", timeout: 60000 });
console.log("EN:", r?.status(), "| title:", await page.title());
await page.waitForTimeout(2000);
await page.screenshot({ path: OUT + "/en-home.png", fullPage: false });

console.log("ISSUES(" + issues.length + "):");
for (const i of issues.slice(0, 20)) console.log(" -", i);
await browser.close();
