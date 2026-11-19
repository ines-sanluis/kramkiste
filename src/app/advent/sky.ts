import * as THREE from "three";

import { MUNICH_TZ } from "@/lib/munichDate";

/**
 * Time of day for the advent house: night, sunrise, day and sunset, by the
 * clock in Munich. Fixed, approximate times for December/early January in
 * Munich (sunrise ≈ 7:40–8:05, sunset ≈ 16:20–16:40):
 *
 *   until 7:15   night
 *   7:15 – 8:40  sunrise (sun up around 7:55)
 *   8:40 – 15:40 day
 *   15:40 – 17:10 sunset (sun down around 16:25)
 *   from 17:10   night
 *
 * Everything in between keyframes is blended, so it changes gradually.
 */

export type Ambience = {
  skyTop: THREE.Color;
  skyBottom: THREE.Color;
  hemiSky: THREE.Color;
  hemiIntensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
  warmIntensity: number; // the cosy light in front of the house
  ground: THREE.Color;
  /** 0..1: how much the house's own lights glow (window, fairy lights). */
  glow: number;
  stars: number; // 0..1
  moon: number; // 0..1
};

type Key = {
  at: number; // minutes after midnight
  skyTop: number;
  skyBottom: number;
  hemiSky: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  warmIntensity: number;
  ground: number;
  glow: number;
  stars: number;
  moon: number;
};

const NIGHT = {
  skyTop: 0x0f2219,
  skyBottom: 0x2a4a37,
  hemiSky: 0xc9d6ff,
  hemiIntensity: 1.1,
  sunColor: 0xdfe8ff,
  sunIntensity: 1.3,
  sunPosition: [-6, 12, 9] as [number, number, number],
  warmIntensity: 1.4,
  ground: 0xdfe7ee,
  glow: 1,
  stars: 1,
  moon: 1,
};

const h = (hh: number, mm = 0) => hh * 60 + mm;

const KEYS: Key[] = [
  { at: h(0), ...NIGHT },
  { at: h(7, 15), ...NIGHT },
  {
    // sunrise: pink and orange at the horizon, low warm sun from the left
    at: h(7, 55),
    skyTop: 0x3d4b7a,
    skyBottom: 0xf3a27c,
    hemiSky: 0xffd6c0,
    hemiIntensity: 1.15,
    sunColor: 0xffb07a,
    sunIntensity: 1.5,
    sunPosition: [-12, 3, 7],
    warmIntensity: 0.9,
    ground: 0xf2dcd6,
    glow: 0.7,
    stars: 0.15,
    moon: 0.2,
  },
  {
    // full winter daylight
    at: h(8, 40),
    skyTop: 0x6c9fd2,
    skyBottom: 0xd3e5f3,
    hemiSky: 0xffffff,
    hemiIntensity: 1.55,
    sunColor: 0xfff4e0,
    sunIntensity: 1.9,
    sunPosition: [-5, 13, 9],
    warmIntensity: 0.3,
    ground: 0xf6f9fc,
    glow: 0.25,
    stars: 0,
    moon: 0,
  },
  {
    at: h(15, 40),
    skyTop: 0x6c9fd2,
    skyBottom: 0xd3e5f3,
    hemiSky: 0xffffff,
    hemiIntensity: 1.5,
    sunColor: 0xfff0d8,
    sunIntensity: 1.8,
    sunPosition: [6, 11, 9],
    warmIntensity: 0.35,
    ground: 0xf6f9fc,
    glow: 0.3,
    stars: 0,
    moon: 0,
  },
  {
    // sunset: orange and violet, low sun from the right, lights coming on
    at: h(16, 25),
    skyTop: 0x2d3063,
    skyBottom: 0xf28c5c,
    hemiSky: 0xffb894,
    hemiIntensity: 1.1,
    sunColor: 0xff8a50,
    sunIntensity: 1.4,
    sunPosition: [12, 3, 7],
    warmIntensity: 1.0,
    ground: 0xf0d5cc,
    glow: 0.85,
    stars: 0.3,
    moon: 0.35,
  },
  { at: h(17, 10), ...NIGHT },
  { at: h(24), ...NIGHT },
];

const ca = new THREE.Color();
const cb = new THREE.Color();

/** The look of the scene at `minutes` after midnight (Munich time). */
export function ambienceAt(minutes: number): Ambience {
  const m = ((minutes % 1440) + 1440) % 1440;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].at <= m) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = b.at === a.at ? 0 : (m - a.at) / (b.at - a.at);
  const s = t * t * (3 - 2 * t); // ease between keyframes
  const col = (x: number, y: number) => new THREE.Color().lerpColors(ca.set(x), cb.set(y), s);
  const num = (x: number, y: number) => x + (y - x) * s;
  return {
    skyTop: col(a.skyTop, b.skyTop),
    skyBottom: col(a.skyBottom, b.skyBottom),
    hemiSky: col(a.hemiSky, b.hemiSky),
    hemiIntensity: num(a.hemiIntensity, b.hemiIntensity),
    sunColor: col(a.sunColor, b.sunColor),
    sunIntensity: num(a.sunIntensity, b.sunIntensity),
    sunPosition: new THREE.Vector3(...a.sunPosition).lerp(new THREE.Vector3(...b.sunPosition), s),
    warmIntensity: num(a.warmIntensity, b.warmIntensity),
    ground: col(a.ground, b.ground),
    glow: num(a.glow, b.glow),
    stars: num(a.stars, b.stars),
    moon: num(a.moon, b.moon),
  };
}

/** Minutes after midnight right now in Munich, or from an "HH:MM" override. */
export function munichMinutes(override?: string | null): number {
  if (override && /^\d{1,2}:\d{2}$/.test(override)) {
    const [hh, mm] = override.split(":").map(Number);
    return hh * 60 + mm;
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MUNICH_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** Stars far away behind the house, and a soft moon. */
export function createNightSky(pixelRatio: number) {
  const COUNT = 260;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos.set(
      [THREE.MathUtils.randFloat(-45, 45), THREE.MathUtils.randFloat(6, 34), THREE.MathUtils.randFloat(-45, -30)],
      i * 3,
    );
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  // round, soft star (without a map, points render as squares)
  const dot = document.createElement("canvas");
  dot.width = dot.height = 32;
  const dctx = dot.getContext("2d")!;
  const dg = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  dg.addColorStop(0, "rgba(255,255,255,1)");
  dg.addColorStop(0.45, "rgba(255,255,255,0.8)");
  dg.addColorStop(1, "rgba(255,255,255,0)");
  dctx.fillStyle = dg;
  dctx.fillRect(0, 0, 32, 32);
  const starMap = new THREE.CanvasTexture(dot);
  const starMat = new THREE.PointsMaterial({
    color: 0xfff8e6,
    map: starMap,
    size: 2.6 * pixelRatio,
    sizeAttenuation: false,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -2;

  // moon: a pale disc with a soft halo
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,250,230,1)");
  g.addColorStop(0.33, "rgba(255,248,225,1)");
  g.addColorStop(0.38, "rgba(255,240,200,0.35)");
  g.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const moonMap = new THREE.CanvasTexture(c);
  moonMap.colorSpace = THREE.SRGBColorSpace;
  const moonMat = new THREE.SpriteMaterial({ map: moonMap, transparent: true, depthWrite: false });
  const moon = new THREE.Sprite(moonMat);
  moon.position.set(7.5, 17.5, -40);
  moon.scale.setScalar(7);
  moon.renderOrder = -1;

  const group = new THREE.Group();
  group.add(stars, moon);
  return {
    group,
    moon,
    /** Is the moon showing (night, dusk, dawn)? */
    moonVisible: () => moon.visible && moonMat.opacity > 0.3,
    set(starAmount: number, moonAmount: number) {
      starMat.opacity = starAmount;
      stars.visible = starAmount > 0.01;
      moonMat.opacity = moonAmount;
      moon.visible = moonAmount > 0.01;
    },
    dispose() {
      starGeo.dispose();
      starMat.dispose();
      starMap.dispose();
      moonMap.dispose();
      moonMat.dispose();
    },
  };
}
