import type { ReactNode } from "react";
import { formatPriceBlock } from "@/lib/format";
import type { Product } from "@/lib/types";
import { STORES } from "@/scrapers/stores";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-accent-soft/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80 transition-colors duration-200 group-hover:border-accent/40">
      {children}
    </span>
  );
}

function BenefitChip({
  children,
  title,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`min-w-0 max-w-full truncate rounded-full border border-accent/50 bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent transition-colors duration-200 ${className}`}
    >
      {children}
    </span>
  );
}

const NOTES_MAX = 90;
const MAX_ALTITUDE_CHIP = 20;

function notesLine(raw: string): string {
  const text = raw
    .toLowerCase()
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
  return text.length > NOTES_MAX ? `${text.slice(0, NOTES_MAX - 1).trimEnd()}…` : text;
}

export function ProductCard({
  product,
  index = 0,
  locale = defaultLocale,
}: {
  product: Product;
  index?: number;
  locale?: Locale;
}) {
  const labels = getDictionary(locale).productCard;
  const chips = [
    product.origin,
    product.variety,
    product.grind !== null ? (labels.grind[product.grind] ?? product.grind) : null,
    product.category !== null ? (labels.category[product.category] ?? product.category) : null,
    product.process,
    product.roast_level,
    product.altitude !== null && product.altitude.length <= MAX_ALTITUDE_CHIP
      ? product.altitude
      : null,
  ].filter(
    (value, index, all): value is string =>
      value !== null && all.indexOf(value) === index,
  );
  const notesText = product.tasting_notes ? notesLine(product.tasting_notes) : null;

  const store = STORES.find((entry) => entry.id === product.store);
  const shippingText =
    product.free_shipping === true
      ? (product.shipping_note ?? labels.freeShipping)
      : (product.shipping_note ?? store?.shippingPolicy ?? null);
  const installmentsText = product.installments ?? store?.installmentsPolicy ?? null;
  const benefits = [shippingText, installmentsText].filter(
    (value, index, all): value is string =>
      value !== null && all.indexOf(value) === index,
  );
  const priceBlock = formatPriceBlock(product, labels);

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
      className="group animate-card-in flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="h-44 w-full overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="image-placeholder h-full w-full" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
          {product.roaster}
        </span>

        <h3 className="font-display text-lg leading-snug text-foreground">{product.name}</h3>

        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Chip key={chip}>{chip}</Chip>
          ))}
          {product.score !== null ? (
            <BenefitChip className="font-mono tabular-nums">{product.score} pts</BenefitChip>
          ) : null}
        </div>

        {notesText !== null ? (
          <span className="text-xs text-muted">{notesText}</span>
        ) : null}

        {benefits.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {benefits.map((benefit) => (
              <BenefitChip key={benefit} title={benefit}>
                {benefit}
              </BenefitChip>
            ))}
          </div>
        ) : null}

        {priceBlock !== null ? (
          <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
            <span className="font-mono text-3xl font-semibold tabular-nums leading-none text-accent">
              {priceBlock.perKg}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted">
              {priceBlock.reference}
            </span>
          </div>
        ) : null}

        <span
          className={`inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors duration-200 group-hover:text-accent${
            priceBlock === null ? " mt-auto" : ""
          }`}
        >
          {labels.viewOnStore}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1"
          >
            ↗
          </span>
        </span>
      </div>
    </a>
  );
}
