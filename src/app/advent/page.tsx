import type { Metadata, Viewport } from "next";
import { connection } from "next/server";

import { ADVENT_START, DOORS, RETURN_DATE, type Door } from "@/lib/advent";
import { daysBetween, fakeToday, isValidIsoDate, todayInMunich } from "@/lib/munichDate";
import { AdventCalendar, type DoorView } from "./AdventCalendar";
import styles from "./advent.module.css";
import { SnowLayer } from "./SnowLayer";

export const metadata: Metadata = {
  title: "Adventskalender",
  description: "Jeden Tag ein Türchen, mit Liebe für dich gemacht.",
  // installable: "Zum Home-Bildschirm" opens it full screen, like an app
  manifest: "/advent-app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Advent", statusBarStyle: "black-translucent" },
  icons: { apple: "/advent-app/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1f3b2d",
  viewportFit: "cover",
};

const CHRISTMAS_EVE = "2026-12-24";

/**
 * Fixed, scrambled order for doors 1–24, like a real advent calendar.
 * Bonus doors (after the 24th) are added at the end, in date order,
 * numbered 25, 26, … by how many days after Dec 1 they open.
 */
const LAYOUT = [
  7, 15, 2, 21, 11, 4, 18, 1, 23, 9, 13, 6, 20, 3, 16, 24, 10, 5, 22, 14, 8, 19, 12, 17,
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Testing:
 *   Locally (npm run dev), no key needed:
 *     NEXT_PUBLIC_FAKE_TODAY=2026-12-10 npm run dev → whole app thinks it's that day
 *     /advent?heute=2026-12-10                       → just this page
 *   On the deployed site (e.g. on your phone): set ADVENT_PREVIEW_KEY, then
 *     /advent?vorschau=<key>                  → everything unlocked
 *     /advent?vorschau=<key>&heute=2026-12-10 → pretend it's that day
 *   Time of day works the same way with &uhr=16:20 (sunset), &uhr=12:00 …
 *   &reset=1 forgets the opened doors, the first-visit intro and the 24th
 *   twist in this browser, so you can watch them again.
 */
/** "HH:MM" from ?uhr= (in dev, or with the preview key); otherwise the real clock. */
function resolveClock(sp: Awaited<SearchParams>): string | null {
  const isDev = process.env.NODE_ENV !== "production";
  const key = process.env.ADVENT_PREVIEW_KEY;
  const keyOk = Boolean(key) && sp.vorschau === key;
  if (!(isDev || keyOk)) return null;
  return typeof sp.uhr === "string" && /^\d{1,2}:\d{2}$/.test(sp.uhr) ? sp.uhr : null;
}

function resolveToday(sp: Awaited<SearchParams>): { today: string; preview: boolean } {
  const today = todayInMunich();
  const isDev = process.env.NODE_ENV !== "production";
  const key = process.env.ADVENT_PREVIEW_KEY;
  const keyOk = Boolean(key) && sp.vorschau === key;

  if (isDev || keyOk) {
    if (isValidIsoDate(sp.heute)) return { today: sp.heute, preview: true };
    if (keyOk) return { today: "9999-12-31", preview: true };
  }
  return { today, preview: fakeToday() !== null };
}

/** Dev only: warn in the terminal if a day has no door (the numbers would skip). */
function warnAboutGaps() {
  if (process.env.NODE_ENV === "production") return;
  const have = new Set(DOORS.map((d) => d.date));
  const missing: string[] = [];
  const total = daysBetween(ADVENT_START, RETURN_DATE);
  for (let i = 0; i <= total; i++) {
    const d = new Date(Date.UTC(+ADVENT_START.slice(0, 4), +ADVENT_START.slice(5, 7) - 1, +ADVENT_START.slice(8, 10) + i));
    const iso = d.toISOString().slice(0, 10);
    if (!have.has(iso)) missing.push(iso);
  }
  if (missing.length) console.warn(`[advent] No door for: ${missing.join(", ")}`);
}

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** "1. Januar", "26. Dezember" */
function dayName(date: string): string {
  return `${+date.slice(8, 10)}. ${MONTHS[+date.slice(5, 7) - 1]}`;
}

export default async function AdventPage({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // render per request, so "today" is always today
  warnAboutGaps();
  const sp = await searchParams;
  const { today, preview } = resolveToday(sp);
  const clock = resolveClock(sp);
  const canTest = process.env.NODE_ENV !== "production" ||
    (Boolean(process.env.ADVENT_PREVIEW_KEY) && sp.vorschau === process.env.ADVENT_PREVIEW_KEY);
  const reset = canTest && sp.reset === "1";

  if (today < ADVENT_START) {
    const days = daysBetween(today, ADVENT_START);
    return (
      <AdventShell snow>
        <div className="flex flex-col items-center gap-3 pt-24 text-center">
          <span className="text-6xl" aria-hidden>
            🎁
          </span>
          <h1 className="text-2xl font-extrabold">Psst… noch nicht!</h1>
          <p className="text-[#d9e4d4]">
            Noch {days} {days === 1 ? "Tag" : "Tage"} bis zum ersten Türchen.
          </p>
        </div>
      </AdventShell>
    );
  }

  const toView = (door: Door): DoorView => {
    const unlocked = door.date <= today;
    return {
      date: door.date,
      // the real day of the month: …24, 25, …31, then 1, 2… in January
      label: String(+door.date.slice(8, 10)),
      // spoken name, so "1" in December and "1" in January aren't confused
      name: door.date > CHRISTMAS_EVE ? dayName(door.date) : String(+door.date.slice(8, 10)),
      bonus: door.date > CHRISTMAS_EVE,
      isToday: door.date === today,
      unlocked,
      daysLeft: unlocked ? 0 : daysBetween(today, door.date),
      // Only unlocked doors carry their content to the browser.
      content: unlocked ? door : undefined,
    };
  };

  const byDay = new Map(
    DOORS.filter((d) => d.date <= CHRISTMAS_EVE).map((d) => [+d.date.slice(8, 10), d]),
  );
  const main = LAYOUT.map((n) => byDay.get(n))
    .filter((d): d is Door => Boolean(d))
    .map(toView);

  // The bonus doors don't exist until the 24th, then join the same grid.
  const bonus =
    today >= CHRISTMAS_EVE
      ? DOORS.filter((d) => d.date > CHRISTMAS_EVE)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(toView)
      : [];
  const doors = [...main, ...bonus];

  return (
    <AdventShell>
      <AdventCalendar doors={doors} storageKey={preview ? "advent-preview" : "advent"} today={today} clock={clock} returnDate={RETURN_DATE} reset={reset} />
    </AdventShell>
  );
}

function AdventShell({ children, snow = false }: { children: React.ReactNode; snow?: boolean }) {
  return (
    <div className={`${styles.bg} min-h-screen-dvh text-[#fbf5e6]`}>
      {snow && <SnowLayer />}
      <main className="relative mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+2.5rem)]">{children}</main>
    </div>
  );
}
