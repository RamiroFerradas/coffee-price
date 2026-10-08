"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

export function UpdatedBadge({ updatedAt }: { updatedAt: string | null }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!updatedAt || !now) return null;

  const relative = formatRelativeTime(updatedAt, now);
  const text = relative === "recién" ? "Recién actualizado" : `Actualizado ${relative}`;

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
