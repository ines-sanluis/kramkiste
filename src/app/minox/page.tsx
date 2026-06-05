import type { Metadata } from "next";
import Image from "next/image";

import { SetupHelper } from "./SetupHelper";

export const metadata: Metadata = {
  title: "Minox 35 GT – User Manual",
  description: "A small, friendly guide to using the Minox 35 GT.",
};

/**
 * Content from the manual PDF.
 *
 * Page layout:
 *   1. Cheat Sheet   — quick reference (checklist, presets, default setup)
 *   2. Example scene — the shared scene every concept refers back to
 *   3. Six concept cards (Focus, Exposure, …), data-driven from CONCEPTS
 *
 * Every section is a native <details> so it collapses without client JS.
 * Diagram images live under `public/minox/`; a missing file just leaves an
 * empty placeholder frame — the page stays intact.
 */

type Block =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "image"; src: string; alt: string; caption?: string };

type SubSection = {
  /** e.g. "Definition", "Example", "Tip" — omitted for a lead paragraph. */
  label?: string;
  blocks: Block[];
};

type Concept = {
  id: string;
  title: string;
  subsections: SubSection[];
};

const CONCEPTS: Concept[] = [
  {
    id: "focus",
    title: "Focus",
    subsections: [
      {
        label: "Definition",
        blocks: [
          {
            kind: "text",
            text: "The distance you're telling the camera to pay attention to.",
          },
        ],
      },
      {
        label: "Why it matters",
        blocks: [
          {
            kind: "text",
            text: "The camera cannot pay equal attention to every distance at the same time. You choose what is most important.",
          },
        ],
      },
      {
        label: "Example",
        blocks: [
          {
            kind: "text",
            text: "In our example, if you adjust your focus to 2 meters, 🧔🏿 will appear the sharpest.",
          },
        ],
      },
      {
        label: "In your cam",
        blocks: [
          {
            kind: "image",
            src: "/minox/focus-dial.png",
            alt: "Distance scale on the lens with a red arrow",
            caption: "Distance scale with the red arrow",
          },
          {
            kind: "text",
            text: "You can adjust your focus to any distance from 0.9 meters to ∞ by rotating the front ring and aligning the desired distance with the red arrow.",
          },
        ],
      },
    ],
  },
  {
    id: "exposure",
    title: "Exposure",
    subsections: [
      {
        label: "Definition",
        blocks: [
          {
            kind: "text",
            text: "Exposure is how bright or dark the final photo will be.",
          },
        ],
      },
      {
        label: "Why it matters",
        blocks: [
          {
            kind: "text",
            text: "A perfectly focused photo can still fail if it's too dark or too bright.",
          },
        ],
      },
      {
        label: "Example",
        blocks: [
          {
            kind: "text",
            text: "Picture 🧔🏿 standing outdoors. If too much light reaches the film, the photo comes out pale and washed-out (overexposed); if too little reaches it, the photo comes out dark and muddy (underexposed). A good exposure sits in between, bright enough to see everything clearly.",
          },
        ],
      },
      {
        label: "In your cam",
        blocks: [
          {
            kind: "text",
            text: "The Minox largely handles this for you. You choose the aperture, the camera chooses a matching shutter speed, and together they let in about the right amount of light.",
          },
        ],
      },
      {
        label: "Tip",
        blocks: [
          {
            kind: "text",
            text: "If the battery is working and the light meter is working: trust the camera.",
          },
        ],
      },
    ],
  },
  {
    id: "shutter-speed",
    title: "Shutter speed",
    subsections: [
      {
        label: "Definition",
        blocks: [
          {
            kind: "text",
            text: "Cameras don't capture a scene instantly; instead they collect light for a short period of time. Shutter speed is how long the camera gathers light.",
          },
        ],
      },
      {
        label: "Why it matters",
        blocks: [
          {
            kind: "image",
            src: "/minox/shutter-grid.png",
            alt: "Grid of a running figure from 1/500 to 1/2 second",
            caption: "The longer the time, the more motion blur (1/500 → 1/2)",
          },
          {
            kind: "text",
            text: "Moving subjects and camera shake become more visible when the shutter stays open longer.",
          },
          {
            kind: "text",
            text: "Think of rain falling into a bucket. Leave it out for 1 second and it collects a little water; for 10 seconds and it collects much more. Light works similarly: the longer the camera gathers light, the brighter the photo. The shorter the time, the darker the photo and any movement during that time can create a blur.",
          },
          {
            kind: "list",
            items: [
              "1/500 second — very quick",
              "1/60 second",
              "1 second — quite long (blurry risk)",
            ],
          },
        ],
      },
      {
        label: "Example",
        blocks: [
          {
            kind: "text",
            text: "Suppose 🧔🏿 waves his hand. The camera gathers light for a very short moment, he looks frozen. Same scene, but now the camera gathers light for longer. While it collects light he waves, the camera records the movement, and his hand appears blurry.",
          },
        ],
      },
      {
        label: "In your cam",
        blocks: [
          {
            kind: "image",
            src: "/minox/shutter-needle.png",
            alt: "Needle display in the viewfinder showing shutter speeds",
            caption:
              "The needle in the viewfinder shows the chosen shutter speed",
          },
          {
            kind: "text",
            text: "When you half-press the shutter button, the camera measures the light, then chooses a shutter speed (fast if it's bright, slow if it's dark). The needle tells you what shutter speed the camera wants to use, between 1/500 and 1/30 second.",
          },
        ],
      },
      {
        label: "Tip",
        blocks: [
          {
            kind: "text",
            text: "As a beginner: if the needle shows around 1/30 or slower, hold the camera very steady. If it shows around 1/500 or higher, you risk overexposure, select a smaller aperture so less light floods in.",
          },
        ],
      },
    ],
  },
  {
    id: "iso",
    title: "ISO (film speed)",
    subsections: [
      {
        label: "Definition",
        blocks: [
          {
            kind: "text",
            text: "ISO describes how sensitive your film is to light.",
          },
        ],
      },
      {
        label: "Why it matters",
        blocks: [
          {
            kind: "image",
            src: "/minox/iso-scale.png",
            alt: "ISO scale from 100 to 3200",
            caption: "ISO scale: higher number = more sensitive",
          },
          {
            kind: "text",
            text: "The camera needs to know what film is loaded. Different films need different amounts of light: some are like people with excellent night vision, others need bright sunshine to see clearly.",
          },
          {
            kind: "text",
            text: "Imagine two people standing in the sun. Person A burns very easily, person B hardly burns at all. The same sunlight affects them differently. Film works similarly.",
          },
        ],
      },
      {
        label: "Example",
        blocks: [
          {
            kind: "text",
            text: "Imagine the sun is bright. With ISO 100 film the camera receives plenty of light and everything works nicely. Now the sun starts setting. ISO 100 struggles because there isn't much light available; the camera may need a very slow shutter speed, which increases the chance of blur.",
          },
        ],
      },
      {
        label: "In your cam",
        blocks: [
          {
            kind: "image",
            src: "/minox/iso-ring.png",
            alt: "Film-speed dial on the Minox 35 GT showing ISO/ASA and DIN values",
            caption: "Set the film-speed dial to match your film",
          },
          {
            kind: "text",
            text: "If your film says ISO 100, ISO 200 or ISO 400, set the camera to the same number. This is usually done with the film-speed dial.",
          },
          {
            kind: "text",
            text: "You'll often see film speeds written as a pair, like 200/24°. These are just two different scales for the same sensitivitygr. Set the dial to whichever scale your film prints.",
          },
        ],
      },
      {
        label: "Tip",
        blocks: [
          {
            kind: "list",
            items: [
              "ISO 100 — not very sensitive, needs lots of light, good for sunny days.",
              "ISO 200 — a little more sensitive, more flexible.",
              "ISO 400 — much more sensitive, works in many situations. This is why ISO 400 is often recommended for beginners.",
              "ISO 800 and above — even more sensitive, useful in darker conditions.",
              "Higher-ISO films often have more visible grain — tiny specks throughout the image.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "lens-aperture",
    title: "Lens aperture",
    subsections: [
      {
        label: "Definition",
        blocks: [
          {
            kind: "text",
            text: "A small opening inside the lens that gets bigger or smaller when you take a picture.",
          },
        ],
      },
      {
        label: "Why it matters",
        blocks: [
          {
            kind: "image",
            src: "/minox/aperture-row.png",
            alt: "Row of apertures from wide (f/1.4) to narrow (f/22)",
            caption:
              "Wide → narrow: big opening on the left, small on the right",
          },
          {
            kind: "text",
            text: "It affects two things at once: how much light enters the camera, and how much of the scene looks sharp.",
          },
        ],
      },
      {
        label: "Example",
        blocks: [
          {
            kind: "text",
            text: "Suppose you focus on 🧔🏿. With a large opening like f/1.4, light floods in and the person stands out more. With a small opening like f/22, more of the scene looks sharp.",
          },
          {
            kind: "text",
            text: "Small openings also make the exposure time longer. Think of filling a bucket: a big opening fills it quickly, a small opening slowly. The same idea applies to light entering the camera.",
          },
          {
            kind: "list",
            items: [
              "f/1.4 = big opening = light enters quickly.",
              "f/16 = small opening = light enters slowly. If the camera moves during that time, the photo can be blurry.",
            ],
          },
        ],
      },
      {
        label: "In your cam",
        blocks: [
          {
            kind: "image",
            src: "/minox/aperture-ring.png",
            alt: "Aperture ring on the Minox with values 16 11 8 5.6 4 2.8",
            caption: "Aperture ring on the camera",
          },
          {
            kind: "text",
            text: "Rotate the aperture ring until the number you want lines up with the index mark. The camera will then automatically choose a shutter speed that matches your chosen aperture.",
          },
        ],
      },
      {
        label: "Tip",
        blocks: [
          {
            kind: "text",
            text: "If you're walking around on a sunny day and don't want to think too much: set the aperture ring to f/5.6 and leave everything except the distance on automatic.",
          },
          { kind: "text", text: "For your first few rolls, you could shoot:" },
          {
            kind: "list",
            items: [
              "People → f/2.8–f/4",
              "General travel and street → f/5.6–f/8",
              "Landscapes → f/11 or f/16",
            ],
          },
          {
            kind: "text",
            text: "You'll quickly develop a feel for what each setting does.",
          },
        ],
      },
    ],
  },
  {
    id: "depth-of-field",
    title: "Depth of field",
    subsections: [
      {
        label: "Definition",
        blocks: [
          {
            kind: "text",
            text: "Depth of field is how much room for error you have before things start looking blurry.",
          },
        ],
      },
      {
        label: "Why it matters",
        blocks: [
          {
            kind: "image",
            src: "/minox/dof-diagram.png",
            alt: "Sketch comparing narrow and large depth of field",
            caption: "Narrow vs. large depth of field",
          },
          {
            kind: "text",
            text: "When you're using a Minox, you estimate distances by eye. Sometimes you'll be exactly right, sometimes a little off. Depth of field determines how forgiving the camera will be.",
          },
        ],
      },
      {
        label: "Example",
        blocks: [
          { kind: "list", items: ["Focus = 5 m", "Aperture = f/8"] },
          {
            kind: "text",
            text: "The sharp zone is approximately 3 m → ∞. The tree and mountain are comfortably inside. The person at 2 m is just outside the stated range; in practice they may not look terrible, but the camera promises sharpness only from about 3 m onward.",
          },
        ],
      },
      {
        label: "In your cam",
        blocks: [
          {
            kind: "image",
            src: "/minox/dof-markings.png",
            alt: "Depth-of-field markings on the lens",
            caption: "The f/8 markings bracket the sharp zone",
          },
          { kind: "list", items: ["Focus = 5 m", "Aperture = f/8"] },
          {
            kind: "text",
            text: "The depth-of-field markings show: the left f/8 mark lines up around 3 m, the right around ∞. So roughly everything from about 3 meters to very far away should look acceptably sharp.",
          },
        ],
      },
      {
        label: "Tip",
        blocks: [
          {
            kind: "text",
            text: "You're walking through Munich. People keep appearing unexpectedly and you don't have time to carefully focus every shot. So you set Focus = 4 m, Aperture = f/8.",
          },
          {
            kind: "text",
            text: "Now you have a comfortable amount of depth of field. If someone appears at 3 m or 5 m, the photo will often still look good. This is one reason the Minox became popular for travel and street photography.",
          },
        ],
      },
    ],
  },
];

/** Fast settings from the cheat sheet. */
const PRESETS: { name: string; scene: string; rows: string[]; note: string }[] =
  [
    {
      name: "Portrait",
      scene: "📸 – 🧔🏿",
      rows: ["Focus: 2 m", "Aperture: f/2.8–f/4"],
      note: "Subject sharp, softer background.",
    },
    {
      name: "Travel",
      scene: "📸 – 🧔🏿 – 🌳",
      rows: ["Focus: estimate by eye", "Aperture: f/8"],
      note: "Lots of successful photos.",
    },
    {
      name: "Street",
      scene: "📸 – 🧔🏿 – 🌳 – ⛰",
      rows: ["Aperture: f/8", "Focus: 5 m"],
      note: "Roughly 3 m → ∞ appears sharp.",
    },
    {
      name: "Landscape",
      scene: "📸 – 🧔🏿 – 🌳 – ⛰",
      rows: [
        "Aperture: f/11 or f/16",
        "Focus: around the 🌳 or slightly beyond",
      ],
      note: "Most of the scene appears sharp.",
    },
  ];

/** "Before every photo" checklist. */
const CHECKLIST: { step: string; detail: string }[] = [
  {
    step: "What is my subject?",
    detail: "Decide what is most important to be sharp.",
  },
  {
    step: "How far away is it?",
    detail: "Estimate the distance and set the focus.",
  },
  {
    step: "What kind of photo is this?",
    detail:
      "Portrait → f/2.8–f/4 · Everyday/travel → f/8 · Landscape → f/11–f/16. Then set the aperture.",
  },
  {
    step: "Did I load the correct film?",
    detail: "ISO 400 is usually a safe all-around choice.",
  },
  {
    step: "Hold steady and press the shutter.",
    detail: "The Minox handles the shutter speed and exposure.",
  },
];

/**
 * Practical operation & situational tips, taken from the official manual
 * (butkus.org / orphancameras.com scan of the Minox 35 GT owner's manual).
 */
const PRACTICE: Concept[] = [
  {
    id: "battery",
    title: "Battery & battery check",
    subsections: [
      {
        label: "Battery check",
        blocks: [
          {
            kind: "text",
            text: "Open the front cover, wind the film on to the next frame, and make sure the backlight switch is off. Then press the small rectangular battery-check button right in (it sits between the hot shoe and the yellow shutter button).",
          },
          {
            kind: "text",
            text: "Watch the needle along the right-hand edge of the finder: it should swing up to the centre (1/125) or beyond. If it does not reach the “125” mark, the battery is exhausted. If it does not move at all, you may have inserted the battery the wrong way round.",
          },
        ],
      },
      {
        label: "Tip",
        blocks: [
          {
            kind: "text",
            text: "The check can't tell you how much life is left, so replace the battery about once a year even if it still checks OK.",
          },
          {
            kind: "text",
            text: "Apparent early failure is often just a dirty contact — take the battery out, rub both contacts with a rough cloth, and refit it. Remove the battery if you won't use the camera for a long time.",
          },
        ],
      },
    ],
  },
  {
    id: "flash",
    title: "Flash (Minox FC 35)",
    subsections: [
      {
        label: "What it is",
        blocks: [
          {
            kind: "image",
            src: "/minox/fc35.png",
            alt: "Minox FC 35 flash mounted on the camera",
            caption: "The Minox FC 35 — the flash made to match this camera",
          },
          {
            kind: "text",
            text: "The Minox FC 35 is the little flash built to match this camera. It adds light when a scene is too dark for a steady hand-held shot. It clips onto the hot shoe — the metal bracket on top of the camera. (Any flash with a hot-shoe contact fits, but the FC 35 is sized and styled for the Minox 35.)",
          },
        ],
      },
      {
        label: "Putting it on",
        blocks: [
          {
            kind: "text",
            text: "Slide the black cover plate out of the hot shoe, then push the flash's foot all the way in until it sits flush. The moment it is seated, the camera switches itself to the flash shutter speed of 1/125 second and lets the flash handle the light — so you stop watching the needle in the finder.",
          },
        ],
      },
      {
        label: "Green or red?",
        blocks: [
          {
            kind: "text",
            text: "A switch on the front of the FC 35 picks one of two automatic settings, marked green and red. In both, the flash measures its own light and shuts off the instant the picture is bright enough — you just dial the matching aperture on the lens and stay within reach.",
          },
          {
            kind: "list",
            items: [
              "Green reaches further — up to about 4.5 m (15 ft). Good for everyday film (ISO 50 or faster) at normal distances.",
              "Red uses a smaller opening, so it reaches less far — about 3.2 m (10 ft) — but gives more depth of field (more of the scene in focus). Use it up close, when you want that extra sharpness, or with slow film (ISO 25–32), which the green setting can't handle.",
            ],
          },
        ],
      },
      {
        label: "The red & green numbers",
        blocks: [
          {
            kind: "text",
            text: "Those red and green figures next to the ASA/DIN scale are aperture settings (f-numbers). On the table on the back of the flash, find your film's speed, then read across: the green column and the red column each give the f-number to set on the camera's aperture ring for that colour.",
          },
          {
            kind: "text",
            text: "Example: with ISO 100 film the green setting wants f/4 and the red setting wants f/5.6. Dial that f-number on the lens and leave it there as long as the film and the colour stay the same. (Distances in metres or feet only appear in the lower “Man” part of that table, for working the flash by hand which you can ignore for now.)",
          },
        ],
      },
      {
        label: "Good to know",
        blocks: [
          {
            kind: "list",
            items: [
              "Wait for the ready light on the back of the flash before each shot — it takes a couple of seconds to charge to full power.",
              "Don't fire straight at glass, mirrors or shiny doors, or a bright reflection will spoil the photo.",
              "To use the self-timer with flash, slide the self-timer switch to “T” before fitting the flash — the flash sits right over that switch.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tricky-light",
    title: "Tips for tricky light & action",
    subsections: [
      {
        label: "Reading the needle",
        blocks: [
          {
            kind: "image",
            src: "/minox/shutter-needle.png",
            alt: "Three viewfinder needle positions: normal, slow-speed warning and overexposure warning",
            caption:
              "Left: normal · Centre: slow-speed warning · Right: overexposure warning",
          },
          {
            kind: "text",
            text: "The needle on the right of the finder shows the shutter speed the camera will use, from 1/500 to 1/30 second. A shaded zone above 1/500 and below 1/30 warns you when you are leaving the safe range.",
          },
        ],
      },
      {
        label: "Slow-speed warning",
        blocks: [
          {
            kind: "text",
            text: "If the needle drops into the shaded area below 1/30 second, the exposure will be longer than 1/30 (perhaps 1/20, 1/5, even a few seconds) and hand-held shots risk camera shake. Switch to a larger opening (a lower f-number such as f/4 or f/2.8), which lets in more light and speeds the shutter back up. If you can't, use flash or steady the camera on a tripod.",
          },
        ],
      },
      {
        label: "Overexposure warning",
        blocks: [
          {
            kind: "text",
            text: "If the needle climbs into the shaded area above 1/500 second, even the camera's fastest speed may let in too much light. Choose a smaller opening (a higher f-number) to bring the shutter speed back into the normal range. In very bright light with fast film, a neutral-density filter — a plain dark filter that simply cuts the light — helps too.",
          },
        ],
      },
      {
        label: "The backlight switch (2×)",
        blocks: [
          {
            kind: "image",
            src: "/minox/backlight-switch.png",
            alt: "Red 2x window showing the backlight switch is on",
            caption: "The red “2×” window shows the backlight switch is on",
          },
          {
            kind: "text",
            text: "Push the backlight switch (the small button to the right of the hot shoe) fully forward and the automatic exposure time is doubled — for example 1/250 instead of 1/500. A red “2×” window reminds you it's on, and the finder shows the new, longer time.",
          },
          {
            kind: "text",
            text: "Use it for back-lit subjects (to keep shadow detail) and for views with a lot of bright sky, which would otherwise fool the meter into too short an exposure.",
          },
        ],
      },
      {
        label: "In poorer light",
        blocks: [
          {
            kind: "text",
            text: "When the needle sits around 1/30 or in the slow-speed warning, open the aperture to f/4 or f/2.8. That shortens the exposure time (less shake) but also reduces depth of field. Faster film (ISO 400 or more) buys back some speed.",
          },
        ],
      },
      {
        label: "For sports & action",
        blocks: [
          {
            kind: "text",
            text: "You want the fastest possible shutter speed. Set the largest opening (f/2.8) and check in the finder that the needle is inside the safe range. Only switch to a smaller opening (a higher f-number) if the needle climbs into the overexposure warning above 1/500 — and then only just enough to bring it back.",
          },
        ],
      },
      {
        label: "Choosing your priority",
        blocks: [
          {
            kind: "text",
            text: "Because you set the aperture, you choose the trade-off: a really fast shutter speed, maximum depth of field, or a compromise between the two. The simplest all-rounder is the f/5.6 rule — f/5.6 in good daylight usually gives a hand-holdable speed and a useful depth of field.",
          },
        ],
      },
    ],
  },
];

/** Order & titles for the table of contents. */
const TOC: { id: string; title: string }[] = [
  { id: "setup-helper", title: "Setup helper" },
  { id: "cheat-sheet", title: "Cheat Sheet" },
  { id: "example-scene", title: "Example scene" },
  ...CONCEPTS.map((c) => ({ id: c.id, title: c.title })),
  ...PRACTICE.map((c) => ({ id: c.id, title: c.title })),
];

/** The shared example scene every concept refers back to. */
const SCENE: { icon: string; label: string; dist: string }[] = [
  { icon: "📸", label: "Camera", dist: "0 m" },
  { icon: "🧔🏿", label: "Man", dist: "2 m" },
  { icon: "🌳", label: "Tree", dist: "8 m" },
  { icon: "⛰", label: "Mountain", dist: "very far" },
];

function SceneStrip() {
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {SCENE.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center gap-0.5 rounded-xl bg-stone-50 px-1 py-3 ring-1 ring-black/5"
        >
          <span className="text-2xl">{s.icon}</span>
          <span className="text-xs font-semibold text-stone-700">
            {s.label}
          </span>
          <span className="text-xs tabular-nums text-stone-400">{s.dist}</span>
        </div>
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.kind === "text") {
    return <p>{block.text}</p>;
  }
  if (block.kind === "list") {
    return (
      <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-stone-400">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <figure className="my-1">
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-stone-100 ring-1 ring-black/5">
        <Image
          src={block.src}
          alt={block.alt}
          fill
          sizes="(max-width: 768px) 100vw, 368px"
          className="object-contain"
        />
      </div>
      {block.caption && (
        <figcaption className="mt-1.5 text-center text-xs text-stone-500">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Collapsible card built on native <details> — no client JS required. */
function Section({
  id,
  title,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group scroll-mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-5 text-lg font-bold marker:hidden [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5 shrink-0 text-stone-400 transition-transform duration-200 group-open:rotate-180"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

/** Renders one data-driven card: a collapsible Section with labelled subsections. */
function ConceptSection({ concept }: { concept: Concept }) {
  return (
    <Section id={concept.id} title={concept.title}>
      <div className="flex flex-col gap-4">
        {concept.subsections.map((sub, i) => (
          <div key={i}>
            {sub.label && (
              <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-stone-500">
                {sub.label}
              </h3>
            )}
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-stone-700">
              {sub.label === "Example" && <SceneStrip />}
              {sub.blocks.map((block, j) => (
                <BlockView key={j} block={block} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export default function MinoxPage() {
  return (
    <div className="min-h-screen-dvh bg-stone-100 text-stone-900">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pb-24 pt-12">
        <header className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            User manual
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Minox 35 GT
          </h1>
          <a
            href="https://butkus.org/chinon/minox/minox_35gt/minox_35gt.htm"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-stone-700 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-500"
          >
            <span aria-hidden>📖</span>
            Read the official manual
            <span aria-hidden>↗</span>
          </a>
        </header>

        {/* Cheat Sheet — quick reference */}
        {/* Setup helper — interactive: pick the shot, get the settings */}
        <Section id="setup-helper" title="Setup helper" defaultOpen>
          <SetupHelper />
        </Section>

        <Section id="cheat-sheet" title="Cheat Sheet">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
            Before every photo
          </h3>
          <ol className="mb-6 flex flex-col gap-3 text-sm leading-relaxed text-stone-700">
            {CHECKLIST.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-bold tabular-nums text-stone-600">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-stone-900">{c.step}</span>{" "}
                  {c.detail}
                </span>
              </li>
            ))}
          </ol>

          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
            Fast settings
          </h3>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <div
                key={p.name}
                className="rounded-xl bg-stone-50 p-3 ring-1 ring-black/5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-stone-900">
                    {p.name}
                  </span>
                  <span className="text-xs text-stone-400">{p.scene}</span>
                </div>
                <ul className="mt-1.5 flex flex-col gap-0.5 text-sm text-stone-700">
                  {p.rows.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-stone-500">{p.note}</p>
              </div>
            ))}
          </div>

          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
            Default setup 😍
          </h3>
          <div className="rounded-xl bg-stone-50 p-3 text-sm leading-relaxed text-stone-700 ring-1 ring-black/5">
            <p className="mb-1">For daytime walking around:</p>
            <ul className="mb-2 flex list-disc flex-col gap-0.5 pl-5 marker:text-stone-400">
              <li>ISO 400 film</li>
              <li>Aperture: f/8</li>
              <li>Focus: 5 m</li>
            </ul>
            <p>
              Everything from about 3 m to infinity should look reasonably
              sharp. This is the closest thing the Minox has to an “autofocus
              mode.”
            </p>
          </div>
        </Section>

        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Essential concepts
        </div>
        {/* Example scene — shared reference for every concept */}
        <Section id="example-scene" title="Example scene">
          <p className="mb-4 text-sm leading-relaxed text-stone-700">
            For all the examples, imagine the same simple scene: you’re holding
            your Minox 35 GT. A bearded man stands in a field, behind him a
            tree, and far behind both a mountain.
          </p>
          <SceneStrip />
        </Section>
        {/* Concept cards */}
        {CONCEPTS.map((c) => (
          <ConceptSection key={c.id} concept={c} />
        ))}

        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Practical operation & situational tips
        </div>
        {/* Practical operation & situational tips */}
        {PRACTICE.map((c) => (
          <ConceptSection key={c.id} concept={c} />
        ))}

        <footer className="pt-2 text-center text-[10px] uppercase tracking-[0.25em] text-stone-400">
          Mit Liebe für dich gemacht
        </footer>
      </main>
    </div>
  );
}
