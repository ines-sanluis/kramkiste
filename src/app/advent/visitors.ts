import * as THREE from "three";

/**
 * Visitors who drop by the advent house on certain days, all built from
 * simple shapes (original designs). Each one bobs, does its own little
 * animation, hops and says something when tapped.
 *
 * Where they stand:
 *   "ground": in the snow to the right of the house
 *   "roof":   on the roof ridge (added to the house, so it turns with it)
 *
 * The schedule is at the bottom (VISITORS_BY_DAY). Dates are Munich time.
 */

export type Character = {
  group: THREE.Group;
  lines: string[];
  update: (time: number, reducedMotion: boolean) => void;
  hop: (time: number) => void;
  /** World position just above its head, for the speech bubble. */
  headTop: (out: THREE.Vector3) => THREE.Vector3;
  dispose: () => void;
};

export type VisitorKind = "snowman" | "reindeer" | "penguin" | "robin" | "santa" | "boots";

export const VISITOR_SPOT: Record<VisitorKind, "ground" | "roof"> = {
  snowman: "ground",
  reindeer: "ground",
  penguin: "ground",
  boots: "ground",
  robin: "roof",
  santa: "roof",
};

// ── the schedule ────────────────────────────────────────────────────────
// At most one "ground" and one "roof" visitor per day.
// The 31st (gala elves) and 1st of January (fireworks) are handled in
// Calendar3D, see SPECIAL_DAYS.
const VISITORS_BY_DAY: Record<string, VisitorKind[]> = {
  "2026-12-02": ["robin"],
  "2026-12-03": ["snowman"],
  "2026-12-06": ["boots"], // Nikolaustag
  "2026-12-09": ["reindeer"],
  "2026-12-11": ["penguin"],
  "2026-12-13": ["snowman"],
  "2026-12-15": ["robin"],
  "2026-12-17": ["reindeer"],
  "2026-12-20": ["snowman", "robin"],
  "2026-12-22": ["penguin"],
  "2026-12-24": ["santa", "reindeer"],
  "2026-12-25": ["santa", "snowman"],
  "2026-12-27": ["penguin"],
  "2026-12-29": ["reindeer", "robin"],
  "2027-01-03": ["snowman"],
  "2027-01-05": ["penguin", "robin"],
};

export const SPECIAL_DAYS = {
  gala: "2026-12-31", // two elves in their best clothes, toasting
  newYear: "2027-01-01", // fireworks and "¡Feliz Año Nuevo!"
};

export function visitorsFor(today: string): VisitorKind[] {
  return VISITORS_BY_DAY[today] ?? [];
}

// ── shared helpers ──────────────────────────────────────────────────────
function kit() {
  const disposables: { dispose: () => void }[] = [];
  const mat = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...opts });
    disposables.push(m);
    return m;
  };
  const geo = <T extends THREE.BufferGeometry>(g: T) => {
    disposables.push(g);
    return g;
  };
  const mesh = (
    parent: THREE.Object3D,
    g: THREE.BufferGeometry,
    m: THREE.Material,
    pos: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    const x = new THREE.Mesh(g, m);
    x.position.set(...pos);
    x.rotation.set(...rot);
    x.scale.set(...scale);
    parent.add(x);
    return x;
  };
  const dispose = () => {
    for (const d of disposables) d.dispose();
  };
  return { mat, geo, mesh, dispose };
}

/** A hop: returns the extra height (0..1) for the current time. */
function hopper(duration = 0.6) {
  let start = -10;
  return {
    hop(time: number) {
      if (time - start > duration * 0.8) start = time;
    },
    amount(time: number) {
      const s = (time - start) / duration;
      return s >= 0 && s < 1 ? Math.sin(Math.PI * s) : 0;
    },
  };
}

/** Two black eyes with a glint, on a head of radius r (facing +z). */
function eyes(k: ReturnType<typeof kit>, head: THREE.Object3D, r: number, spread = 0.38, y = 0.15) {
  const eyeGeo = k.geo(new THREE.SphereGeometry(r * 0.16, 12, 10));
  const glintGeo = k.geo(new THREE.SphereGeometry(r * 0.05, 8, 6));
  const black = k.mat(0x1d1612, { roughness: 0.3 });
  const white = k.mat(0xffffff);
  const list: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group();
    const a = sx * spread;
    e.position.set(Math.sin(a) * r * 0.92, y * r, Math.cos(a) * r * 0.92);
    k.mesh(e, eyeGeo, black, [0, 0, 0]);
    k.mesh(e, glintGeo, white, [r * 0.05, r * 0.06, r * 0.12]);
    head.add(e);
    list.push(e);
  }
  return list;
}

function blinker() {
  let next = 1 + Math.random() * 2;
  return (time: number, eyeList: THREE.Object3D[]) => {
    let s = 1;
    if (time > next) {
      if (time - next < 0.14) s = 0.15;
      else next = time + 2.5 + Math.random() * 3;
    }
    for (const e of eyeList) e.scale.y = s;
  };
}

// ── snowman ─────────────────────────────────────────────────────────────
function createSnowman(): Character {
  const k = kit();
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const snow = k.mat(0xfbfdff, { roughness: 1 });
  const coal = k.mat(0x222222, { roughness: 0.6 });
  const red = k.mat(0xc8372d);
  const stick = k.mat(0x6b4a2e);

  k.mesh(body, k.geo(new THREE.SphereGeometry(0.46, 24, 18)), snow, [0, 0.42, 0]);
  k.mesh(body, k.geo(new THREE.SphereGeometry(0.34, 24, 18)), snow, [0, 1.04, 0]);
  const head = new THREE.Group();
  head.position.y = 1.5;
  body.add(head);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.25, 24, 18)), snow, [0, 0, 0]);
  const eyeList = eyes(k, head, 0.25, 0.35, 0.25);
  // carrot nose
  k.mesh(head, k.geo(new THREE.ConeGeometry(0.045, 0.26, 12)), k.mat(0xf08a2a), [0, -0.01, 0.34], [Math.PI / 2, 0, 0]);
  // coal smile and buttons
  const dot = k.geo(new THREE.SphereGeometry(0.022, 8, 6));
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.28;
    k.mesh(head, dot, coal, [Math.sin(a) * 0.12, -0.1 - Math.cos(a) * 0.03 + 0.03, 0.22]);
  }
  const btn = k.geo(new THREE.SphereGeometry(0.035, 10, 8));
  for (const y of [0.92, 1.06, 1.2]) k.mesh(body, btn, coal, [0, y, Math.sqrt(Math.max(0.34 ** 2 - (y - 1.04) ** 2, 0)) - 0.01]);
  // cheeks
  const cheek = k.mat(0xf2a0a0, { transparent: true, opacity: 0.6 });
  for (const sx of [-1, 1]) k.mesh(head, k.geo(new THREE.SphereGeometry(0.04, 10, 8)), cheek, [sx * 0.13, -0.05, 0.2], [0, 0, 0], [1, 0.6, 0.4]);
  // scarf
  k.mesh(body, k.geo(new THREE.TorusGeometry(0.24, 0.065, 10, 24)), red, [0, 1.3, 0], [Math.PI / 2, 0, 0]);
  k.mesh(body, k.geo(new THREE.BoxGeometry(0.11, 0.32, 0.05)), red, [0.12, 1.15, 0.24], [0.2, 0, 0.15]);
  // top hat
  const hat = new THREE.Group();
  hat.position.y = 0.2;
  head.add(hat);
  k.mesh(hat, k.geo(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 24)), coal, [0, 0, 0]);
  k.mesh(hat, k.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.28, 24)), coal, [0, 0.15, 0]);
  k.mesh(hat, k.geo(new THREE.CylinderGeometry(0.172, 0.172, 0.06, 24)), red, [0, 0.05, 0]);
  hat.rotation.z = -0.12;
  // stick arms, the right one waves
  const armGeo = k.geo(new THREE.CylinderGeometry(0.018, 0.022, 0.6, 6));
  const fingerGeo = k.geo(new THREE.CylinderGeometry(0.012, 0.014, 0.14, 5));
  const makeArm = (sx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.3, 1.1, 0);
    k.mesh(pivot, armGeo, stick, [sx * 0.28, 0, 0], [0, 0, Math.PI / 2]);
    k.mesh(pivot, fingerGeo, stick, [sx * 0.6, 0.05, 0], [0, 0, sx * -0.6]);
    k.mesh(pivot, fingerGeo, stick, [sx * 0.6, -0.04, 0], [0, 0, sx * -2.2]);
    body.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  const h = hopper();
  const blink = blinker();
  let nextWave = 1.5;
  return {
    group,
    lines: ["Mir ist nicht kalt, ich bin so gebaut ☃️", "Hast du zufällig eine Karotte übrig? 🥕", "Ich hab heute frei und guck nur zu ✨"],
    update(time, reduced) {
      if (reduced) return;
      const hp = h.amount(time);
      body.position.y = hp * 0.35;
      body.rotation.z = Math.sin(time * 0.9) * 0.03;
      let wave = 0;
      if (time > nextWave) {
        const w = time - nextWave;
        if (w < 1.6) wave = Math.sin(Math.min(w / 0.25, 1) * Math.PI * 0.5);
        else nextWave = time + 5 + Math.random() * 4;
      }
      armR.rotation.z = 0.35 + wave * (0.5 + Math.sin(time * 12) * 0.25) + hp * 0.8;
      armL.rotation.z = -0.25 - hp * 0.8;
      hat.rotation.z = -0.12 + Math.sin(time * 1.3) * 0.04 - hp * 0.2;
      blink(time, eyeList);
    },
    hop: h.hop,
    headTop: (out) => hat.localToWorld(out.set(0, 0.45, 0)),
    dispose: k.dispose,
  };
}

// ── reindeer (faces left, towards the house) ────────────────────────────
function createReindeer(): Character {
  const k = kit();
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const fur = k.mat(0x8b5a3a);
  const light = k.mat(0xc79d72);
  const dark = k.mat(0x3a2418);
  const antlerMat = k.mat(0xe8d8b8);

  k.mesh(body, k.geo(new THREE.CapsuleGeometry(0.24, 0.5, 8, 16)), fur, [0, 0.78, 0], [0, 0, Math.PI / 2]);
  k.mesh(body, k.geo(new THREE.SphereGeometry(0.18, 16, 12)), light, [0.02, 0.7, 0], [0, 0, 0], [1.6, 0.8, 1.05]);
  const legGeo = k.geo(new THREE.CylinderGeometry(0.055, 0.05, 0.56, 10));
  const hoofGeo = k.geo(new THREE.CylinderGeometry(0.06, 0.065, 0.07, 10));
  const legs: THREE.Group[] = [];
  for (const [x, z] of [
    [-0.3, 0.13],
    [-0.3, -0.13],
    [0.3, 0.13],
    [0.3, -0.13],
  ]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.6, z);
    k.mesh(leg, legGeo, fur, [0, -0.28, 0]);
    k.mesh(leg, hoofGeo, dark, [0, -0.56, 0]);
    body.add(leg);
    legs.push(leg);
  }
  k.mesh(body, k.geo(new THREE.SphereGeometry(0.075, 10, 8)), k.mat(0xfaf7f0), [0.55, 0.92, 0]);

  // neck + head (head group so it can nod)
  k.mesh(body, k.geo(new THREE.CylinderGeometry(0.1, 0.13, 0.45, 12)), fur, [-0.42, 1.06, 0], [0, 0, -0.55]);
  const head = new THREE.Group();
  head.position.set(-0.58, 1.32, 0);
  body.add(head);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.19, 20, 14)), fur, [0, 0, 0]);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.12, 16, 12)), light, [-0.15, -0.06, 0], [0, 0, 0], [1.25, 0.85, 0.95]);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.045, 10, 8)), dark, [-0.29, -0.03, 0]);
  // eyes on the sides of the face, looking towards the viewer
  const eyeGeo = k.geo(new THREE.SphereGeometry(0.032, 10, 8));
  const black = k.mat(0x1d1612, { roughness: 0.3 });
  const eyeList: THREE.Mesh[] = [];
  for (const sz of [-1, 1]) eyeList.push(k.mesh(head, eyeGeo, black, [-0.1, 0.07, sz * 0.15]));
  const earGeo = k.geo(new THREE.ConeGeometry(0.05, 0.16, 10));
  const ears: THREE.Mesh[] = [];
  for (const sz of [-1, 1]) ears.push(k.mesh(head, earGeo, fur, [0.04, 0.12, sz * 0.17], [sz * 1.1, 0, 0.2]));
  // antlers
  const beam = k.geo(new THREE.CylinderGeometry(0.02, 0.028, 0.38, 6));
  const tine = k.geo(new THREE.CylinderGeometry(0.015, 0.02, 0.16, 6));
  for (const sz of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(0.05, 0.16, sz * 0.09);
    a.rotation.set(sz * 0.35, 0, 0.25);
    k.mesh(a, beam, antlerMat, [0, 0.19, 0]);
    k.mesh(a, tine, antlerMat, [-0.06, 0.2, 0], [0, 0, 0.9]);
    k.mesh(a, tine, antlerMat, [0.05, 0.3, 0], [0, 0, -0.8]);
    head.add(a);
  }
  // scarf and bell
  k.mesh(body, k.geo(new THREE.TorusGeometry(0.14, 0.045, 10, 22)), k.mat(0x2f8a4e), [-0.36, 0.98, 0], [Math.PI / 2, 0.55, 0]);
  k.mesh(body, k.geo(new THREE.SphereGeometry(0.05, 12, 10)), k.mat(0xe9b83a, { metalness: 0.6, roughness: 0.3 }), [-0.46, 0.86, 0]);

  const h = hopper(0.55);
  const blink = blinker();
  return {
    group,
    lines: ["Ich trainiere schon für Heiligabend 🦌", "Glöckchen hab ich auch! 🔔", "Darf ich mal am Haus schnuppern?"],
    update(time, reduced) {
      if (reduced) return;
      const hp = h.amount(time);
      body.position.y = hp * 0.3 + Math.sin(time * 2) * 0.01;
      head.rotation.z = Math.sin(time * 0.8) * 0.08 - hp * 0.2;
      head.rotation.x = Math.sin(time * 0.5) * 0.08;
      ears[0].rotation.x = -1.1 + Math.max(0, Math.sin(time * 3.1)) ** 8 * 0.4;
      ears[1].rotation.x = 1.1 - Math.max(0, Math.sin(time * 2.7 + 1)) ** 8 * 0.4;
      // tap a front hoof now and then
      const tap = Math.max(0, Math.sin(time * 1.3)) ** 12;
      legs[0].rotation.z = -tap * 0.5;
      blink(time, eyeList);
    },
    hop: h.hop,
    headTop: (out) => head.localToWorld(out.set(0, 0.6, 0)),
    dispose: k.dispose,
  };
}

// ── penguin ─────────────────────────────────────────────────────────────
function createPenguin(): Character {
  const k = kit();
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const black = k.mat(0x1c2230, { roughness: 0.5 });
  const white = k.mat(0xfbfbf7, { roughness: 0.8 });
  const orange = k.mat(0xf0952a);
  const red = k.mat(0xc8372d);

  k.mesh(body, k.geo(new THREE.SphereGeometry(0.32, 24, 18)), black, [0, 0.46, 0], [0, 0, 0], [1, 1.35, 0.95]);
  k.mesh(body, k.geo(new THREE.SphereGeometry(0.27, 24, 18)), white, [0, 0.42, 0.12], [0, 0, 0], [1, 1.28, 0.65]);
  const head = new THREE.Group();
  head.position.y = 0.98;
  body.add(head);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.22, 24, 18)), black, [0, 0, 0]);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.17, 20, 14)), white, [0, -0.02, 0.1], [0, 0, 0], [1.05, 0.9, 0.75]);
  const eyeList = eyes(k, head, 0.22, 0.32, 0.12);
  k.mesh(head, k.geo(new THREE.ConeGeometry(0.045, 0.12, 10)), orange, [0, -0.06, 0.25], [Math.PI / 2, 0, 0]);
  const cheek = k.mat(0xf2a0a0, { transparent: true, opacity: 0.6 });
  for (const sx of [-1, 1]) k.mesh(head, k.geo(new THREE.SphereGeometry(0.035, 10, 8)), cheek, [sx * 0.11, -0.07, 0.18], [0, 0, 0], [1, 0.6, 0.4]);
  // beanie
  const beanie = new THREE.Group();
  beanie.position.y = 0.06;
  head.add(beanie);
  k.mesh(beanie, k.geo(new THREE.SphereGeometry(0.215, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), red, [0, 0, 0]);
  k.mesh(beanie, k.geo(new THREE.TorusGeometry(0.205, 0.04, 10, 24)), white, [0, 0.02, 0], [Math.PI / 2, 0, 0]);
  k.mesh(beanie, k.geo(new THREE.SphereGeometry(0.07, 12, 10)), white, [0, 0.23, 0]);
  // scarf
  k.mesh(body, k.geo(new THREE.TorusGeometry(0.2, 0.05, 10, 22)), k.mat(0x2f8a4e), [0, 0.8, 0], [Math.PI / 2, 0, 0]);
  // flippers
  const flipGeo = k.geo(new THREE.CapsuleGeometry(0.06, 0.28, 6, 10));
  const flippers: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const f = new THREE.Group();
    f.position.set(sx * 0.3, 0.68, 0);
    k.mesh(f, flipGeo, black, [0, -0.17, 0], [0, 0, 0], [0.7, 1, 1.3]);
    f.rotation.z = sx * 0.25;
    body.add(f);
    flippers.push(f);
  }
  // feet
  for (const sx of [-1, 1]) k.mesh(body, k.geo(new THREE.SphereGeometry(0.09, 12, 8)), orange, [sx * 0.11, 0.03, 0.14], [0, sx * 0.3, 0], [1, 0.4, 1.5]);

  const h = hopper();
  const blink = blinker();
  return {
    group,
    lines: ["Ich bin extra vom Südpol gekommen 🐧", "Hier ist es ja richtig warm!", "Watschel, watschel ✨"],
    update(time, reduced) {
      if (reduced) return;
      const hp = h.amount(time);
      body.position.y = hp * 0.35 + Math.abs(Math.sin(time * 3)) * 0.02;
      body.rotation.z = Math.sin(time * 3) * 0.07;
      const flap = Math.max(0, Math.sin(time * 1.4)) ** 6 * 0.9 + hp * 1.2;
      flippers[0].rotation.z = -0.25 - flap;
      flippers[1].rotation.z = 0.25 + flap;
      head.rotation.y = Math.sin(time * 0.6) * 0.25;
      blink(time, eyeList);
    },
    hop: h.hop,
    headTop: (out) => beanie.localToWorld(out.set(0, 0.42, 0)),
    dispose: k.dispose,
  };
}

// ── robin (tiny, on the roof ridge; hops along it) ──────────────────────
function createRobin(): Character {
  const k = kit();
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const brown = k.mat(0x7a5c48);
  const breast = k.mat(0xe0603e);

  k.mesh(body, k.geo(new THREE.SphereGeometry(0.13, 16, 12)), brown, [0, 0.16, 0], [0, 0, 0], [1, 0.95, 1.15]);
  k.mesh(body, k.geo(new THREE.SphereGeometry(0.11, 16, 12)), breast, [0, 0.14, 0.06], [0, 0, 0], [0.95, 0.95, 0.8]);
  const head = new THREE.Group();
  head.position.set(0, 0.3, 0.04);
  body.add(head);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.085, 14, 10)), brown, [0, 0, 0]);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.06, 12, 10)), breast, [0, -0.025, 0.04]);
  const eyeList = eyes(k, head, 0.085, 0.55, 0.25);
  k.mesh(head, k.geo(new THREE.ConeGeometry(0.018, 0.06, 8)), k.mat(0x3a2a1e), [0, -0.005, 0.1], [Math.PI / 2, 0, 0]);
  k.mesh(body, k.geo(new THREE.BoxGeometry(0.08, 0.02, 0.16)), brown, [0, 0.2, -0.17], [-0.6, 0, 0]);
  const legGeo = k.geo(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 5));
  const legMat = k.mat(0x3a2a1e);
  for (const sx of [-1, 1]) k.mesh(body, legGeo, legMat, [sx * 0.04, 0.03, 0.02]);

  const h = hopper(0.4);
  let nextHop = 1.5;
  let hopAt = -10;
  let fromX = 0;
  let toX = 0;
  return {
    group,
    lines: ["Piep! 🐦", "Ich wohn jetzt auf deinem Dach.", "Piep piep! (Das heißt: Hallo!)"],
    update(time, reduced) {
      if (reduced) return;
      // little hops along the ridge
      if (time > nextHop) {
        fromX = toX;
        toX = THREE.MathUtils.clamp(toX + (Math.random() - 0.5) * 0.8, -0.7, 0.7);
        hopAt = time;
        h.hop(time);
        nextHop = time + 1.2 + Math.random() * 2;
      }
      const hp = h.amount(time);
      const x = THREE.MathUtils.lerp(fromX, toX, Math.min(1, (time - hopAt) / 0.4));
      body.position.set(x, hp * 0.18, 0);
      body.rotation.y = toX < fromX ? -0.5 : 0.5;
      head.rotation.z = Math.sin(time * 2.3) * 0.3;
      blink(time, eyeList);
    },
    hop: h.hop,
    headTop: (out) => head.localToWorld(out.set(0, 0.25, 0)),
    dispose: k.dispose,
  };
  function blink(time: number, list: THREE.Object3D[]) {
    const s = time % 3.3 < 0.12 ? 0.15 : 1;
    for (const e of list) e.scale.y = s;
  }
}

// ── Santa (on the roof, next to the chimney, with his sack) ─────────────
function createSanta(): Character {
  const k = kit();
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const red = k.mat(0xc8372d);
  const white = k.mat(0xfbfaf6, { roughness: 1 });
  const black = k.mat(0x1d1a1a, { roughness: 0.5 });
  const skin = k.mat(0xf6d0b1);
  const gold = k.mat(0xe9b83a, { metalness: 0.6, roughness: 0.3 });

  // boots and legs
  for (const sx of [-1, 1]) {
    k.mesh(body, k.geo(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12)), red, [sx * 0.12, 0.24, 0]);
    k.mesh(body, k.geo(new THREE.SphereGeometry(0.1, 12, 10)), black, [sx * 0.12, 0.08, 0.05], [0, 0, 0], [1, 0.75, 1.4]);
  }
  // coat
  k.mesh(body, k.geo(new THREE.CylinderGeometry(0.27, 0.38, 0.62, 24)), red, [0, 0.64, 0]);
  k.mesh(body, k.geo(new THREE.TorusGeometry(0.37, 0.055, 10, 28)), white, [0, 0.35, 0], [Math.PI / 2, 0, 0]);
  k.mesh(body, k.geo(new THREE.BoxGeometry(0.1, 0.6, 0.04)), white, [0, 0.64, 0.32], [-0.14, 0, 0]);
  k.mesh(body, k.geo(new THREE.CylinderGeometry(0.33, 0.335, 0.08, 24)), black, [0, 0.62, 0]);
  k.mesh(body, k.geo(new THREE.BoxGeometry(0.13, 0.1, 0.03)), gold, [0, 0.62, 0.335]);
  // arms
  const armGeo = k.geo(new THREE.CapsuleGeometry(0.07, 0.3, 6, 10));
  const makeArm = (sx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.3, 0.9, 0);
    k.mesh(pivot, armGeo, red, [0, -0.2, 0]);
    k.mesh(pivot, k.geo(new THREE.TorusGeometry(0.075, 0.03, 8, 16)), white, [0, -0.36, 0], [Math.PI / 2, 0, 0]);
    k.mesh(pivot, k.geo(new THREE.SphereGeometry(0.08, 12, 10)), black, [0, -0.42, 0]);
    pivot.rotation.z = sx * 0.35;
    body.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  // head with a big beard
  const head = new THREE.Group();
  head.position.y = 1.2;
  body.add(head);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.24, 24, 18)), skin, [0, 0, 0]);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.22, 20, 16)), white, [0, -0.15, 0.08], [0, 0, 0], [1.1, 1.05, 0.8]);
  for (const sx of [-1, 1]) k.mesh(head, k.geo(new THREE.SphereGeometry(0.07, 12, 10)), white, [sx * 0.07, -0.05, 0.21], [0, 0, sx * 0.4], [1.4, 0.7, 0.8]);
  k.mesh(head, k.geo(new THREE.SphereGeometry(0.045, 10, 8)), k.mat(0xeea08a), [0, 0, 0.24]);
  const eyeList = eyes(k, head, 0.24, 0.32, 0.25);
  const cheek = k.mat(0xf29a9a, { transparent: true, opacity: 0.7 });
  for (const sx of [-1, 1]) k.mesh(head, k.geo(new THREE.SphereGeometry(0.045, 10, 8)), cheek, [sx * 0.14, 0.0, 0.19], [0, 0, 0], [1, 0.6, 0.4]);
  // hat
  const hat = new THREE.Group();
  hat.position.y = 0.17;
  head.add(hat);
  k.mesh(hat, k.geo(new THREE.TorusGeometry(0.22, 0.06, 10, 26)), white, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const tip = new THREE.Group();
  tip.position.y = 0.02;
  hat.add(tip);
  k.mesh(tip, k.geo(new THREE.ConeGeometry(0.21, 0.42, 20)), red, [0, 0.21, 0]);
  k.mesh(tip, k.geo(new THREE.SphereGeometry(0.07, 12, 10)), white, [0, 0.44, 0]);
  tip.rotation.z = -0.45;
  // sack with a present poking out
  const sack = new THREE.Group();
  sack.position.set(0.6, 0, -0.05);
  group.add(sack);
  const burlap = k.mat(0x9a6b3e, { roughness: 1 });
  k.mesh(sack, k.geo(new THREE.SphereGeometry(0.3, 18, 14)), burlap, [0, 0.3, 0], [0, 0, 0], [0.95, 1.1, 0.9]);
  k.mesh(sack, k.geo(new THREE.CylinderGeometry(0.08, 0.12, 0.12, 12)), burlap, [0, 0.62, 0]);
  k.mesh(sack, k.geo(new THREE.TorusGeometry(0.09, 0.02, 8, 16)), gold, [0, 0.6, 0], [Math.PI / 2, 0, 0]);
  k.mesh(sack, k.geo(new THREE.BoxGeometry(0.16, 0.16, 0.16)), k.mat(0x2f8a4e), [0.03, 0.74, 0], [0.2, 0.4, 0.1]);

  const h = hopper();
  const blink = blinker();
  let nextWave = 1;
  return {
    group,
    lines: ["Ho ho ho! 🎅", "Warst du dieses Jahr brav? Ich glaube schon ❤️", "Psst… gleich muss ich durch den Schornstein."],
    update(time, reduced) {
      if (reduced) return;
      const hp = h.amount(time);
      const laugh = hp > 0 ? Math.sin(time * 30) * 0.03 * hp : 0;
      body.position.y = hp * 0.3;
      body.scale.set(1 - laugh, 1 + laugh, 1 - laugh);
      let wave = 0;
      if (time > nextWave) {
        const w = time - nextWave;
        if (w < 2) wave = Math.sin(Math.min(w / 0.3, 1) * Math.PI * 0.5);
        else nextWave = time + 4 + Math.random() * 3;
      }
      armR.rotation.z = 0.35 + wave * (2.3 + Math.sin(time * 12) * 0.25) + hp * 1.5;
      armL.rotation.z = -0.35 - hp * 1.5;
      tip.rotation.z = -0.45 + Math.sin(time * 1.6) * 0.08;
      head.rotation.z = Math.sin(time * 0.8) * 0.05;
      blink(time, eyeList);
    },
    hop: h.hop,
    headTop: (out) => tip.localToWorld(out.set(0, 0.6, 0)),
    dispose: k.dispose,
  };
}

// ── Nikolaus boots (6 December), filled with treats ─────────────────────
function createBoots(): Character {
  const k = kit();
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const red = k.mat(0xc8372d, { roughness: 0.5 });
  const white = k.mat(0xfbfaf6, { roughness: 1 });
  const orange = k.mat(0xf08a2a, { roughness: 0.8 });
  const goldFoil = k.mat(0xe9b83a, { metalness: 0.7, roughness: 0.25 });
  const stripeW = k.mat(0xffffff);
  const stripeR = k.mat(0xd8343a);

  for (const [sx, rot] of [
    [-0.22, 0.25],
    [0.22, -0.15],
  ] as const) {
    const boot = new THREE.Group();
    boot.position.set(sx, 0, 0);
    boot.rotation.y = rot;
    body.add(boot);
    k.mesh(boot, k.geo(new THREE.CylinderGeometry(0.15, 0.14, 0.5, 18)), red, [0, 0.3, 0]);
    k.mesh(boot, k.geo(new THREE.CapsuleGeometry(0.11, 0.18, 6, 12)), red, [0, 0.1, 0.12], [Math.PI / 2, 0, 0]);
    k.mesh(boot, k.geo(new THREE.TorusGeometry(0.15, 0.05, 10, 22)), white, [0, 0.55, 0], [Math.PI / 2, 0, 0]);
    // treats peeking out
    k.mesh(boot, k.geo(new THREE.SphereGeometry(0.075, 14, 10)), orange, [0.04, 0.6, 0.02]);
    k.mesh(boot, k.geo(new THREE.SphereGeometry(0.05, 12, 10)), goldFoil, [-0.06, 0.6, -0.03]);
    // candy cane: striped stick + hook
    const cane = new THREE.Group();
    cane.position.set(-0.02, 0.55, 0.06);
    cane.rotation.z = 0.15;
    boot.add(cane);
    for (let i = 0; i < 6; i++) {
      k.mesh(cane, k.geo(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10)), i % 2 ? stripeR : stripeW, [0, i * 0.05, 0]);
    }
    k.mesh(cane, k.geo(new THREE.TorusGeometry(0.06, 0.022, 8, 16, Math.PI)), stripeR, [0.06, 0.3, 0]);
  }

  const h = hopper(0.45);
  return {
    group,
    lines: ["Der Nikolaus war da! 🥾", "Orangen, Schoki und Zuckerstangen… alles für dich 🍬"],
    update(time, reduced) {
      if (reduced) return;
      const hp = h.amount(time);
      body.position.y = hp * 0.15;
      body.rotation.z = Math.sin(time * 30) * 0.04 * hp;
    },
    hop: h.hop,
    headTop: (out) => body.localToWorld(out.set(0, 0.95, 0)),
    dispose: k.dispose,
  };
}

export function createVisitor(kind: VisitorKind): Character {
  switch (kind) {
    case "snowman":
      return createSnowman();
    case "reindeer":
      return createReindeer();
    case "penguin":
      return createPenguin();
    case "robin":
      return createRobin();
    case "santa":
      return createSanta();
    case "boots":
      return createBoots();
  }
}

// ── fireworks (1 January) ───────────────────────────────────────────────
export function createFireworks(pixelRatio: number, onBurst?: () => void) {
  const BURSTS = 5;
  const PER = 110;
  const COUNT = BURSTS * PER;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const fades = new Float32Array(COUNT);
  const velocities = new Float32Array(COUNT * 3);
  const base = new Float32Array(COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aFade", new THREE.BufferAttribute(fades, 1));

  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(c);

  // Fades colour and alpha together (with a plain PointsMaterial only the
  // colour would fade, leaving dark specks over the page background).
  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uPixelRatio: { value: pixelRatio } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aFade;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vColor = aColor;
        vFade = aFade;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 11.0 * uPixelRatio * (26.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a * vFade;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  const PALETTE = [0xffd166, 0xff6b8b, 0x8be9fd, 0xb8f28b, 0xffffff, 0xff9f43].map((h) => new THREE.Color(h));
  const ages = new Float32Array(BURSTS).fill(99);
  let nextBurst = 0.3;
  let slot = 0;
  const tmp = new THREE.Vector3();

  const burst = (b: number) => {
    // around the house: to its left, to its right, or just above the roof
    const where = Math.random();
    const origin =
      where < 0.7
        ? new THREE.Vector3(
            (Math.random() < 0.5 ? -1 : 1) * THREE.MathUtils.randFloat(3.4, 5.5),
            THREE.MathUtils.randFloat(5.5, 10.5),
            THREE.MathUtils.randFloat(-5, -3),
          )
        : new THREE.Vector3(THREE.MathUtils.randFloat(-2.2, 2.2), THREE.MathUtils.randFloat(11, 12), -4);
    const col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const speed = THREE.MathUtils.randFloat(3.2, 4.6);
    for (let i = 0; i < PER; i++) {
      const j = (b * PER + i) * 3;
      tmp.randomDirection().multiplyScalar(speed * (0.85 + Math.random() * 0.15));
      positions.set([origin.x, origin.y, origin.z], j);
      velocities.set([tmp.x, tmp.y, tmp.z], j);
      base.set([col.r, col.g, col.b], j);
    }
    ages[b] = 0;
    onBurst?.();
  };

  return {
    points,
    update(dt: number, reduced: boolean) {
      if (reduced) dt = 0;
      nextBurst -= dt;
      if (nextBurst <= 0) {
        burst(slot);
        slot = (slot + 1) % BURSTS;
        nextBurst = THREE.MathUtils.randFloat(0.35, 0.8);
      }
      const drag = Math.pow(0.35, dt);
      for (let b = 0; b < BURSTS; b++) {
        ages[b] += dt;
        const life = ages[b];
        const fade = life < 0.08 ? life / 0.08 : Math.max(0, 1 - (life - 0.08) / 1.8);
        const twinkle = life > 0.9 ? 0.6 + 0.4 * Math.random() : 1;
        for (let i = 0; i < PER; i++) {
          const j = (b * PER + i) * 3;
          velocities[j + 1] -= 1.6 * dt;
          velocities[j] *= drag;
          velocities[j + 1] *= drag;
          velocities[j + 2] *= drag;
          positions[j] += velocities[j] * dt;
          positions[j + 1] += velocities[j + 1] * dt;
          positions[j + 2] += velocities[j + 2] * dt;
          colors[j] = base[j];
          colors[j + 1] = base[j + 1];
          colors[j + 2] = base[j + 2];
          fades[b * PER + i] = fade * twinkle;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aColor.needsUpdate = true;
      geometry.attributes.aFade.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      map.dispose();
    },
  };
}
