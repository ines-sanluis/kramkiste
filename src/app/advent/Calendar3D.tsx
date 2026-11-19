"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";

import type { DoorView } from "./AdventCalendar";
import { daysBetween } from "@/lib/munichDate";

import { createElf, ELF_LINES, isToasting } from "./elf";
import {
  COUNTDOWN_FROM,
  countdownText,
  createChimneySmoke,
  createCountdownSign,
  createShootingStar,
} from "./extras";
import { createGift, createSparkles, type Gift } from "./gift";
import { createConfetti, createGiantGift } from "./intro";
import { ambienceAt, createNightSky, munichMinutes } from "./sky";
import { createSnow } from "./snow";
import { sound } from "./sound";
import {
  createFireworks,
  createVisitor,
  SPECIAL_DAYS,
  VISITOR_SPOT,
  visitorsFor,
  type Character,
} from "./visitors";

/**
 * The advent calendar as a 3D Christmas house.
 *
 *   - Front wall: doors 1–24 (in the scrambled order they arrive in).
 *   - Right side wall: the bonus doors. They only exist from the 24th on, so
 *     she has to turn the house to discover them.
 *   - Every door sits in front of a deep niche in the wall; the surprise
 *     glows at the back of it.
 *   - Behind every closed door waits a little present. When the door opens it
 *     wiggles, floats out towards her, lands, shakes, lifts its lid, light
 *     pours out and the day's icon rises out of it; then onReveal tells
 *     AdventCalendar to open the card. A tap during the show skips ahead.
 *   - An elf stands in the snow, hops when a door opens, and chats when tapped.
 *     On some days visitors drop by (see visitors.ts); on the 31st two elves
 *     toast in their best clothes; on the 1st of January there are fireworks.
 *   - The sky and light follow the time of day in Munich (see sky.ts).
 *   - The fairy lights come on one by one as doors get opened; from the 22nd
 *     a sign counts down the days until you're back.
 *   - Sounds (sound.ts), with a mute button.
 *   - Hidden surprises: tap the moon (shooting star), the chimney (smoke),
 *     or the elf three times in a row (a little dance).
 *   - The very first visit: a big present falls from the sky; she taps it,
 *     it bursts open and the house grows up out of it (intro.ts).
 *   - The 24th: once she has opened door 24, the house turns by itself and
 *     the golden bonus doors pop out of the side wall one by one.
 *   - Drag sideways to turn the house. Tap a door to open it.
 *
 * All the calendar logic (what's unlocked, what's opened, the toast, the
 * sheet) stays in AdventCalendar; this only draws and reports taps.
 */

// ── Dimensions (world units) ────────────────────────────────────────────
const DOOR_W = 0.78;
const DOOR_H = 0.98;
const DOOR_T = 0.07;
const GAP_X = 0.22;
const GAP_Y = 0.22;
const COLS = 4;
const ROWS = 6;
const SIDE_COLS = 3;
const NICHE_DEPTH = 0.62; // how far each door's niche goes into the wall
const HOLE_PAD = 0.012;

const HOUSE_W = 4.7;
const HOUSE_D = 3.6;
const WALL_H = 8.1;
const ROOF_H = 2.3;
const ROOF_OVERHANG = 0.35;
const GRID_BOTTOM = 0.55;

const OPEN_ANGLE = -1.62; // radians: swings out towards the viewer, roughly at a right angle
const YAW_FRONT: [number, number] = [-0.55, 0.55];
const YAW_WITH_SIDE: [number, number] = [-1.75, 0.55];
const START_YAW = -0.28;

const ELF_POS = new THREE.Vector3(-3.35, 0, 2.45);

// The present inside each niche, and its show (seconds after the tap).
const GIFT_SIZE = 0.4;
const GIFT_FINAL_SIZE = 0.85; // max size in front of the camera (less on narrow screens)
const GIFT_DISTANCE = 3.6; // how far in front of the camera it stops
const T = {
  wiggleEnd: 0.6, // door swings open, the present wiggles in its niche
  exitEnd: 1.05, // slides straight out of its niche, past the open door
  flyEnd: 1.75, // floats out towards her
  landEnd: 2.05, // small squash-and-settle
  shakeEnd: 2.4, // anticipation: it shakes, the lid jitters
  lidEnd: 3.2, // lid lifts off and floats aside
  glowStart: 2.5, // light pours out of the box
  iconStart: 2.65, // the icon rises out of it
  iconEnd: 3.45,
  reveal: 3.55, // the card opens
  gone: 4.0, // the present has faded away behind the card
};

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const span = (s: number, a: number, b: number) => clamp01((s - a) / (b - a));

// Screen space kept free for the page header and the bottom tab bar.
const TOP_INSET = 130;
const BOTTOM_INSET = 150;

const COLORS = {
  wall: 0x7c2a22,
  trim: 0xf3e6c8,
  roof: 0x3b2a22,
  snow: 0xf4f7fb,
  ground: 0xdfe7ee,
  niche: 0x2b1a12,
  doorEdge: 0xcdb48a,
  doorEdgeLocked: 0x23402f,
  doorEdgeBonus: 0xc9971f,
  knob: 0xe0aa2e,
};

type DoorObject = {
  view: DoorView;
  hinge: THREE.Group;
  door: THREE.Mesh;
  frontMat: THREE.MeshStandardMaterial;
  angle: number;
  shakeStart: number;
  /** Frame + door; hidden and popped in for the 24th twist. */
  pop: THREE.Group;
  popAt: number;
  gift: Gift | null;
  giftStart: number;
  giftFlight: { from: THREE.Vector3; out: THREE.Vector3; rotY: number } | null;
  giftBurst: boolean;
  giftRevealed: boolean;
  /** Set when she taps to skip: the present fades out from this moment. */
  giftSkipAt: number;
  /** Which sound cues of the present show have played. */
  giftCues: Set<string>;
  /** Shows the icon at the back of the niche (called when the card opens). */
  showIcon: () => void;
};

type Slot = { view: DoorView; cx: number; cy: number };

// ── Canvas textures ─────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeTexture(canvas: HTMLCanvasElement, anisotropy: number) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function doorFrontTexture(view: DoorView, anisotropy: number) {
  const W = 256;
  const H = 320;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  let bg: [string, string];
  let panel: string;
  let number: string;
  if (!view.unlocked) {
    bg = ["#36584a", "#2b4a39"];
    panel = "#284535";
    number = view.bonus ? "rgba(242,193,78,0.55)" : "rgba(255,255,255,0.45)";
  } else if (view.bonus) {
    bg = ["#f7d77b", "#d9a21f"];
    panel = "rgba(231,187,72,0.75)";
    number = view.isToday ? "#b02a22" : "#4a3408";
  } else {
    bg = ["#fdf6e6", "#e9d6ae"];
    panel = "#efe1c2";
    number = view.isToday ? "#c0302a" : "#8a6a48"; // today's number in red, so it stands out
  }

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, bg[0]);
  g.addColorStop(1, bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const panels: [number, number, number, number][] = [
    [22, 22, W - 44, 140],
    [22, 180, W - 44, 118],
  ];
  for (const [x, y, w, h] of panels) {
    roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = panel;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.stroke();
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 10);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();
  }

  ctx.fillStyle = number;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${view.label.length > 1 ? 104 : 118}px ${FONT}`;
  ctx.fillText(view.label, W / 2, 94);

  if (!view.unlocked) {
    ctx.font = `34px ${FONT}`;
    ctx.globalAlpha = 0.8;
    ctx.fillText("🔒", W - 52, 236);
    ctx.globalAlpha = 1;
  }

  return makeTexture(c, anisotropy);
}

/** The back of a niche: warm glow with the icon floating in it. */
function nicheBackTexture(view: DoorView, icon: string | null, anisotropy: number) {
  const W = 256;
  const H = 320;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = view.bonus ? "#3a2a0c" : "#2a170e";
  ctx.fillRect(0, 0, W, H);
  if (icon) {
    const glow = ctx.createRadialGradient(W / 2, H / 2 - 10, 10, W / 2, H / 2 - 10, 170);
    glow.addColorStop(0, view.bonus ? "rgba(255,214,110,0.95)" : "rgba(255,196,107,0.85)");
    glow.addColorStop(0.45, "rgba(255,160,70,0.35)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `120px ${FONT}`;
    ctx.fillText(icon, W / 2, H / 2 - 18);
    ctx.fillStyle = "rgba(255,236,190,0.85)";
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(view.label, W / 2, H - 46);
  }
  return makeTexture(c, anisotropy);
}

// ── Geometry helpers ────────────────────────────────────────────────────
function rectPath(cx: number, cy: number, w: number, h: number) {
  const p = new THREE.Path();
  p.moveTo(cx - w / 2, cy - h / 2);
  p.lineTo(cx - w / 2, cy + h / 2);
  p.lineTo(cx + w / 2, cy + h / 2);
  p.lineTo(cx + w / 2, cy - h / 2);
  p.closePath();
  return p;
}

/** A flat wall (width × WALL_H, bottom-centered) with a hole for every slot. */
function wallWithHoles(width: number, slots: { cx: number; cy: number }[]) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, WALL_H);
  shape.lineTo(-width / 2, WALL_H);
  shape.closePath();
  for (const s of slots) shape.holes.push(rectPath(s.cx, s.cy, DOOR_W + HOLE_PAD * 2, DOOR_H + HOLE_PAD * 2));
  return new THREE.ShapeGeometry(shape);
}

function gridSlots(views: DoorView[], cols: number): Slot[] {
  const gridW = cols * DOOR_W + (cols - 1) * GAP_X;
  const top = GRID_BOTTOM + ROWS * DOOR_H + (ROWS - 1) * GAP_Y;
  return views.map((view, i) => ({
    view,
    cx: -gridW / 2 + DOOR_W / 2 + (i % cols) * (DOOR_W + GAP_X),
    cy: top - DOOR_H / 2 - Math.floor(i / cols) * (DOOR_H + GAP_Y),
  }));
}

// ── Component ───────────────────────────────────────────────────────────
export default function Calendar3D({
  doors,
  opened,
  toast,
  icons,
  onDoor,
  onReveal,
  onFail,
  today,
  clock = null,
  returnDate,
  cardOpen = false,
  storageKey,
}: {
  doors: DoorView[];
  opened: Set<string>;
  toast: { date: string; text: string } | null;
  icons: Record<string, string>;
  onDoor: (door: DoorView) => void;
  /** The present has opened: time to show the card. */
  onReveal: (door: DoorView) => void;
  onFail: () => void;
  /** "YYYY-MM-DD" (Munich time, or the preview date): decides who visits. */
  today: string;
  /** "HH:MM" to pretend it's that time of day (testing); null = real clock. */
  clock?: string | null;
  /** "YYYY-MM-DD": the day you're back (for the countdown sign). */
  returnDate: string;
  /** Is a door's card showing? (New fairy lights wait until it's closed.) */
  cardOpen?: boolean;
  /** Where this browser remembers things (intro seen, 24th twist seen). */
  storageKey: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(opened);
  const toastStateRef = useRef(toast);
  const cardOpenRef = useRef(cardOpen);
  const onDoorRef = useRef(onDoor);
  const onRevealRef = useRef(onReveal);
  const [showSideHint, setShowSideHint] = useState(false);
  const [showDragHint, setShowDragHint] = useState(true);
  const [elfLine, setElfLine] = useState<string | null>(null);
  /** First-visit intro overlays: "tap" (tap the present) or "forYou". */
  const [introUi, setIntroUi] = useState<"tap" | "forYou" | null>(null);
  const [introRunning, setIntroRunning] = useState(false);
  const isNewYear = today === SPECIAL_DAYS.newYear;
  const isGalaDay = today === SPECIAL_DAYS.gala;
  const soundOn = useSyncExternalStore(
    (cb) => sound.subscribe(cb),
    () => sound.enabled,
    () => true,
  );

  useEffect(() => {
    openedRef.current = opened;
    onDoorRef.current = onDoor;
    onRevealRef.current = onReveal;
  }, [opened, onDoor, onReveal]);

  useEffect(() => {
    toastStateRef.current = toast;
  }, [toast]);

  useEffect(() => {
    cardOpenRef.current = cardOpen;
  }, [cardOpen]);

  useEffect(() => {
    if (!elfLine) return;
    const t = window.setTimeout(() => setElfLine(null), 2600);
    return () => window.clearTimeout(t);
  }, [elfLine]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      onFail();
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    canvas.style.display = "block";
    host.appendChild(canvas);
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    const visitorKinds = visitorsFor(today);
    const hasGroundVisitor = visitorKinds.some((v) => VISITOR_SPOT[v] === "ground");
    const hasSanta = visitorKinds.includes("santa");
    // New Year's Eve party, which goes on until 8 in the morning on the 1st;
    // after that the elf is very much the morning after
    const newYearMorning = today === SPECIAL_DAYS.newYear && munichMinutes(clock) < 8 * 60;
    const isGala = today === SPECIAL_DAYS.gala || newYearMorning;
    const hungover = today === SPECIAL_DAYS.newYear && !newYearMorning;
    const lookTarget = new THREE.Vector3(
      hasGroundVisitor ? -0.1 : isGala ? -0.75 : -0.45,
      (WALL_H + ROOF_H) / 2 - 0.2 + (hasSanta ? 0.6 : 0),
      0,
    );

    // things this browser remembers
    const readFlag = (key: string) => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return true; // no storage: don't replay the big moments every time
      }
    };
    const writeFlag = (key: string) => {
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        // fine
      }
    };
    const introKey = `${storageKey}:intro`;
    const twistKey = `${storageKey}:twist`;

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => {
      disposables.push(x);
      return x;
    };

    // ── Lights ─────────────────────────────────────────────────────────
    const hemi = new THREE.HemisphereLight(0xc9d6ff, 0x2a4a37, 1.1);
    scene.add(hemi);
    // the moon by night, the sun by day (sky.ts decides colour and angle)
    const moon = new THREE.DirectionalLight(0xdfe8ff, 1.3);
    moon.position.set(-6, 12, 9);
    scene.add(moon);
    const warm = new THREE.PointLight(0xffc46b, 1.4, 0, 0);
    warm.position.set(1.5, 4, 7);
    scene.add(warm);

    // ── Which doors go where ───────────────────────────────────────────
    const mainSlots = gridSlots(
      doors.filter((d) => !d.bonus),
      COLS,
    );
    const bonusSlots = gridSlots(
      doors.filter((d) => d.bonus),
      SIDE_COLS,
    );
    const hasSide = bonusSlots.length > 0;
    if (Math.ceil(bonusSlots.length / SIDE_COLS) > ROWS) {
      console.warn(`[advent] ${bonusSlots.length} bonus doors don't all fit on the side wall`);
    }

    // ── House ──────────────────────────────────────────────────────────
    // The core block sits a niche-depth behind the walls that have doors, so
    // the niches have room. Thin wall panels with holes form the outside.
    const house = new THREE.Group();
    scene.add(house);

    const wallMat = track(new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.85 }));
    const wallMatBack = track(
      new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.85, side: THREE.DoubleSide }),
    );
    let sideWall: THREE.Mesh | null = null;
    let plainSide: THREE.Mesh | null = null;
    const coreW = HOUSE_W - (hasSide ? NICHE_DEPTH : 0);
    const coreD = HOUSE_D - NICHE_DEPTH;
    const core = new THREE.Mesh(track(new THREE.BoxGeometry(coreW, WALL_H, coreD)), wallMat);
    core.position.set(hasSide ? -NICHE_DEPTH / 2 : 0, WALL_H / 2, -NICHE_DEPTH / 2);
    house.add(core);

    // front wall with holes
    const frontWall = new THREE.Mesh(track(wallWithHoles(HOUSE_W, mainSlots)), wallMat);
    frontWall.position.z = HOUSE_D / 2;
    house.add(frontWall);

    // close the gaps the shrunken core leaves on the outside
    const stripGeo = track(new THREE.PlaneGeometry(NICHE_DEPTH, WALL_H));
    const leftStrip = new THREE.Mesh(stripGeo, wallMatBack);
    leftStrip.position.set(-HOUSE_W / 2, WALL_H / 2, HOUSE_D / 2 - NICHE_DEPTH / 2);
    leftStrip.rotation.y = -Math.PI / 2;
    house.add(leftStrip);
    if (hasSide) {
      sideWall = new THREE.Mesh(track(wallWithHoles(HOUSE_D, bonusSlots)), wallMat);
      sideWall.position.x = HOUSE_W / 2;
      sideWall.rotation.y = Math.PI / 2;
      house.add(sideWall);
      // a plain wall (no doors yet) until the 24th twist
      plainSide = new THREE.Mesh(track(wallWithHoles(HOUSE_D, [])), wallMat);
      plainSide.position.x = HOUSE_W / 2 + 0.002;
      plainSide.rotation.y = Math.PI / 2;
      house.add(plainSide);
      const backStrip = new THREE.Mesh(stripGeo, wallMatBack);
      backStrip.position.set(HOUSE_W / 2 - NICHE_DEPTH / 2, WALL_H / 2, -HOUSE_D / 2);
      backStrip.rotation.y = Math.PI;
      house.add(backStrip);
    } else {
      const rightStrip = new THREE.Mesh(stripGeo, wallMatBack);
      rightStrip.position.set(HOUSE_W / 2, WALL_H / 2, HOUSE_D / 2 - NICHE_DEPTH / 2);
      rightStrip.rotation.y = Math.PI / 2;
      house.add(rightStrip);
    }
    // a lid over the gap between walls and core, hidden under the roof anyway
    const lid = new THREE.Mesh(track(new THREE.BoxGeometry(HOUSE_W, 0.05, HOUSE_D)), wallMat);
    lid.position.y = WALL_H - 0.025;
    house.add(lid);

    // cream trim along the bottom and the corners
    const trimMat = track(new THREE.MeshStandardMaterial({ color: COLORS.trim, roughness: 0.7 }));
    const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(HOUSE_W + 0.12, 0.35, HOUSE_D + 0.12)), trimMat);
    plinth.position.y = 0.175;
    house.add(plinth);
    const cornerGeo = track(new THREE.BoxGeometry(0.16, WALL_H, 0.16));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const corner = new THREE.Mesh(cornerGeo, trimMat);
        corner.position.set((sx * HOUSE_W) / 2, WALL_H / 2, (sz * HOUSE_D) / 2);
        house.add(corner);
      }
    }

    // gables
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-HOUSE_W / 2, 0);
    gableShape.lineTo(HOUSE_W / 2, 0);
    gableShape.lineTo(0, ROOF_H);
    gableShape.closePath();
    const gableGeo = track(new THREE.ShapeGeometry(gableShape));
    for (const sz of [1, -1]) {
      const gable = new THREE.Mesh(gableGeo, wallMat);
      gable.position.set(0, WALL_H, (sz * HOUSE_D) / 2);
      if (sz < 0) gable.rotation.y = Math.PI;
      house.add(gable);
    }

    // round attic window with a warm glow (dimmer by day)
    const atticMat = track(new THREE.MeshBasicMaterial({ color: 0xffcf7a }));
    const atticGlow = new THREE.Mesh(
      track(new THREE.CircleGeometry(0.42, 32)),
      atticMat,
    );
    atticGlow.position.set(0, WALL_H + ROOF_H * 0.36, HOUSE_D / 2 + 0.01);
    house.add(atticGlow);
    const atticFrame = new THREE.Mesh(track(new THREE.TorusGeometry(0.44, 0.06, 10, 32)), trimMat);
    atticFrame.position.copy(atticGlow.position);
    house.add(atticFrame);

    // roof slabs with snow on top
    const roofAngle = Math.atan2(ROOF_H, HOUSE_W / 2);
    const slabLen = (HOUSE_W / 2 + ROOF_OVERHANG) / Math.cos(roofAngle);
    const roofMat = track(new THREE.MeshStandardMaterial({ color: COLORS.roof, roughness: 0.9 }));
    const snowMat = track(new THREE.MeshStandardMaterial({ color: COLORS.snow, roughness: 1 }));
    const slabGeo = track(new THREE.BoxGeometry(slabLen, 0.16, HOUSE_D + 0.7));
    const snowGeo = track(new THREE.BoxGeometry(slabLen + 0.06, 0.18, HOUSE_D + 0.78));
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0, WALL_H + ROOF_H, 0);
      const slab = new THREE.Mesh(slabGeo, roofMat);
      slab.position.x = (side * slabLen) / 2;
      pivot.add(slab);
      const snowCap = new THREE.Mesh(snowGeo, snowMat);
      snowCap.position.set((side * slabLen) / 2, 0.16, 0);
      pivot.add(snowCap);
      pivot.rotation.z = side > 0 ? -roofAngle : roofAngle;
      house.add(pivot);
    }

    // chimney
    const chimney = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 1.4, 0.55)), wallMat);
    chimney.position.set(1.2, WALL_H + ROOF_H * 0.75, -0.6);
    house.add(chimney);
    const chimneySnow = new THREE.Mesh(track(new THREE.BoxGeometry(0.66, 0.14, 0.66)), snowMat);
    chimneySnow.position.set(1.2, WALL_H + ROOF_H * 0.75 + 0.75, -0.6);
    house.add(chimneySnow);

    // fairy lights: along the front roof edges and down the front corners.
    // They come on one by one as doors get opened (see litOrder below).
    const bulbGeo = track(new THREE.SphereGeometry(0.06, 10, 8));
    type Bulb = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number; base: THREE.Color; litAt: number };
    const bulbColors = [0xffcf5a, 0xff6b5a, 0xffcf5a, 0x9fe3a0];
    const makeBulb = (x: number, y: number, z: number, colorIndex: number): Bulb => {
      const base = new THREE.Color(bulbColors[colorIndex % bulbColors.length]);
      const mat = track(new THREE.MeshBasicMaterial({ color: base.clone() }));
      const mesh = new THREE.Mesh(bulbGeo, mat);
      mesh.position.set(x, y, z);
      house.add(mesh);
      return { mesh, mat, phase: Math.random() * Math.PI * 2, base, litAt: -10 };
    };
    const BULBS_PER_SIDE = 9;
    const roofBulbs: Bulb[][] = [[], []];
    [-1, 1].forEach((side, si) => {
      for (let i = 0; i <= BULBS_PER_SIDE; i++) {
        const t = i / BULBS_PER_SIDE;
        const x = side * t * (HOUSE_W / 2 + ROOF_OVERHANG * 0.8);
        const y = WALL_H + ROOF_H - Math.abs(x) * Math.tan(roofAngle) - 0.14;
        roofBulbs[si].push(makeBulb(x, y - 0.1 * Math.sin(t * Math.PI * 4) ** 2, HOUSE_D / 2 + 0.45, i + si));
      }
    });
    const CORNER_BULBS = 12;
    const cornerBulbs: Bulb[][] = [[], []];
    [-1, 1].forEach((side, si) => {
      for (let j = 0; j < CORNER_BULBS; j++) {
        const y = WALL_H - 0.3 - (j / (CORNER_BULBS - 1)) * (WALL_H - 1.0);
        const wobble = Math.sin(j * 1.7) * 0.04;
        cornerBulbs[si].push(makeBulb(side * (HOUSE_W / 2 + 0.11 + wobble), y, HOUSE_D / 2 + 0.11, j + si * 2));
      }
    });
    // apex outwards along the roof, then down the corners
    const litOrder: Bulb[] = [];
    for (let i = 0; i <= BULBS_PER_SIDE; i++) litOrder.push(roofBulbs[0][i], roofBulbs[1][i]);
    for (let j = 0; j < CORNER_BULBS; j++) litOrder.push(cornerBulbs[0][j], cornerBulbs[1][j]);
    const bulbs = litOrder;
    const unlitBulb = new THREE.Color(0x3a3632);
    const MIN_LIT = 4;
    let litCount = -1;
    let litDoors = 0;
    let houseRevealed = true; // false while the house is still inside the giant present
    // the 24th twist waits until her card for the 24th has been opened and closed
    // (or, if door 24 was already open when the page loaded, plays right away)
    let eveOpenedAtLoad = openedRef.current.has("2026-12-24");
    let eveCardSeen = false;

    // snowy ground
    const groundMat = track(new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 }));
    const ground = new THREE.Mesh(
      track(new THREE.CircleGeometry(14, 48)),
      groundMat,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    scene.add(ground);

    // ── Doors with their niches ────────────────────────────────────────
    const doorGeo = track(new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_T));
    // the niche: a box seen from the inside (its front face is culled, which
    // leaves the opening)
    const nicheGeo = track(
      new THREE.BoxGeometry(DOOR_W + HOLE_PAD * 2, DOOR_H + HOLE_PAD * 2, NICHE_DEPTH - 0.02),
    );
    const nicheMat = track(
      new THREE.MeshStandardMaterial({ color: COLORS.niche, roughness: 0.95, side: THREE.BackSide }),
    );
    const nicheBackGeo = track(new THREE.PlaneGeometry(DOOR_W, DOOR_H));
    // cream frame around each opening
    const frameShape = new THREE.Shape();
    const fw = DOOR_W / 2 + 0.07;
    const fh = DOOR_H / 2 + 0.07;
    frameShape.moveTo(-fw, -fh);
    frameShape.lineTo(fw, -fh);
    frameShape.lineTo(fw, fh);
    frameShape.lineTo(-fw, fh);
    frameShape.closePath();
    frameShape.holes.push(rectPath(0, 0, DOOR_W + HOLE_PAD * 2, DOOR_H + HOLE_PAD * 2));
    const frameGeo = track(new THREE.ExtrudeGeometry(frameShape, { depth: 0.035, bevelEnabled: false }));
    const knobGeo = track(new THREE.SphereGeometry(0.045, 12, 10));
    const knobMat = track(new THREE.MeshStandardMaterial({ color: COLORS.knob, metalness: 0.6, roughness: 0.35 }));
    const backMat = track(new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 0.8 }));

    const doorObjects: DoorObject[] = [];
    const pickables: THREE.Object3D[] = [];
    const gifts: Gift[] = [];

    const addDoor = ({ view, cx, cy }: Slot, parent: THREE.Object3D) => {
      const icon = view.content ? icons[view.content.kind] ?? "✨" : null;

      const niche = new THREE.Mesh(nicheGeo, nicheMat);
      niche.position.set(cx, cy, -(NICHE_DEPTH - 0.02) / 2);
      parent.add(niche);

      // the icon only appears once the present has been opened; until then
      // the niche stays dark (so it doesn't spoil the surprise mid-show)
      const iconMap = track(nicheBackTexture(view, icon, anisotropy));
      const hasPresent = view.unlocked && Boolean(view.content) && !openedRef.current.has(view.date);
      const emptyMap = hasPresent ? track(nicheBackTexture(view, null, anisotropy)) : iconMap;
      const nicheBackMat = track(new THREE.MeshBasicMaterial({ map: hasPresent ? emptyMap : iconMap }));
      const back = new THREE.Mesh(nicheBackGeo, nicheBackMat);
      back.position.set(cx, cy, -NICHE_DEPTH + 0.03);
      parent.add(back);
      // a tap inside an open niche opens that day's card again
      niche.userData.date = view.date;
      back.userData.date = view.date;
      pickables.push(niche, back);

      // a present waits inside every door that can be opened but hasn't been yet
      let gift: Gift | null = null;
      if (view.unlocked && view.content && !openedRef.current.has(view.date)) {
        const day = Number(view.label) || 0;
        gift = createGift(day, icon ?? "✨");
        gift.group.scale.setScalar(GIFT_SIZE);
        gift.group.position.set(cx, cy - DOOR_H / 2 + 0.03, -NICHE_DEPTH * 0.5);
        gift.group.rotation.y = ((day % 3) - 1) * 0.25;
        parent.add(gift.group);
        gifts.push(gift);
      }

      // frame + door live in one group, so they can pop in together (24th twist)
      const pop = new THREE.Group();
      pop.position.set(cx, cy, 0);
      parent.add(pop);
      const frame = new THREE.Mesh(frameGeo, trimMat);
      pop.add(frame);

      const frontMat = track(
        new THREE.MeshStandardMaterial({
          map: track(doorFrontTexture(view, anisotropy)),
          roughness: 0.65,
          emissive: new THREE.Color(0xf2c14e),
          emissiveIntensity: 0,
        }),
      );
      const edgeColor = !view.unlocked
        ? COLORS.doorEdgeLocked
        : view.bonus
          ? COLORS.doorEdgeBonus
          : COLORS.doorEdge;
      const edgeMat = track(new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.8 }));
      // box faces: +x, -x, +y, -y, +z (front), -z (back)
      const door = new THREE.Mesh(doorGeo, [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat]);
      door.position.x = DOOR_W / 2;
      door.userData.date = view.date;

      if (view.unlocked) {
        const knob = new THREE.Mesh(knobGeo, knobMat);
        knob.position.set(DOOR_W * 0.36, -0.12, DOOR_T / 2 + 0.03);
        door.add(knob);
      }

      const hinge = new THREE.Group();
      hinge.position.set(-DOOR_W / 2, 0, DOOR_T / 2 + 0.04);
      hinge.add(door);
      pop.add(hinge);

      const angle = openedRef.current.has(view.date) ? OPEN_ANGLE : 0;
      hinge.rotation.y = angle;
      doorObjects.push({
        view,
        hinge,
        door,
        frontMat,
        angle,
        shakeStart: -1,
        pop,
        popAt: -1,
        gift,
        giftStart: -1,
        giftFlight: null,
        giftBurst: false,
        giftRevealed: false,
        giftSkipAt: -1,
        giftCues: new Set(),
        showIcon: () => {
          nicheBackMat.map = iconMap;
        },
      });
      pickables.push(door);
    };

    const front = new THREE.Group();
    front.position.set(0, 0, HOUSE_D / 2);
    house.add(front);
    mainSlots.forEach((s) => addDoor(s, front));

    if (hasSide) {
      const side = new THREE.Group();
      side.position.set(HOUSE_W / 2, 0, 0);
      side.rotation.y = Math.PI / 2;
      house.add(side);
      bonusSlots.forEach((s) => addDoor(s, side));
    }

    // ── The 24th twist: the side doors only appear once door 24 is open ──
    const EVE = "2026-12-24";
    let twistState: "off" | "pending" | "running" | "done" = !hasSide ? "off" : readFlag(twistKey) ? "done" : "pending";
    let twistStart = -1;
    const bonusDoorObjects = doorObjects.filter((d) => d.view.bonus);
    if (twistState === "pending") {
      sideWall!.visible = false;
      for (const d of bonusDoorObjects) d.pop.visible = false;
    } else if (plainSide) {
      plainSide.visible = false;
    }
    // From the 26th the house starts turned towards the extra doors; on the
    // 25th it starts at the front, with a hint to turn it.
    const startTurned = twistState === "done" && today > "2026-12-25";
    const startYaw = startTurned ? -1.15 : START_YAW;
    if (twistState === "done" && today === "2026-12-25") setShowSideHint(true);
    // The face the scene is built around: the front, or the side once it starts turned
    // (the morning-after elves are placed relative to it)
    const mainFace = new THREE.Group();
    if (startTurned) {
      mainFace.position.set(HOUSE_W / 2, 0, 0);
      mainFace.rotation.y = Math.PI / 2;
    } else {
      mainFace.position.set(0, 0, HOUSE_D / 2);
    }
    house.add(mainFace);
    const faceHalf = startTurned ? HOUSE_D / 2 : HOUSE_W / 2;

    // ── Countdown sign on the front wall (from the 22nd until you're back) ─
    const countdownActive = today >= COUNTDOWN_FROM && today <= returnDate;
    const daysLeft = daysBetween(today, returnDate);
    const sign = countdownActive ? createCountdownSign(countdownText(daysLeft), 2.2, anisotropy) : null;
    if (sign) {
      // on the side wall, under where the extra doors are (or will be)
      sign.group.position.set(HOUSE_W / 2 + 0.1, 0.28, 0);
      sign.group.rotation.y = Math.PI / 2;
      house.add(sign.group);
    }

    // ── The elf, and today's visitors ──────────────────────────────────
    const elf = createElf(
      isGala ? { outfit: "tux", glass: true, mood: "party" } : hungover ? { mood: "hungover" } : {},
    );
    if (hungover) {
      // propped against the wall left of the main face (so he turns with the house)
      elf.group.position.set(-faceHalf - 0.52, 0, -0.3);
      elf.group.rotation.y = startTurned ? 0.35 : -0.2; // facing away from his sleeping friend
      mainFace.add(elf.group);
    } else {
      elf.group.position.copy(ELF_POS);
      elf.group.rotation.y = 0.45;
      scene.add(elf.group);
    }
    const characters: { c: Pick<Character, "group" | "update" | "hop" | "headTop" | "dispose">; lines: string[] }[] = [
      {
        c: elf,
        lines: hungover
          ? [
              "Mir geht's gut… 🤢",
              "Nie wieder Sekt. Nie. Wieder.",
              "Frohes neues Jahr… *hicks*",
              "Nicht so laut, bitte…",
            ]
          : newYearMorning
            ? ["¡Feliz Año Nuevo! 🥂", "Frohes neues Jahr!", "Die Party geht weiter! 💃", "Auf 2027! ✨"]
          : isGala
            ? ["Auf dich! 🥂", "Ich hab mich extra schick gemacht 🎩", "Gleich ist das Jahr vorbei… was für ein Jahr ✨"]
            : countdownActive
              ? [
                  daysLeft <= 0
                    ? "Heute kommt sie zurück! ❤️"
                    : daysLeft === 1
                      ? "Morgen ist sie wieder da! ❤️"
                      : `Noch ${daysLeft} Tage, dann ist sie wieder da! ❤️`,
                  ...ELF_LINES,
                ]
              : ELF_LINES,
      },
    ];
    let galaPartner: ReturnType<typeof createElf> | null = null;
    if (isGala) {
      // two elves in their best clothes, facing each other, glasses in hand
      elf.group.position.set(-3.75, 0, 2.3);
      elf.group.rotation.y = 0.9;
      galaPartner = createElf({ outfit: "gown", glass: true, mood: "party" });
      galaPartner.group.position.set(-2.95, 0, 2.85);
      galaPartner.group.rotation.y = -0.55;
      scene.add(galaPartner.group);
      characters.push({
        c: galaPartner,
        lines: newYearMorning
          ? ["Prost Neujahr! 🥂", "Wer will nach Hause? Ich nicht! 💃", "Noch ein Lied! 🎶"]
          : ["Prost! 🥂", "Auf ein neues Jahr voller Abenteuer ✨", "Schick, oder? 💃"],
      });
    }
    // the morning after: the other elf is fast asleep in the snow next to him
    let sleeper: ReturnType<typeof createElf> | null = null;
    const zzz: { sprite: THREE.Sprite; phase: number }[] = [];
    const sleeperHead = new THREE.Vector3();
    if (hungover) {
      sleeper = createElf({ outfit: "gown", mood: "sleeping" });
      const bed = new THREE.Group(); // lying on her back in front of the house, head towards the doors
      // in front of the main face, or (house turned) off to his other side, so
      // she isn't covering the countdown sign under the extra doors
      bed.position.set(startTurned ? -faceHalf - 1.0 : -faceHalf + 0.45, 0, startTurned ? 0.15 : 0.5);
      bed.rotation.y = startTurned ? Math.PI / 2 : -Math.PI / 2;
      sleeper.group.rotation.x = -Math.PI / 2;
      sleeper.group.position.y = 0.3;
      bed.add(sleeper.group);
      mainFace.add(bed);
      characters.push({
        c: sleeper,
        lines: ["Zzz…", "Noch fünf Minuten…", "Bin wach! Bin wach… zzz", "Mmh… Sekt… zzz"],
      });
      // little "z"s floating up from her head
      const zc = document.createElement("canvas");
      zc.width = zc.height = 64;
      const zx = zc.getContext("2d")!;
      zx.fillStyle = "#ffffff";
      zx.strokeStyle = "rgba(40,50,80,0.55)";
      zx.lineWidth = 5;
      zx.font = `800 52px ${FONT}`;
      zx.textAlign = "center";
      zx.textBaseline = "middle";
      zx.strokeText("z", 32, 34);
      zx.fillText("z", 32, 34);
      const zTex = track(new THREE.CanvasTexture(zc));
      zTex.colorSpace = THREE.SRGBColorSpace;
      for (let i = 0; i < 3; i++) {
        const sprite = new THREE.Sprite(
          track(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false })),
        );
        house.add(sprite);
        zzz.push({ sprite, phase: i / 3 });
      }
    }
    // party balloons behind the gala elves
    const balloons: { group: THREE.Group; y: number; phase: number }[] = [];
    if (isGala) {
      const knotMat = track(new THREE.MeshBasicMaterial({ color: 0xdddddd }));
      const balloonGeo = track(new THREE.SphereGeometry(0.28, 20, 16));
      const stringGeo = track(new THREE.CylinderGeometry(0.006, 0.006, 1.6, 4));
      ([
        [-4.35, 1.25, 1.75, 0xf2c14e],
        [-3.75, 1.5, 1.6, 0xc8372d],
        [-3.1, 1.3, 2.05, 0xe8e8f0],
      ] as const).forEach(([x, y, z, color], i) => {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        const ball = new THREE.Mesh(
          balloonGeo,
          track(new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.35 })),
        );
        ball.scale.set(1, 1.2, 1);
        ball.position.y = 1.05;
        group.add(ball);
        const str = new THREE.Mesh(stringGeo, knotMat);
        str.position.y = 0.2;
        group.add(str);
        scene.add(group);
        balloons.push({ group, y, phase: i * 1.9 });
      });
    }
    for (const kind of visitorKinds) {
      const v = createVisitor(kind);
      if (VISITOR_SPOT[kind] === "ground") {
        v.group.position.set(3.25, 0, 2.3);
        v.group.rotation.y = kind === "reindeer" ? 0.5 : kind === "boots" ? -0.25 : -0.45;
        // some are small in real life; give them a little more presence
        const GROUND_SCALE: Partial<Record<typeof kind, number>> = { boots: 1.9, penguin: 1.35, reindeer: 1.2 };
        v.group.scale.setScalar(GROUND_SCALE[kind] ?? 1);
        scene.add(v.group);
      } else {
        // on the roof ridge, so it turns with the house
        const ridgeY = WALL_H + ROOF_H + 0.17;
        if (kind === "santa") {
          v.group.position.set(-0.3, ridgeY - 0.05, 0.25);
          v.group.scale.setScalar(0.9);
        } else {
          v.group.position.set(0, ridgeY, HOUSE_D / 2 - 0.35);
          v.group.scale.setScalar(2.3);
        }
        house.add(v.group);
      }
      characters.push({ c: v, lines: v.lines });
    }
    // the elf starts with the countdown line when there is one
    const lineIndex = characters.map((_, i) => (i === 0 && countdownActive ? -1 : Math.floor(Math.random() * 3)));
    const charBaseScale = characters.map((ch) => ch.c.group.scale.x);
    const tapTimes = characters.map(() => [] as number[]);
    let bubbleAnchor: (out: THREE.Vector3) => THREE.Vector3 = (out) => characters[0].c.headTop(out);
    const fireworks = isNewYear ? createFireworks(pixelRatio, () => sound.play("boom")) : null;
    if (fireworks) scene.add(fireworks.points);

    // ── Snow ───────────────────────────────────────────────────────────
    const snow = createSnow({
      count: window.innerWidth < 640 ? 500 : 850,
      box: { x: [-14, 14], y: [-1, 17], z: [-14, 12] },
      pixelRatio,
      sizeScale: 34,
    });
    scene.add(snow.points);
    const nightSky = createNightSky(pixelRatio);
    scene.add(nightSky.group);
    const shootingStar = createShootingStar();
    scene.add(shootingStar.mesh);
    const smoke = createChimneySmoke();
    smoke.group.position.set(1.2, WALL_H + ROOF_H * 0.75 + 0.85, -0.6);
    house.add(smoke.group);
    const chimneyParts: THREE.Object3D[] = [chimney, chimneySnow];
    let glowAmount = 1;
    const windowLit = new THREE.Color(0xffcf7a);
    const windowDay = new THREE.Color(0xc9b48c);
    /** Sky, sun/moon, ground and the house's own lights for this time of day. */
    const applyAmbience = () => {
      const a = ambienceAt(munichMinutes(clock));
      hemi.color.copy(a.hemiSky);
      hemi.intensity = a.hemiIntensity;
      moon.color.copy(a.sunColor);
      moon.intensity = a.sunIntensity;
      moon.position.copy(a.sunPosition);
      warm.intensity = a.warmIntensity;
      groundMat.color.copy(a.ground);
      glowAmount = a.glow;
      nightSky.set(a.stars, a.moon);
      if (skyRef.current) {
        skyRef.current.style.background = `linear-gradient(to bottom, #${a.skyTop.getHexString()} 0%, #${a.skyBottom.getHexString()} 62%)`;
      }
    };
    applyAmbience();
    let lastAmbience = performance.now();

    const sparkles = createSparkles();
    const confetti = createConfetti();
    scene.add(confetti.mesh);
    // New Year's Eve: a little shower of confetti over the elves at every toast
    const galaConfetti = isGala ? createConfetti(120) : null;
    if (galaConfetti) scene.add(galaConfetti.mesh);

    // ── First visit: the house arrives inside a giant present ──────────
    let introState: "off" | "falling" | "waiting" | "opening" | "done" =
      !reducedMotion && !readFlag(introKey) ? "falling" : "off";
    const giant = introState !== "off" ? createGiantGift(3, 2.7, 3) : null;
    let houseGrowAt = -1; // when the house starts growing out of the present
    let introOpenAt = -1;
    let charsPopAt = introState === "off" ? -10 : Infinity;
    const introCues = new Set<string>();
    const introCue = (name: string, s: number, at: number, fn: () => void) => {
      if (s >= at && !introCues.has(name)) {
        introCues.add(name);
        fn();
      }
    };
    const mountS = performance.now() / 1000; // the intro runs on the real clock
    if (giant) {
      houseRevealed = false; // lights stay off inside the closed present
      house.visible = false; // it grows out of the present when it bursts
      house.scale.setScalar(0.001);
      giant.group.rotation.y = START_YAW;
      giant.group.position.y = 30;
      scene.add(giant.group);
      setIntroRunning(true);
    }
    scene.add(sparkles.points);
    // one warm light that glows out of whichever present is opening (added
    // up front, so turning it on doesn't make three.js recompile shaders)
    const giftLight = new THREE.PointLight(0xffc46b, 0, 3, 1.2);
    scene.add(giftLight);

    // ── Fit the scene into the free part of the screen ─────────────────
    let fitDist = 30;
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      const avail = Math.max(h - TOP_INSET - BOTTOM_INSET, h * 0.5);
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const fitH = WALL_H + ROOF_H + 0.9 + (hasSanta ? 1.2 : 0);
      const fitW = HOUSE_W + (hasGroundVisitor ? 3.9 : isGala ? 3.3 : 2.6); // room for elves and visitors
      const distH = (fitH * h) / (avail * 2 * tanHalf);
      const distW = (fitW * h) / (w * 0.96 * 2 * tanHalf);
      fitDist = Math.max(distH, distW);
      camera.aspect = w / h;
      placeCamera();
      camera.setViewOffset(w, h, 0, -(TOP_INSET - BOTTOM_INSET) / 2, w, h);
      camera.updateProjectionMatrix();
    };
    function placeCamera() {
      const d = fitDist;
      camera.position.set(lookTarget.x, lookTarget.y + d * 0.12, d);
      camera.lookAt(lookTarget);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // ── Interaction ────────────────────────────────────────────────────
    let yaw = startYaw;
    let targetYaw = startYaw;
    let velocity = 0;
    let drag: { x: number; yaw: number; moved: boolean; lastX: number; lastT: number } | null = null;
    let sideSeen = false;
    let dragLocked = false;
    let time = 0;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const yawLimits = (): [number, number] =>
      hasSide && twistState === "done"
        ? YAW_WITH_SIDE
        : sign
          ? [-1.0, YAW_FRONT[1]] // enough to read the sign on the side
          : YAW_FRONT;

    const setRay = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };
    const pickDoor = (clientX: number, clientY: number): DoorObject | null => {
      setRay(clientX, clientY);
      const hit = raycaster.intersectObjects(pickables, true)[0];
      if (!hit) return null;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.date) o = o.parent;
      const found = doorObjects.find((d) => d.view.date === o?.userData.date) ?? null;
      return found && found.pop.visible ? found : null;
    };
    /** Index of the character under the pointer, or -1. */
    const pickCharacter = (clientX: number, clientY: number) => {
      setRay(clientX, clientY);
      let best = -1;
      let bestDist = Infinity;
      characters.forEach((ch, i) => {
        const hit = raycaster.intersectObject(ch.c.group, true)[0];
        if (hit && hit.distance < bestDist) {
          best = i;
          bestDist = hit.distance;
        }
      });
      return best;
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      sound.unlock(); // browsers only allow sound after a tap
      if (
        (introState !== "off" && introState !== "done") ||
        twistState === "running" ||
        doorObjects.some((d) => d.giftStart >= 0 && !d.giftRevealed)
      ) {
        // a present is opening: no turning now (a tap still skips, in onUp)
        drag = { x: e.clientX, yaw: targetYaw, moved: false, lastX: e.clientX, lastT: performance.now() };
        dragLocked = true;
        return;
      }
      dragLocked = false;
      drag = { x: e.clientX, yaw: targetYaw, moved: false, lastX: e.clientX, lastT: performance.now() };
      velocity = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (drag) {
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 6 && !dragLocked) {
          drag.moved = true;
          setShowDragHint(false);
        }
        if (drag.moved) {
          const [lo, hi] = yawLimits();
          targetYaw = THREE.MathUtils.clamp(drag.yaw + dx * 0.0085, lo - 0.08, hi + 0.08);
          const now = performance.now();
          velocity = ((e.clientX - drag.lastX) * 0.0085) / Math.max((now - drag.lastT) / 1000, 0.001);
          drag.lastX = e.clientX;
          drag.lastT = now;
        }
      } else if (e.pointerType === "mouse") {
        canvas.style.cursor =
          pickDoor(e.clientX, e.clientY) ||
          pickCharacter(e.clientX, e.clientY) >= 0 ||
          raycaster.intersectObjects(chimneyParts, false).length > 0
            ? "pointer"
            : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      const wasDrag = drag.moved;
      drag = null;
      if (wasDrag) {
        const [lo, hi] = yawLimits();
        targetYaw = THREE.MathUtils.clamp(targetYaw + THREE.MathUtils.clamp(velocity, -4, 4) * 0.12, lo, hi);
        return;
      }
      // first visit: a tap on the waiting giant present opens it
      if (introState === "waiting") {
        introState = "opening";
        introOpenAt = performance.now() / 1000 - mountS;
        setIntroUi(null);
        return;
      }
      if ((introState !== "off" && introState !== "done") || twistState === "running") return;
      // a tap while a present is opening skips straight to the card
      const showing = doorObjects.find((d) => d.giftStart >= 0 && !d.giftRevealed);
      if (showing) {
        showing.giftSkipAt = performance.now() / 1000;
        showing.giftRevealed = true;
        showing.showIcon();
        onRevealRef.current(showing.view);
        return;
      }
      const who = pickCharacter(e.clientX, e.clientY);
      if (who >= 0) {
        const ch = characters[who];
        // three quick taps on an elf: a little dance (hidden surprise)
        const taps = tapTimes[who].filter((x) => time - x < 1.4);
        taps.push(time);
        tapTimes[who] = taps;
        const dancer = ch.c as { dance?: (t: number) => void };
        bubbleAnchor = (out) => ch.c.headTop(out);
        if (taps.length >= 3 && dancer.dance) {
          tapTimes[who] = [];
          dancer.dance(time);
          sound.play("jingle");
          setElfLine("🎶 Tanzpause! 🎶");
          return;
        }
        ch.c.hop(time);
        sound.play("boop");
        lineIndex[who] = (lineIndex[who] + 1) % ch.lines.length;
        setElfLine(ch.lines[lineIndex[who]]);
        return;
      }
      // the moon: a shooting star (hidden surprise)
      if (nightSky.moonVisible()) {
        setRay(e.clientX, e.clientY);
        if (raycaster.intersectObject(nightSky.moon).length > 0) {
          const m = nightSky.moon.position;
          shootingStar.trigger(
            new THREE.Vector3(m.x - 26, m.y + 4, m.z),
            new THREE.Vector3(m.x - 6, m.y - 9, m.z),
            time,
          );
          sound.play("star");
          bubbleAnchor = (out) => out.copy(nightSky.moon.position).add(new THREE.Vector3(-3, -3.5, 0));
          setElfLine("Wünsch dir was ✨");
          return;
        }
      }
      // the chimney: puffs of smoke (hidden surprise)
      setRay(e.clientX, e.clientY);
      if (raycaster.intersectObjects(chimneyParts, false).length > 0) {
        smoke.puff(time);
        sound.play("puff");
        return;
      }
      const hit = pickDoor(e.clientX, e.clientY);
      if (hit) {
        const v = hit.view;
        if (!v.unlocked || !v.content) sound.play("knock");
        else if (!openedRef.current.has(v.date)) sound.play("creak");
        else sound.play("boop");
        onDoorRef.current(v);
      }
    };
    const onCancel = () => {
      drag = null;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);

    // ── Loop ───────────────────────────────────────────────────────────
    let last = performance.now();
    let raf = 0;
    const tmp = new THREE.Vector3();
    const worldPoint = new THREE.Vector3();
    let lastToastDate: string | null = null;
    let lastOpenedCount = openedRef.current.size;
    let wasToasting = false;

    /** Pin an HTML label to a 3D point. `anchor` = "center" or "left" of the label. */
    const place = (el: HTMLElement | null, world: THREE.Vector3 | null, anchor: "center" | "left" = "center") => {
      if (!el) return;
      if (!world) {
        el.style.opacity = "0";
        return;
      }
      tmp.copy(world).project(camera);
      const rect = canvas.getBoundingClientRect();
      const x = (tmp.x * 0.5 + 0.5) * rect.width;
      const y = (-tmp.y * 0.5 + 0.5) * rect.height;
      el.style.transform =
        anchor === "center"
          ? `translate(${x}px, ${y}px) translate(-50%, -100%)`
          : `translate(${Math.max(8, Math.min(x - 14, rect.width - el.offsetWidth - 8))}px, ${y}px) translate(0, -100%)`;
      el.style.opacity = "";
    };

    const camDir = new THREE.Vector3();
    const giftTarget = new THREE.Vector3();
    const burstPoint = new THREE.Vector3();

    /** The whole present show for one door; `s` = seconds since the tap. */
    const animateGift = (d: DoorObject, s: number, nowS: number) => {
      const g = d.gift!;
      const cue = (name: Parameters<typeof sound.play>[0], at: number) => {
        if (s >= at && !d.giftCues.has(name) && d.giftSkipAt < 0) {
          d.giftCues.add(name);
          sound.play(name);
        }
      };
      cue("whoosh", T.wiggleEnd);
      cue("land", T.flyEnd);
      cue("pop", T.shakeEnd);
      const reveal = () => {
        if (!d.giftRevealed) {
          d.giftRevealed = true;
          d.showIcon();
          onRevealRef.current(d.view);
        }
      };
      if (reducedMotion) {
        g.setOpacity(0); // no show: open the card once the door is open
        if (s > 0.5) {
          reveal();
          g.group.visible = false;
        }
        return;
      }

      // 1. wiggle in the niche while the door swings open
      if (s < T.wiggleEnd) {
        g.group.rotation.z = Math.sin(s * 38) * 0.07 * Math.sin(Math.PI * span(s, 0.1, T.wiggleEnd));
        return;
      }
      if (!d.giftFlight) {
        // Straight out of the wall first (along its outward normal), far enough
        // to clear the open door, so it never passes through it, whichever way
        // the house is turned.
        const wallNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(
          g.group.parent!.getWorldQuaternion(new THREE.Quaternion()),
        );
        scene.attach(g.group); // leave the house, keep the current world position
        g.group.rotation.z = 0;
        const from = g.group.position.clone();
        const out = from.clone().addScaledVector(wallNormal, NICHE_DEPTH * 0.5 + DOOR_W + 0.35);
        d.giftFlight = { from, out, rotY: g.group.rotation.y };
      }
      const f = d.giftFlight;
      const visibleW = 2 * GIFT_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      const size = Math.min(GIFT_FINAL_SIZE, visibleW * 0.42);
      camera.getWorldDirection(camDir);
      giftTarget.copy(camera.position).addScaledVector(camDir, GIFT_DISTANCE);
      giftTarget.y -= size * 0.75; // a bit below centre, so the icon has room to rise

      // tapped to skip: just fade out where it is
      if (d.giftSkipAt >= 0) {
        const fade = clamp01((nowS - d.giftSkipAt) / 0.3);
        g.setOpacity(1 - fade);
        giftLight.intensity *= 1 - fade;
        if (fade >= 1) g.group.visible = false;
        return;
      }

      // 2a. slide straight out of the niche, past the door
      if (s < T.exitEnd) {
        const k = easeInOutCubic(span(s, T.wiggleEnd, T.exitEnd));
        g.group.position.lerpVectors(f.from, f.out, k);
        g.group.position.y += Math.sin(Math.PI * k) * 0.06;
        return;
      }

      // 2b. then float towards her, turning once, growing
      if (s < T.flyEnd) {
        const k = easeInOutCubic(span(s, T.exitEnd, T.flyEnd));
        g.group.position.lerpVectors(f.out, giftTarget, k);
        g.group.position.y += Math.sin(Math.PI * k) * 0.8;
        g.group.scale.setScalar(THREE.MathUtils.lerp(GIFT_SIZE, size, k));
        g.group.rotation.set(Math.sin(Math.PI * k) * 0.25, THREE.MathUtils.lerp(f.rotY, Math.PI * 2 + 0.3, k), 0);
        return;
      }

      g.group.position.copy(giftTarget);
      // 3. land: a little squash and settle
      const land = span(s, T.flyEnd, T.landEnd);
      const squash = Math.sin(Math.PI * land) * 0.12 * (1 - land);
      g.group.scale.set(size * (1 + squash), size * (1 - squash), size * (1 + squash));
      // 4. anticipation: shake
      const shake = span(s, T.landEnd, T.shakeEnd);
      const shakeAmt = Math.sin(Math.PI * shake) * (s < T.shakeEnd ? 1 : 0);
      g.group.rotation.set(0, 0.3 + Math.sin(s * 30) * 0.04 * shakeAmt, Math.sin(s * 24) * 0.06 * shakeAmt);

      // 5. the lid lifts off, light pours out, the icon rises
      g.setLid(span(s, T.shakeEnd, T.lidEnd));
      const glow = span(s, T.glowStart, T.glowStart + 0.5);
      g.setGlow(glow);
      g.group.localToWorld(burstPoint.set(0, g.openingY + 0.2, 0));
      giftLight.position.copy(burstPoint);
      giftLight.intensity = glow * 4 * (s < T.gone ? 1 : 0);
      cue("chime", T.glowStart);
      if (!d.giftBurst && s > T.glowStart + 0.05) {
        d.giftBurst = true;
        g.group.localToWorld(burstPoint.set(0, g.openingY, 0));
        sparkles.burst(burstPoint, size * 1.6);
        elf.hop(time);
      }
      // (no icon rising out of the present: on its own it was hard to read)

      // 6. open the card, and let the present fade away behind it
      if (s >= T.reveal) reveal();
      if (s > T.reveal) {
        const fade = span(s, T.reveal, T.gone);
        g.setOpacity(1 - fade);
        giftLight.intensity *= 1 - fade;
        if (fade >= 1) {
          g.group.visible = false;
          giftLight.intensity = 0;
        }
      }
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const rawDt = (now - last) / 1000;
      const dt = Math.min(rawDt, 0.05);
      last = now;
      if (document.hidden) return;
      time += dt;
      if (now - lastAmbience > 20_000) {
        lastAmbience = now;
        applyAmbience();
      }
      const t = reducedMotion ? 0 : time;

      // ── first visit: giant present ────────────────────────────────────
      if (giant && introState !== "off" && introState !== "done") {
        const g = giant.group;
        const realS = now / 1000 - mountS;
        if (introState === "falling") {
          const s = realS;
          if (s < 1.3) {
            const k = s / 1.3;
            g.position.y = 30 * (1 - k * k);
            g.rotation.y = START_YAW + (1 - k) * 0.6;
          } else {
            introCue("land", s, 1.3, () => sound.play("land"));
            const b = (s - 1.3) / 0.6;
            g.position.y = Math.max(0, Math.sin(Math.PI * Math.min(b, 1)) * 0.9 * (1 - b));
            const sq = Math.sin(Math.PI * Math.min((s - 1.3) / 0.25, 1)) * 0.07;
            g.scale.set(1 + sq, 1 - sq, 1 + sq);
            if (b >= 1) {
              g.position.y = 0;
              g.scale.set(1, 1, 1);
              introState = "waiting";
              setIntroUi("tap");
            }
          }
        } else if (introState === "waiting") {
          // a little "open me!" wiggle every couple of seconds
          const w = realS % 2.4;
          g.rotation.z = w < 0.5 ? Math.sin(w * 40) * 0.012 * Math.sin((Math.PI * w) / 0.5) : 0;
          g.position.y = w < 0.5 ? Math.sin((Math.PI * w) / 0.5) * 0.15 : 0;
        } else if (introState === "opening") {
          const s = realS - introOpenAt;
          // shake, harder and harder
          const shake = Math.min(s / 0.7, 1);
          g.rotation.z = s < 0.75 ? Math.sin(s * 42) * 0.03 * shake : 0;
          g.position.y = 0;
          introCue("knock", s, 0, () => sound.play("knock"));
          // the lid flies off
          const l = Math.max(0, (s - 0.7) / 0.9);
          giant.lid.position.set(-l * 1.6, giant.height + (1 - (1 - Math.min(l, 1)) ** 2) * 5, l * 1.2);
          giant.lid.rotation.set(l * 1.4, l * 0.8, l * 2.2);
          introCue("pop", s, 0.7, () => sound.play("pop"));
          // the walls fall open like petals, then fade
          const wk = Math.min(Math.max((s - 0.85) / 0.75, 0), 1);
          giant.setWalls(wk * wk);
          introCue("burst", s, 0.9, () => {
            sound.play("whoosh");
            sound.play("chime");
            houseRevealed = true;
            house.visible = true;
            houseGrowAt = time;
            confetti.burst(new THREE.Vector3(0, 1.6, 0.4), new THREE.Vector3(1.4, 1.1, 1.4), 1);
            sparkles.burst(new THREE.Vector3(0, 2.6, 0.5), 1.8);
            charsPopAt = time + 1.0;
          });
          introCue("jingle", s, 1.6, () => sound.play("jingle"));
          introCue("forYou", s, 1.4, () => setIntroUi("forYou"));
          if (s > 1.6) giant.setOpacity(Math.max(0, 1 - (s - 1.6) / 0.6));
          if (s > 2.3) {
            introState = "done";
            g.visible = false;
            writeFlag(introKey);
            setIntroRunning(false);
            window.setTimeout(() => setIntroUi(null), 2800);
          }
        }
      }

      // ── the 24th: the side doors pop in ───────────────────────────────
      if (twistState === "pending" && (introState === "off" || introState === "done")) {
        const eveOpen = openedRef.current.has(EVE);
        if (eveOpen && cardOpenRef.current) eveCardSeen = true;
        if (eveOpen && (eveOpenedAtLoad || eveCardSeen) && !cardOpenRef.current) {
          eveOpenedAtLoad = false;
          twistState = "running";
          twistStart = time + 0.7;
          drag = null;
        }
      }
      if (twistState === "running") {
        const s = time - twistStart;
        if (s >= 0) {
          targetYaw = -1.45;
          introCue("twist-whoosh", s, 0, () => sound.play("whoosh"));
          if (s >= 0.9 && plainSide?.visible) {
            plainSide.visible = false;
            sideWall!.visible = true;
          }
          bonusDoorObjects.forEach((d, i) => {
            const at = 1.1 + i * 0.22;
            if (s >= at && d.popAt < 0) {
              d.popAt = time;
              d.pop.visible = true;
              sound.ding(i);
              d.pop.getWorldPosition(burstPoint);
              sparkles.burst(burstPoint, 0.5);
            }
          });
          const end = 1.1 + bonusDoorObjects.length * 0.22 + 0.5;
          if (s >= end) {
            twistState = "done";
            writeFlag(twistKey);
            sideSeen = true;
            setShowSideHint(false);
            elf.hop(time);
            bubbleAnchor = (out) => characters[0].c.headTop(out);
            setElfLine("Psst… es geht weiter! ✨");
          }
        }
      }
      for (const d of bonusDoorObjects) {
        if (d.popAt < 0) continue;
        const k = Math.min((time - d.popAt) / 0.4, 1);
        const back = 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2; // ease out, a little overshoot
        d.pop.scale.setScalar(Math.max(0.001, back));
      }

      // the house grows up out of the burst present, with a little overshoot
      if (houseGrowAt >= 0) {
        const k = Math.min((time - houseGrowAt) / 1.1, 1);
        const back = 1 + 1.9 * (k - 1) ** 3 + 0.9 * (k - 1) ** 2;
        house.scale.setScalar(Math.max(0.001, back));
        if (k >= 1) {
          house.scale.setScalar(1);
          houseGrowAt = -1;
        }
      }

      // characters hidden inside the present until it bursts, then pop in
      characters.forEach((ch, i) => {
        const at = charsPopAt + i * 0.12;
        if (time < at) {
          ch.c.group.visible = false;
          return;
        }
        ch.c.group.visible = true;
        const k = Math.min((time - at) / 0.45, 1);
        const back = 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2;
        ch.c.group.scale.setScalar(charBaseScale[i] * Math.max(0.001, back));
      });

      // turn the house
      const ease = reducedMotion ? 1 : 1 - Math.pow(0.002, dt);
      yaw += (targetYaw - yaw) * ease;
      house.rotation.y = yaw + (reducedMotion || drag ? 0 : Math.sin(t * 0.35) * 0.025);
      if (!sideSeen && hasSide && twistState === "done" && yaw < -1.0) {
        sideSeen = true;
        setShowSideHint(false);
      }

      // doors
      const opened = openedRef.current;
      // everyone cheers when a door opens
      if (opened.size > lastOpenedCount) for (const ch of characters) ch.c.hop(time);
      lastOpenedCount = opened.size;

      const toastNow = toastStateRef.current;
      if (toastNow && toastNow.date !== lastToastDate) {
        const d = doorObjects.find((o) => o.view.date === toastNow.date);
        if (d) d.shakeStart = time;
      }
      lastToastDate = toastNow?.date ?? null;

      for (const d of doorObjects) {
        const target = opened.has(d.view.date) ? OPEN_ANGLE : 0;
        const doorEase = reducedMotion ? 1 : 1 - Math.pow(0.004, dt);
        d.angle += (target - d.angle) * doorEase;
        let wobble = 0;
        if (d.shakeStart >= 0) {
          const s = time - d.shakeStart;
          if (s < 0.45 && !reducedMotion) wobble = Math.sin(s * 40) * 0.09 * (1 - s / 0.45);
          else d.shakeStart = -1;
        }
        d.hinge.rotation.y = d.angle + wobble;
        if (d.gift && d.gift.group.visible && opened.has(d.view.date)) {
          // real clock (not frame time), so it plays at the same speed on a slow phone
          if (d.giftStart < 0) d.giftStart = now / 1000;
          animateGift(d, now / 1000 - d.giftStart, now / 1000);
        }
        d.frontMat.emissiveIntensity =
          d.view.isToday && !opened.has(d.view.date)
            ? 0.18 + (reducedMotion ? 0 : 0.14 * Math.sin(now / 280))
            : 0;
      }

      // the house lights up as she opens doors; new lights come on once the
      // present has opened and she has closed the card, so she sees them pop
      if (!cardOpenRef.current) {
        litDoors = doors.filter(
          (dv) =>
            opened.has(dv.date) &&
            !doorObjects.some((o) => o.view.date === dv.date && o.giftStart >= 0 && !o.giftRevealed),
        ).length;
      }
      const progress = Math.min(1, litDoors / 24);
      const wantLit = houseRevealed ? Math.max(MIN_LIT, Math.round(progress * bulbs.length)) : 0;
      if (houseRevealed && litCount === 0 && wantLit > 0) {
        // the present just burst: the lights come on one after another
        for (let i = 0; i < wantLit; i++) bulbs[i].litAt = time + 0.3 + i * 0.06;
        litCount = wantLit;
      }
      if (wantLit !== litCount) {
        for (let i = Math.max(litCount, 0); i < wantLit; i++) bulbs[i].litAt = litCount < 0 ? -10 : time;
        if (litCount >= 0 && wantLit > litCount) sound.play("chime");
        litCount = wantLit;
      }
      bulbs.forEach((b, i) => {
        if (i >= litCount || time < b.litAt) {
          b.mat.color.copy(unlitBulb);
          b.mesh.scale.setScalar(1);
          return;
        }
        const k = reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(t * 2.2 + b.phase);
        const pop = reducedMotion ? 0 : Math.max(0, 1 - (time - b.litAt) / 0.6);
        b.mat.color.copy(b.base).multiplyScalar(k * (0.35 + 0.65 * glowAmount) + pop * 0.8);
        b.mesh.scale.setScalar(1 + pop * 0.9);
      });
      atticMat.color.lerpColors(windowDay, windowLit, glowAmount * (0.45 + 0.55 * progress));

      for (const ch of characters) ch.c.update(time, reducedMotion);
      if (galaPartner && !reducedMotion) {
        // sparkle where the glasses meet, once per toast
        const toasting = isToasting(time);
        if (toasting && !wasToasting) {
          const a = elf.glassTop(new THREE.Vector3());
          const b = galaPartner.glassTop(new THREE.Vector3());
          if (a && b) {
            const mid = a.add(b).multiplyScalar(0.5);
            sparkles.burst(mid.clone(), 0.45);
            galaConfetti?.burst(mid.setY(mid.y + 1.2), new THREE.Vector3(0.7, 0.2, 0.5), 0.35);
          }
          sound.play("clink");
        }
        wasToasting = toasting;
      }
      fireworks?.update(Math.min(rawDt, 0.1), reducedMotion);
      shootingStar.update(time);
      smoke.update(time);
      sparkles.update(Math.min(rawDt, 0.25)); // real time, like the gift show
      confetti.update(Math.min(rawDt, 0.1));
      galaConfetti?.update(Math.min(rawDt, 0.1));
      if (sleeper && zzz.length) {
        sleeper.group.updateMatrixWorld(true);
        sleeper.headTop(sleeperHead);
        house.worldToLocal(sleeperHead);
        for (const z of zzz) {
          const k = (time * 0.35 + z.phase) % 1;
          z.sprite.position.set(sleeperHead.x + k * 0.25, sleeperHead.y + 0.1 + k * 1.0, sleeperHead.z);
          z.sprite.scale.setScalar(0.16 + k * 0.22);
          (z.sprite.material as THREE.SpriteMaterial).opacity = reducedMotion ? 0 : Math.sin(k * Math.PI);
        }
      }
      for (const bl of balloons) {
        bl.group.position.y = bl.y + Math.sin(time * 1.3 + bl.phase) * 0.08;
        bl.group.rotation.z = Math.sin(time * 0.9 + bl.phase) * 0.08;
      }
      snow.update(t);
      renderer.render(scene, camera);

      // keep the toast above its door, and the speech bubble above the elf
      const d = toastNow ? doorObjects.find((o) => o.view.date === toastNow.date) : null;
      if (d) {
        d.door.getWorldPosition(worldPoint);
        worldPoint.y += DOOR_H * 0.62;
      }
      place(toastRef.current, d ? worldPoint : null);
      place(bubbleRef.current, bubbleAnchor(worldPoint), "left");
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      for (const ch of characters) ch.c.dispose();
      fireworks?.dispose();
      nightSky.dispose();
      shootingStar.dispose();
      smoke.dispose();
      sign?.dispose();
      snow.dispose();
      sparkles.dispose();
      confetti.dispose();
      galaConfetti?.dispose();
      for (const g of gifts) g.dispose();
      for (const x of disposables) x.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // The scene is built once per set of doors; opened/toast are read via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doors, today, clock, returnDate]);

  return (
    <div ref={skyRef} className="fixed inset-0 z-0">
      <div ref={hostRef} className="absolute inset-0" />
      <div
        ref={toastRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full bg-[#fbf5e6] px-3 py-1.5 text-xs font-bold text-[#1f3b2d] opacity-0 shadow-lg transition-opacity"
      >
        {toast?.text}
      </div>
      <div className="pointer-events-none absolute left-0 top-0" style={{ opacity: elfLine ? 1 : 0, transition: "opacity 0.3s" }}>
        <div
          ref={bubbleRef}
          aria-live="polite"
          className="absolute left-0 top-0 w-max max-w-[180px] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs font-semibold leading-snug text-[#1f3b2d] shadow-lg"
        >
          {elfLine}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          sound.unlock();
          sound.setEnabled(!soundOn);
        }}
        aria-label={soundOn ? "Ton aus" : "Ton an"}
        className="absolute bottom-[96px] right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-lg backdrop-blur transition hover:bg-black/35"
      >
        <span aria-hidden>{soundOn ? "🔊" : "🔇"}</span>
      </button>
      {introUi === "tap" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[150px] flex justify-center">
          <span className="animate-bounce rounded-full bg-[#f2c14e] px-5 py-2.5 text-base font-extrabold text-[#3a2a08] shadow-xl">
            Tipp mich an! 🎁
          </span>
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center transition-all duration-700"
        style={{ opacity: introUi === "forYou" ? 1 : 0, transform: `scale(${introUi === "forYou" ? 1 : 0.8})` }}
      >
        <span
          className="text-5xl font-extrabold text-white"
          style={{ textShadow: "0 0 24px rgba(255,200,90,0.95), 0 3px 0 rgba(0,0,0,0.35)" }}
        >
          Für dich ❤️
        </span>
      </div>
      {isNewYear && (
        <div className="pointer-events-none absolute inset-x-0 top-[96px] flex flex-col items-center">
          <span
            className="animate-pulse text-3xl font-extrabold tracking-tight text-[#ffe9a8]"
            style={{ textShadow: "0 0 18px rgba(255,200,90,0.9), 0 2px 0 rgba(0,0,0,0.35)" }}
          >
            ¡Feliz Año Nuevo!
          </span>
          <span className="mt-0.5 text-sm font-bold tracking-[0.3em] text-[#ffe9a8]/80">2027</span>
        </div>
      )}
      {isGalaDay && (
        <div className="pointer-events-none absolute inset-x-0 top-[96px] flex flex-col items-center">
          <span
            className="text-3xl font-extrabold tracking-tight text-[#ffe9a8]"
            style={{ textShadow: "0 0 18px rgba(255,200,90,0.9), 0 2px 0 rgba(0,0,0,0.35)" }}
          >
            Guten Rutsch!
          </span>
          <span className="mt-0.5 text-sm font-bold tracking-[0.3em] text-[#ffe9a8]/80">SILVESTER</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-[100px] flex justify-center">
        {introRunning ? null : showSideHint ? (
          <span className="animate-pulse rounded-full bg-[#f2c14e] px-4 py-2 text-sm font-bold text-[#3a2a08] shadow-lg">
            Psst… dreh das Haus 👈 da ist noch mehr
          </span>
        ) : showDragHint ? (
          <span className="rounded-full bg-black/25 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
            Zum Drehen wischen · Türchen antippen
          </span>
        ) : null}
      </div>
    </div>
  );
}
