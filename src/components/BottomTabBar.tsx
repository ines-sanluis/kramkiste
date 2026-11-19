"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { isSiteVisible, SITES } from "@/lib/sites";
import { todayInMunich } from "@/lib/munichDate";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  unlocksOn?: string;
};

const TABS: Tab[] = [
  { href: "/", label: "Kramkiste", icon: <span className="text-xl">📦</span> },
  ...SITES.filter((s) => !s.external).map((site) => ({
    href: site.href,
    label: site.title,
    icon: site.icon,
    unlocksOn: site.unlocksOn,
  })),
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const noopSubscribe = () => () => {};

export function BottomTabBar() {
  const pathname = usePathname();
  // The layout is prerendered, so read the date on the client only
  // (null on the server: date-locked tabs stay hidden until hydration).
  const today = useSyncExternalStore(noopSubscribe, () => todayInMunich(), () => null);
  const tabs = TABS.filter((tab) => isSiteVisible(tab, today));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e3d2a8] bg-[#fdf6e6]/95 backdrop-blur">
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-[#5b4a36]"
                    : "text-[#b3a386] hover:text-[#8a7659]"
                }`}
              >
                <span
                  className={`flex h-7 items-center justify-center transition-opacity ${
                    active ? "opacity-100" : "opacity-60"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
