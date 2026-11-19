"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { Door, DoorKind } from "@/lib/advent";
import "@fontsource-variable/caveat";

import styles from "./advent.module.css";
import { DoorSheet } from "./DoorSheet";

/** three.js only loads in the browser, in its own chunk. */
const Calendar3D = dynamic(() => import("./Calendar3D"), { ssr: false });

export type DoorView = {
  date: string;
  /** Day of the month shown on the door. */
  label: string;
  /** Spoken name for screen readers, e.g. "1. Januar" for bonus doors. */
  name: string;
  /** After the 24th: gold, part of the "until I'm back" extension. */
  bonus: boolean;
  isToday: boolean;
  unlocked: boolean;
  daysLeft: number;
  /** Only present once the door is unlocked. */
  content?: Door;
};

const KIND_ICON: Record<DoorKind, string> = {
  note: "💌",
  photo: "📸",
  song: "🎵",
  voice: "🎙️",
  poem: "📜",
  recipe: "🍲",
  voucher: "🎟️",
  activity: "✨",
  letter: "❤️",
  memory: "💭",
};

const OPENED_EVENT = "advent-opened";

/** Which doors she has already opened, remembered in this browser. */
function useOpened(storageKey: string) {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(OPENED_EVENT, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(OPENED_EVENT, cb);
    };
  }, []);
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(storageKey) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  const opened = useMemo(() => new Set(raw.split(",").filter(Boolean)), [raw]);
  const markOpened = useCallback(
    (date: string) => {
      try {
        const next = new Set(opened).add(date);
        window.localStorage.setItem(storageKey, [...next].join(","));
        window.dispatchEvent(new Event(OPENED_EVENT));
      } catch {
        // storage unavailable: the door still opens, it just won't be remembered
      }
    },
    [opened, storageKey],
  );
  return { opened, markOpened };
}

export function AdventCalendar({
  doors,
  storageKey,
  today,
  clock = null,
  returnDate,
  reset = false,
}: {
  doors: DoorView[];
  storageKey: string;
  /** "YYYY-MM-DD", Munich time (or the preview date). */
  today: string;
  /** "HH:MM" to pretend it's that time of day (testing). */
  clock?: string | null;
  /** "YYYY-MM-DD": the day you're back. */
  returnDate: string;
  /** Testing: forget opened doors, the intro and the 24th twist, then reload. */
  reset?: boolean;
}) {
  const { opened, markOpened } = useOpened(storageKey);

  useEffect(() => {
    if (!reset) return;
    try {
      for (const k of [storageKey, `${storageKey}:intro`, `${storageKey}:twist`]) window.localStorage.removeItem(k);
    } catch {
      // nothing to forget
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    window.location.replace(url.toString());
  }, [reset, storageKey]);
  const [active, setActive] = useState<DoorView | null>(null);
  const [toast, setToast] = useState<{ date: string; text: string } | null>(null);
  // 3D house by default; falls back to the flat grid if WebGL isn't available.
  const [use3D, setUse3D] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  // the door whose present is opening in 3D; its card opens on onReveal
  const pendingReveal = useRef<string | null>(null);

  const onDoor = (door: DoorView) => {
    if (!door.unlocked || !door.content) {
      const d = door.daysLeft;
      setToast({
        date: door.date,
        text: d === 1 ? "Morgen! ⏳" : `Noch ${d} Tage ⏳`,
      });
      return;
    }
    if (opened.has(door.date)) {
      setActive(door);
      return;
    }
    markOpened(door.date);
    if (use3D) {
      // The 3D house plays the present show and calls onReveal when the card
      // should open. Safety net in case that never comes (e.g. WebGL hiccup).
      pendingReveal.current = door.date;
      window.setTimeout(() => onReveal(door), 7000);
    } else {
      // Flat grid: let the door swing open first.
      window.setTimeout(() => setActive(door), 550);
    }
  };

  const onReveal = (door: DoorView) => {
    if (pendingReveal.current !== door.date) return; // already shown
    pendingReveal.current = null;
    setActive(door);
  };

  const renderDoor = (door: DoorView) => {
    const isBonus = door.bonus;
    const isOpened = opened.has(door.date);
    const icon = door.content ? KIND_ICON[door.content.kind] : null;
    const shaking = toast?.date === door.date;

    // Colours for the door leaf, its panels and the number.
    let leaf: string;
    let panel: string;
    if (!door.unlocked) {
      leaf = isBonus ? "bg-[#2f4f3d] text-[#f2c14e]/45" : "bg-[#2f4f3d] text-white/40";
      panel = "bg-[#294536]";
    } else if (isBonus) {
      leaf = "bg-gradient-to-br from-[#f7d77b] to-[#d9a21f] text-[#4a3408]";
      panel = "bg-[#e7bb48]/60";
    } else {
      leaf = "bg-gradient-to-br from-[#fdf6e6] to-[#e9d6ae] text-[#8c2f2a]";
      panel = "bg-[#efe1c2]";
    }

    return (
      <li key={door.date} className="relative">
        <button
          type="button"
          onClick={() => onDoor(door)}
          aria-label={
            door.unlocked
              ? `Türchen ${door.name} öffnen`
              : `Türchen ${door.name}, noch verschlossen`
          }
          className={`${styles.frame} relative block aspect-[3/4] w-full rounded-b-md rounded-t-[22px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2c14e] active:scale-95 ${
            door.isToday && !isOpened ? styles.glow : ""
          } ${shaking ? styles.shake : ""}`}
        >
          {/* What's behind the door */}
          <span
            className={`${styles.recess} ${isBonus ? styles.recessBonus : ""} absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-b-md rounded-t-[22px]`}
          >
            {isOpened && icon && (
              <>
                <span className="text-[26px] leading-none" aria-hidden>
                  {icon}
                </span>
                <span className="text-xs font-bold text-[#f2c14e]/70">{door.label}</span>
              </>
            )}
          </span>

          {/* The door itself */}
          <span
            className={`${styles.leaf} ${isOpened ? styles.leafOpen : ""} ${leaf} absolute inset-0 flex flex-col gap-1.5 rounded-b-md rounded-t-[22px] p-2 shadow-[0_6px_14px_rgba(0,0,0,0.3)]`}
          >
            <span className={`${styles.panel} ${panel} flex flex-[1.1] items-center justify-center rounded-t-[16px]`}>
              <span className="text-[22px] font-extrabold leading-none">{door.label}</span>
            </span>
            <span className={`${styles.panel} ${panel} flex-1`} />
            {door.unlocked ? (
              <span className={`${styles.knob} absolute right-1.5 top-[58%] h-2 w-2 rounded-full`} aria-hidden />
            ) : (
              <span className="absolute right-0.5 top-[52%] text-[11px] opacity-70" aria-hidden>
                🔒
              </span>
            )}
          </span>
        </button>
        {shaking && toast && (
          <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#fbf5e6] px-2.5 py-1 text-[11px] font-bold text-[#1f3b2d] shadow">
            {toast.text}
          </span>
        )}
      </li>
    );
  };

  const openedCount = doors.filter((d) => opened.has(d.date)).length;

  return (
    <>
      <header className="pointer-events-none relative z-10 mb-7 flex flex-col gap-1 [text-shadow:0_1px_10px_rgba(0,0,0,0.35)]">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
          <span aria-hidden>🎄</span>
          Adventskalender
        </h1>
        <p className="text-sm text-[#cfdccb]">
          Jeden Tag ein Türchen. {openedCount > 0 && `${openedCount} von ${doors.length} geöffnet.`}
        </p>
      </header>

      {use3D && (
        <Calendar3D
          doors={doors}
          opened={opened}
          toast={toast}
          icons={KIND_ICON}
          onDoor={onDoor}
          onReveal={onReveal}
          onFail={() => setUse3D(false)}
          today={today}
          clock={clock}
          returnDate={returnDate}
          cardOpen={active !== null}
          storageKey={storageKey}
        />
      )}

      {/* The flat grid: shown if 3D isn't available, otherwise kept for
          screen readers and keyboard users. */}
      <ul className={use3D ? "sr-only" : "grid grid-cols-4 gap-3"}>{doors.map(renderDoor)}</ul>

      {active?.content && <DoorSheet door={active.content} label={active.label} onClose={() => setActive(null)} />}
    </>
  );
}
