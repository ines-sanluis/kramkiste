import type { ReactNode } from "react";

/**
 * Registry of all the little sites in the hub.
 *
 * To add a new site:
 *   1. Add an entry here (id, title, blurb, href, icon, accent).
 *   2. Create `src/app/<id>/page.tsx` with its own theme.
 * The home grid and the bottom tab bar are generated from this list.
 */
export type SiteEntry = {
  /** Stable id, matches the route folder under `src/app`. */
  id: string;
  /** Short name shown on the card and tab. */
  title: string;
  /** One-line description shown on the home card. */
  blurb: string;
  /** Route to the site. */
  href: string;
  /** Icon shown on the card and tab. */
  icon: ReactNode;
  /** Tailwind classes for the card's accent (background + text). */
  accent: string;
  /** If the website is external */
  external?: boolean;
  /** Hidden until this day (Munich time, "YYYY-MM-DD"). */
  unlocksOn?: string;
};

/** Whether a site should be shown on `today` ("YYYY-MM-DD", Munich time). */
export function isSiteVisible(site: Pick<SiteEntry, "unlocksOn">, today: string | null): boolean {
  if (!site.unlocksOn) return true;
  return today !== null && today >= site.unlocksOn;
}

export const SITES: SiteEntry[] = [
  {
    id: "sunset",
    title: "Sonnenuntergang",
    blurb: "Wann der nächste schöne Sonnenuntergang von deinem Balkon zu sehen ist.",
    href: "/sunset",
    icon: <span className="text-2xl">🌅</span>,
    accent: "bg-gradient-to-br from-[#f2b654] to-[#f47a4d] text-[#1d1230]",
  },
  {
    id: "minox",
    title: "Minox 35 GT",
    blurb: "Eine kleine Anleitung, wie du die Minox 35 GT benutzt.",
    href: "/minox",
    icon: <span className="text-2xl">📷</span>,
    accent: "bg-gradient-to-br from-[#a87c4f] to-[#6f4e2e] text-white",
  },
  {
    id: "bars",
    title: "100 Boazn",
    blurb: "Bars zum gemeinsamen Entdecken und Abhaken.",
    href: "https://bares-cutres.vercel.app",
    icon: <span className="text-2xl">🍸</span>,
    accent: "bg-gradient-to-br from-[#A2708A] to-[#BDA0BC] text-white",
    external: true
  },
  {
    id: "advent",
    title: "Adventskalender",
    blurb: "Jeden Tag ein Türchen, bis Weihnachten. Und vielleicht ein bisschen länger.",
    href: "/advent",
    icon: <span className="text-2xl">🎄</span>,
    accent: "bg-gradient-to-br from-[#2a4a37] to-[#173024] text-white",
    unlocksOn: "2026-12-01",
  },
];
