export const PAGE_SIZE = 24;

export function nextVisibleCount(current: number, total: number, step: number): number {
  if (total <= 0) return 0;
  const next = current + step;
  if (next <= current) return Math.min(current, total);
  return Math.min(next, total);
}

export function remainingCount(total: number, current: number): number {
  return Math.max(total - current, 0);
}
