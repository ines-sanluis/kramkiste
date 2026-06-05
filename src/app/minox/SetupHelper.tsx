"use client";

import { useState } from "react";

/**
 * Setup helper — the only interactive piece of the manual.
 *
 * You pick three things about the shot you're about to take (how far the
 * subject is, how much light there is, what kind of photo it is) and it tells
 * you the focus / aperture / film to dial in, plus a few situational notes.
 *
 * The advice mirrors the cheat sheet and the manual sections on this page:
 *   - Focus comes straight from the subject distance.
 *   - Aperture comes from the photo type (depth-of-field intent), then gets
 *     opened up in dim light so the shutter stays hand-holdable.
 *   - Light drives the film suggestion, the backlight (2×) switch and the
 *     warnings.
 */

type Option<T extends string> = { id: T; label: string; hint: string };

type DistanceId = "close" | "person" | "group" | "street" | "landscape";
type LightId = "sun" | "cloudy" | "dim" | "backlit";
type TypeId = "portrait" | "travel" | "street" | "landscape" | "action";

const DISTANCES: Option<DistanceId>[] = [
  { id: "close", label: "Very close", hint: "≈ 1 m" },
  { id: "person", label: "A person", hint: "≈ 2 m" },
  { id: "group", label: "Small group", hint: "≈ 3 m" },
  { id: "street", label: "Down the street", hint: "≈ 5 m" },
  { id: "landscape", label: "Scenery", hint: "8 m → ∞" },
];

const LIGHTS: Option<LightId>[] = [
  { id: "sun", label: "Bright sun", hint: "☀️" },
  { id: "cloudy", label: "Cloudy / shade", hint: "⛅️" },
  { id: "dim", label: "Indoors / dim", hint: "🌙" },
  { id: "backlit", label: "Light from behind", hint: "🔆" },
];

const TYPES: Option<TypeId>[] = [
  { id: "portrait", label: "Portrait", hint: "soft background" },
  { id: "travel", label: "Everyday / travel", hint: "lots of keepers" },
  { id: "street", label: "Street", hint: "be ready" },
  { id: "landscape", label: "Landscape", hint: "all sharp" },
  { id: "action", label: "Action", hint: "freeze motion" },
];

const ISOS: Option<string>[] = [
  { id: "100", label: "ISO 100", hint: "fine grain" },
  { id: "200", label: "ISO 200", hint: "all-round" },
  { id: "400", label: "ISO 400", hint: "flexible" },
  { id: "800", label: "ISO 800", hint: "low light" },
];

const FOCUS: Record<DistanceId, string> = {
  close: "0.9–1 m",
  person: "2 m",
  group: "3 m",
  street: "5 m",
  landscape: "around the 🌳 / ∞",
};

/** Base aperture for each photo type — the depth-of-field intent. */
const BASE_APERTURE: Record<TypeId, number> = {
  portrait: 4,
  travel: 8,
  street: 8,
  landscape: 11,
  action: 2.8,
};

function fmt(aperture: number) {
  return `f/${aperture}`;
}

/** Plain-words gloss on the f-number: opening size, plus what it does to light & shutter. */
function apertureNote(aperture: number) {
  if (aperture <= 4)
    return "small number → big opening → more light floods in, faster shutter";
  if (aperture >= 11)
    return "big number → small opening → less light floods in, slower shutter";
  return "middle number → a balance of light and speed";
}

type Result = {
  focus: string;
  aperture: string;
  apertureNote: string;
  iso: string;
  backlight: boolean;
  notes: string[];
};

function recommend(
  distance: DistanceId,
  light: LightId,
  type: TypeId,
  iso: number,
): Result {
  let aperture = BASE_APERTURE[type];
  const notes: string[] = [];

  // Dim light: open up so the shutter stays fast enough to hand-hold.
  if (light === "dim") {
    aperture = Math.min(aperture, 4);
    notes.push(
      "It's a bit dark, so I opened the lens wider to let more light in. Look at the needle in the viewfinder: if it falls below 1/30, hold the camera really still — or clip on the FC 35 flash, which sets the camera to 1/125 for you.",
    );
    if (iso <= 200) {
      notes.push(
        `Your ISO ${iso} film doesn't like this little light. ISO 400 or 800 film would cope much better and help you get sharper photos.`,
      );
    }
    if (type === "landscape") {
      notes.push(
        "Want the whole view sharp? Keep f/11 and rest the camera on something solid (a wall, a railing) instead of opening the lens wide.",
      );
    }
  }

  if (light === "backlit") {
    notes.push(
      "The light is behind your subject, so their face can come out too dark. Push the backlight switch (the 2× button) to make them brighter.",
    );
  }

  if (light === "sun" && (aperture <= 4 || iso >= 400)) {
    const cause = iso >= 400 ? `fast ISO ${iso} film` : "the lens open wide";
    const fix =
      iso >= 400
        ? "Close the lens a little (a higher f-number), or use slower ISO 100–200 film."
        : "Just close the lens a little (a higher f-number).";
    notes.push(
      `It's very bright out. With ${cause}, too much light can get in and wash the photo out. ${fix}`,
    );
  }

  // Type-specific reminders.
  if (type === "action") {
    notes.push(
      "For movement, you want the camera to be quick. Keep the lens open as wide as the light lets you, and only close it a bit if the photo would come out too bright.",
    );
  }
  if (type === "street" && distance === "street") {
    notes.push(
      "Nice trick: at f/8 set to 5 m, everything from about 3 m to far away stays sharp — so you can snap fast without setting the focus each time.",
    );
  }
  if (type === "portrait") {
    notes.push(
      "Want a softer, blurrier background? Open the lens to f/2.8. Want a bit more of your subject sharp? Stay at f/4.",
    );
  }

  return {
    focus: FOCUS[distance],
    aperture: fmt(aperture),
    apertureNote: apertureNote(aperture),
    iso: `ISO ${iso}`,
    backlight: light === "backlit",
    notes,
  };
}

function Choice<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div>
      <div
        id={`helper-${title}`}
        className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500"
      >
        {title}
      </div>
      <div
        role="group"
        aria-labelledby={`helper-${title}`}
        className="flex flex-wrap gap-2"
      >
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className={`flex flex-col items-start rounded-xl px-3 py-2 text-left text-sm ring-1 transition-colors ${
                active
                  ? "bg-stone-900 text-white ring-stone-900"
                  : "bg-stone-50 text-stone-700 ring-black/5 hover:bg-stone-100"
              }`}
            >
              <span className="font-semibold">{o.label}</span>
              <span
                className={`text-xs ${active ? "text-stone-300" : "text-stone-400"}`}
              >
                {o.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-black/5 py-2 last:border-0">
      <span className="pt-0.5 text-sm text-stone-500">{label}</span>
      <span className="flex flex-col items-end text-right">
        <span className="text-base font-bold tabular-nums text-stone-900">
          {value}
        </span>
        {hint && (
          <span className="text-[.5rem] leading-snug text-stone-400">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}

export function SetupHelper() {
  const [distance, setDistance] = useState<DistanceId>("person");
  const [light, setLight] = useState<LightId>("sun");
  const [type, setType] = useState<TypeId>("travel");
  const [iso, setIso] = useState("200");

  const result = recommend(distance, light, type, Number(iso));

  return (
    <div>
      <p className="mb-4 text-sm text-stone-600">
        Pick your shot and I&apos;ll tell you what to dial in.
      </p>

      <div className="flex flex-col gap-4">
        <Choice
          title="Distance"
          options={DISTANCES}
          value={distance}
          onChange={setDistance}
        />
        <Choice
          title="Light"
          options={LIGHTS}
          value={light}
          onChange={setLight}
        />
        <Choice title="Photo" options={TYPES} value={type} onChange={setType} />
        <Choice title="Film" options={ISOS} value={iso} onChange={setIso} />
      </div>

      <div className="mt-5 rounded-xl bg-stone-50 p-4 ring-1 ring-black/5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Your setup
        </div>
        <ResultRow label="Focus" value={result.focus} />
        <ResultRow
          label="Aperture"
          value={result.aperture}
          hint={result.apertureNote}
        />
        <ResultRow label="Film" value={result.iso} />
        {result.backlight && (
          <ResultRow label="Backlight switch" value="On (2×)" />
        )}
        {result.notes.length > 0 && (
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-stone-600 marker:text-stone-400">
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
