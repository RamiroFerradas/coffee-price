"use client";

import { useEffect, useState } from "react";
import { JUST_NOW_LABEL, formatRelativeTime } from "@/lib/format";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export function UpdatedBadge({
  updatedAt,
  locale = defaultLocale,
}: {
  updatedAt: string | null;
  locale?: Locale;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!updatedAt || !now) return null;

  const labels = getDictionary(locale).updatedBadge;
  const relative = formatRelativeTime(updatedAt, now, locale);
  const text =
    relative === JUST_NOW_LABEL[locale] ? labels.justUpdated : labels.updated(relative);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs text-muted backdrop-blur">
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
        aria-hidden="true"
      />
      {text}
    </span>
  );
}
