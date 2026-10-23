const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(then: number, now: number = Date.now()): string {
  const elapsed = now - then;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
  if (elapsed < 35 * DAY) return `${Math.floor(elapsed / (7 * DAY))}w ago`;
  if (elapsed < 365 * DAY) return `${Math.floor(elapsed / (30 * DAY))}mo ago`;
  return `${Math.floor(elapsed / (365 * DAY))}y ago`;
}
