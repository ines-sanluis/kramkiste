/**
 * Date helpers that work in Munich time (Europe/Berlin), so doors open at
 * local midnight no matter where the server runs. Italy is in the same zone.
 *
 * Dates are plain "YYYY-MM-DD" strings, which compare correctly as strings.
 * Safe to import from client components (no content in here).
 */
export const MUNICH_TZ = "Europe/Berlin";

/**
 * For local testing only: `NEXT_PUBLIC_FAKE_TODAY=2026-12-10 npm run dev`
 * makes the whole app (hub card, tab bar, calendar) behave as if it were
 * that day. Ignored in production builds.
 */
export function fakeToday(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const fake = process.env.NEXT_PUBLIC_FAKE_TODAY;
  return isValidIsoDate(fake) ? fake : null;
}

export function todayInMunich(now: Date = new Date()): string {
  const fake = fakeToday();
  if (fake) return fake;
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MUNICH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}
