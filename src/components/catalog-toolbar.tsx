"use client";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/types";
import { UpdatedBadge } from "./updated-badge";

interface CatalogToolbarProps {
  query: string;
  visibleCount: number;
  updatedAt: string | null;
  locale: Locale;
  open: boolean;
  onToggleOpen: () => void;
  onSearch: (value: string) => void;
  t: Dictionary["catalog"];
}

export function CatalogToolbar({
  query,
  visibleCount,
  updatedAt,
  locale,
  open,
  onToggleOpen,
  onSearch,
  t,
}: CatalogToolbarProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchAria}
          className="w-full rounded-full border border-line bg-surface px-5 py-2.5 text-sm text-foreground transition-colors duration-200 placeholder:text-muted hover:border-accent"
        />
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className={`${open ? "border-accent text-accent" : "border-line text-foreground"} shrink-0 rounded-full border bg-surface px-4 py-2.5 text-sm font-semibold transition-colors duration-200 md:hidden`}
        >
          {t.filters}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 text-sm text-muted">
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">
          <span className="font-mono tabular-nums">{visibleCount}</span>{" "}
          {visibleCount === 1 ? t.productOne : t.productMany}
        </span>
        <UpdatedBadge updatedAt={updatedAt} locale={locale} />
      </div>
    </>
  );
}
