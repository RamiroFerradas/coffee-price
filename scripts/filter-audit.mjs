import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.argv[2] ?? "https://coffee-price-sigma.vercel.app";
const out = "scripts/out";
const settleMs = 250;
const changeTimeoutMs = 15_000;

const GRAM_PATTERN = /^(sin gramaje|\d+([.,]\d+)?\s?(kg|g))$/;
const CATEGORY_ALL_LABELS = ["Todo el café", "Todos los cafés"];
const CATEGORY_LABELS = [
  ...CATEGORY_ALL_LABELS,
  "Single origin",
  "Origen único",
  "Blend",
  "Herramientas y accesorios",
];

await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });

const results = [];
const warnings = [];
let baseline = 0;

const search = () => new URL(page.url()).search;

async function waitForChange(previous, label) {
  try {
    await page.waitForFunction(
      (prev) => window.location.search !== prev,
      previous,
      { timeout: changeTimeoutMs },
    );
  } catch {
    warnings.push(`${label}: la URL no cambio tras la interaccion`);
  }
  await page.waitForTimeout(settleMs);
}

async function countCards() {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('a[target="_blank"]')].filter(
        (card) => card.getClientRects().length > 0,
      ).length,
  );
}

async function audit(name, isActive, action, restore) {
  if (isActive) {
    results.push({ name, count: baseline });
    return;
  }

  const before = search();
  await action();
  await waitForChange(before, name);
  const count = await countCards();
  results.push({ name, count });

  const after = search();
  await restore();
  await waitForChange(after, `${name} (restaurar)`);
  const restored = await countCards();
  if (restored !== baseline) {
    warnings.push(`${name}: restauro ${restored} productos en lugar de ${baseline}`);
  }
}

const controls = await page.evaluate(
  ({ gramSource, categoryLabels }) => {
    const gramPattern = new RegExp(gramSource);
    const panel = document
      .querySelector('select[aria-label="Categor\u00eda"]')
      ?.closest(".flex-col");
    const grams = [];
    const roasters = [];
    for (const button of panel ? [...panel.querySelectorAll("button")] : []) {
      const text = button.textContent.trim();
      if (gramPattern.test(text)) grams.push(text);
      else roasters.push(text);
    }

    const optionsOf = (label) => {
      const select = document.querySelector(`select[aria-label="${label}"]`);
      if (!select) return null;
      return [...select.options].map((option) => ({
        value: option.value,
        label: option.text.trim(),
      }));
    };

    const categoryButtons = [...document.querySelectorAll("button")]
      .map((button) => button.textContent.trim())
      .filter((text) => categoryLabels.includes(text));

    return {
      grams,
      roasters,
      categoryOptions: optionsOf("Categor\u00eda"),
      grindOptions: optionsOf("Molienda"),
      categoryButtons,
    };
  },
  { gramSource: GRAM_PATTERN.source, categoryLabels: CATEGORY_LABELS },
);

if (!controls.categoryOptions || !controls.grindOptions) {
  console.error("No se encontraron los selects de categoria/molienda");
  await browser.close();
  process.exit(1);
}
if (controls.grams.length === 0 || controls.roasters.length === 0) {
  warnings.push("No se encontraron chips de gramaje o de tostador");
}

baseline = await countCards();
results.push({ name: "baseline (sin filtros)", count: baseline });

for (const label of controls.grams) {
  const chip = page.getByRole("button", { name: label, exact: true });
  await audit(
    `grams:${label}`,
    (await chip.getAttribute("aria-pressed")) === "true",
    () => chip.click(),
    () => chip.click(),
  );
}

for (const label of controls.roasters) {
  const chip = page.getByRole("button", { name: label, exact: true });
  await audit(
    `roaster:${label}`,
    (await chip.getAttribute("aria-pressed")) === "true",
    () => chip.click(),
    () => chip.click(),
  );
}

const useCategoryButtons = controls.categoryButtons.length >= 2;
if (useCategoryButtons) {
  for (const label of controls.categoryButtons) {
    const button = page.getByRole("button", { name: label, exact: true });
    const active = (await button.getAttribute("aria-pressed")) === "true";
    await audit(
      `category:${label}`,
      active,
      () => button.click(),
      () =>
        page
          .getByRole("button", {
            name: CATEGORY_ALL_LABELS.find((candidate) =>
              controls.categoryButtons.includes(candidate),
            ),
            exact: true,
          })
          .click(),
    );
  }
} else {
  const categorySelect = page.locator('select[aria-label="Categor\u00eda"]');
  for (const option of controls.categoryOptions) {
    const active = (await categorySelect.inputValue()) === option.value;
    await audit(
      `category:${option.label}`,
      active,
      () => categorySelect.selectOption(option.value),
      () => categorySelect.selectOption("all"),
    );
  }
}

const grindSelect = page.locator('select[aria-label="Molienda"]');
for (const option of controls.grindOptions) {
  if (option.value === "all") continue;
  const active = (await grindSelect.inputValue()) === option.value;
  await audit(
    `grind:${option.label}`,
    active,
    () => grindSelect.selectOption(option.value),
    () => grindSelect.selectOption("all"),
  );
}

const zeroResults = results.filter((entry) => entry.count === 0);
const ok = zeroResults.length === 0 && warnings.length === 0;

await writeFile(
  `${out}/filter-audit.json`,
  JSON.stringify({ url, baseline, results, warnings, ok }, null, 2),
);

console.log(`filter-audit: ${url}`);
for (const entry of results) {
  const flag = entry.count === 0 ? "FAIL" : "ok  ";
  console.log(`  ${flag} ${entry.count.toString().padStart(4)}  ${entry.name}`);
}
for (const warning of warnings) console.log(`  WARN ${warning}`);
console.log(`  ${ok ? "OK" : "FAILED"} (${results.length} opciones, ${zeroResults.length} sin resultados)`);

await browser.close();
process.exit(ok ? 0 : 1);
