import type { ReactNode } from "react";
import { formatArs, formatPerKg } from "@/lib/format";
import type { Product } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  "single-origin": "Single origin",
  blend: "Blend",
  equipment: "Equipo",
};

const GRIND_LABELS: Record<string, string> = {
  "whole-bean": "En grano",
  ground: "Molido",
};

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-accent-soft/60 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
      {children}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const perKg = formatPerKg(product.price_per_kg);
  const secondary = [
    perKg,
    product.grams !== null ? `${product.grams} g` : null,
  ].filter(Boolean);

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="image-placeholder h-44 w-full" aria-hidden="true" />
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
          {product.roaster}
        </span>

        <h3 className="font-serif text-lg leading-snug text-foreground">{product.name}</h3>

        <div className="flex flex-wrap gap-1.5">
          {product.origin && <Chip>{product.origin}</Chip>}
          {product.variety && <Chip>{product.variety}</Chip>}
          {product.grind && <Chip>{GRIND_LABELS[product.grind] ?? product.grind}</Chip>}
          {product.category && (
            <Chip>{CATEGORY_LABELS[product.category] ?? product.category}</Chip>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-1 pt-2">
          <span className="text-xl font-semibold text-foreground">{formatArs(product.price)}</span>
          {secondary.length > 0 && (
            <span className="text-sm">
              {perKg && (
                <span className="font-semibold text-accent">{perKg}</span>
              )}
              {perKg && product.grams !== null && <span className="text-muted"> · </span>}
              {product.grams !== null && (
                <span className="text-muted">{product.grams} g</span>
              )}
            </span>
          )}
        </div>

        <span className="text-sm font-medium text-muted transition-colors group-hover:text-accent">
          Ver en la tienda ↗
        </span>
      </div>
    </a>
  );
}
