import * as THREE from "three";

/**
 * A little elf made of simple shapes: green tunic, red hat with a pompom,
 * pointy ears, rosy cheeks and curly shoes with bells.
 *
 * He breathes, blinks, waves now and then, and hops when hop() is called
 * (a door opened, or she tapped him).
 *
 * Outfits: "classic" (green tunic), "tux" (black suit, white shirt, red bow
 * tie) and "gown" (golden dress, pearls). With `glass`, he holds a champagne
 * flute and raises it for a toast every TOAST_PERIOD seconds.
 */

export type ElfOutfit = "classic" | "tux" | "gown";
export const TOAST_PERIOD = 5;
/** Is a toast happening right now (glasses up)? Same clock for every elf. */
export const isToasting = (time: number) => (time % TOAST_PERIOD) > 0.6 && (time % TOAST_PERIOD) < 2.0;

export const ELF_LINES = [
  "Frohe Weihnachten! 🎄",
  "Hast du dein Türchen heute schon aufgemacht?",
  "Ich pass hier auf die Türchen auf 🧝",
  "Psst… ich weiß, was hinter der 24 ist 🤫",
  "Brrr, kalt hier! Aber das Haus ist so schön ✨",
  "Jemand hat dich sehr, sehr lieb ❤️",
  "Ich bin für die Schneeflocken zuständig ❄️",
];

const C = {
  skin: 0xf6d0b1,
  cheek: 0xf29a9a,
  tunic: 0x2f8a4e,
  tunicDark: 0x23703e,
  red: 0xc8372d,
  white: 0xfaf7f0,
  belt: 0x4a2e1a,
  gold: 0xe9b83a,
  eye: 0x2a1d17,
  hair: 0xb8652e,
};

const OUTFITS = {
  classic: {
    tunic: 0x2f8a4e, legs: 0xc8372d, stripe: 0xfaf7f0, shoes: 0x23703e,
    hem: 0xfaf7f0, belt: 0x4a2e1a, buttons: 0xc8372d, collar: 0xc8372d, mittens: 0xc8372d,
  },
  tux: {
    tunic: 0x23232e, legs: 0x23232e, stripe: 0x23232e, shoes: 0x121214,
    hem: 0x23232e, belt: 0x121214, buttons: 0xfaf7f0, collar: 0xfaf7f0, mittens: 0xfaf7f0,
  },
  gown: {
    tunic: 0xd9a93c, legs: 0xfaf7f0, stripe: 0xfaf7f0, shoes: 0xc8372d,
    hem: 0xfff3dc, belt: 0xc8372d, buttons: 0xf6e7b0, collar: 0xfffaf0, mittens: 0xfff3dc,
  },
} as const;

/**
 * mood "party": sways and bobs to the music all the time (New Year's Eve).
 * mood "hungover": the morning after — sleepy eyes, frown, hat in the snow,
 * leaning on the house with one hand and being sick every few seconds.
 */
export type ElfMood = "normal" | "party" | "hungover" | "sleeping";

export function createElf(opts: { outfit?: ElfOutfit; glass?: boolean; mood?: ElfMood } = {}) {
  const mood = opts.mood ?? "normal";
  const hungover = mood === "hungover";
  const sleeping = mood === "sleeping"; // eyes shut, slow deep breaths, no waving
  const outfit = OUTFITS[opts.outfit ?? "classic"];
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

  const skin = mat(C.skin);
  const tunic = mat(outfit.tunic, opts.outfit === "gown" ? { roughness: 0.35, metalness: 0.35 } : {});
  const red = mat(C.red);
  const legsMat = mat(outfit.legs);
  const mittenMat = mat(outfit.mittens);
  const white = mat(C.white, { roughness: 1 });
  const gold = mat(C.gold, { metalness: 0.6, roughness: 0.35 });

  const group = new THREE.Group(); // stays on the ground
  const body = new THREE.Group(); // bobs and hops
  group.add(body);

  // ── legs & shoes ─────────────────────────────────────────────────────
  const legGeo = geo(new THREE.CylinderGeometry(0.065, 0.07, 0.34, 12));
  const stripe = mat(outfit.stripe);
  const shoeGeo = geo(new THREE.SphereGeometry(0.1, 16, 12));
  const tipGeo = geo(new THREE.ConeGeometry(0.045, 0.16, 10));
  const bellGeo = geo(new THREE.SphereGeometry(0.03, 10, 8));
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, legsMat);
    leg.position.set(sx * 0.1, 0.2, 0);
    body.add(leg);
    const band = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.071, 0.071, 0.05, 12)), stripe);
    band.position.set(sx * 0.1, 0.24, 0);
    body.add(band);
    const shoe = new THREE.Mesh(shoeGeo, mat(outfit.shoes));
    shoe.scale.set(1, 0.7, 1.6);
    shoe.position.set(sx * 0.11, 0.06, 0.06);
    body.add(shoe);
    const tip = new THREE.Mesh(tipGeo, mat(outfit.shoes));
    tip.position.set(sx * 0.11, 0.12, 0.24);
    tip.rotation.x = -0.6;
    body.add(tip);
    const bell = new THREE.Mesh(bellGeo, gold);
    bell.position.set(sx * 0.11, 0.19, 0.29);
    body.add(bell);
  }

  // ── tunic, hem, belt ─────────────────────────────────────────────────
  const gown = opts.outfit === "gown";
  const torso = new THREE.Mesh(
    geo(gown ? new THREE.CylinderGeometry(0.19, 0.42, 0.62, 24) : new THREE.CylinderGeometry(0.2, 0.34, 0.56, 20)),
    tunic,
  );
  torso.position.y = 0.62;
  body.add(torso);
  const hem = new THREE.Mesh(
    geo(new THREE.TorusGeometry(gown ? 0.41 : 0.335, gown ? 0.03 : 0.045, 10, 28)),
    mat(outfit.hem, { roughness: 1 }),
  );
  hem.rotation.x = Math.PI / 2;
  hem.position.y = gown ? 0.33 : 0.36;
  body.add(hem);
  const belt = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.265, 0.27, 0.07, 20)), mat(outfit.belt));
  belt.position.y = 0.66;
  body.add(belt);
  const buckle = new THREE.Mesh(geo(new THREE.BoxGeometry(0.11, 0.09, 0.03)), gold);
  buckle.position.set(0, 0.66, 0.265);
  body.add(buckle);
  // buttons (shirt studs on the tux)
  const buttonGeo = geo(new THREE.SphereGeometry(0.025, 8, 6));
  const buttonMat = mat(outfit.buttons);
  if (opts.outfit === "tux") {
    // white shirt front between the lapels, and a red bow tie
    const shirt = new THREE.Mesh(geo(new THREE.BoxGeometry(0.16, 0.26, 0.02)), white);
    shirt.position.set(0, 0.8, 0.205);
    shirt.rotation.x = -0.18;
    body.add(shirt);
    const bowGeo = geo(new THREE.ConeGeometry(0.05, 0.09, 10));
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(bowGeo, red);
      wing.position.set(sx * 0.045, 0.93, 0.19);
      wing.rotation.z = sx * Math.PI / 2;
      body.add(wing);
    }
    const knotTie = new THREE.Mesh(geo(new THREE.SphereGeometry(0.025, 8, 6)), red);
    knotTie.position.set(0, 0.93, 0.2);
    body.add(knotTie);
  }
  for (const y of [0.76, 0.84]) {
    const b = new THREE.Mesh(buttonGeo, buttonMat);
    b.position.set(0, y, 0.215);
    body.add(b);
  }
  const collar = new THREE.Mesh(
    geo(new THREE.TorusGeometry(0.19, gown ? 0.022 : 0.04, 10, 24)),
    gown ? mat(outfit.collar, { roughness: 0.2, metalness: 0.3 }) : mat(outfit.collar),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.9;
  body.add(collar);

  // ── arms (pivot at the shoulder) ─────────────────────────────────────
  const armGeo = geo(new THREE.CapsuleGeometry(0.055, 0.26, 6, 10));
  const mittenGeo = geo(new THREE.SphereGeometry(0.07, 12, 10));
  const makeArm = (sx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.22, 0.86, 0);
    const arm = new THREE.Mesh(armGeo, tunic);
    arm.position.y = -0.17;
    pivot.add(arm);
    const mitten = new THREE.Mesh(mittenGeo, mittenMat);
    mitten.position.y = -0.34;
    pivot.add(mitten);
    pivot.rotation.z = sx * 0.35;
    body.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // champagne flute in the right hand, kept upright
  let flute: THREE.Group | null = null;
  let fluteTip: THREE.Object3D | null = null;
  if (opts.glass) {
    flute = new THREE.Group();
    flute.position.y = -0.34;
    armR.add(flute);
    const glassMat = mat(0xffffff, { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 });
    const bowl = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.055, 0.03, 0.17, 16, 1, true)), glassMat);
    bowl.position.y = 0.2;
    flute.add(bowl);
    const bubbly = new THREE.Mesh(
      geo(new THREE.CylinderGeometry(0.05, 0.028, 0.12, 16)),
      mat(0xf6d36b, { emissive: new THREE.Color(0xc99a2e), emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }),
    );
    bubbly.position.y = 0.17;
    flute.add(bubbly);
    const stem = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8)), glassMat);
    stem.position.y = 0.07;
    flute.add(stem);
    const foot = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 16)), glassMat);
    foot.position.y = 0.02;
    flute.add(foot);
    fluteTip = new THREE.Object3D();
    fluteTip.position.y = 0.3;
    flute.add(fluteTip);
  }

  // ── head ─────────────────────────────────────────────────────────────
  const head = new THREE.Group();
  head.position.y = 1.14;
  body.add(head);
  const face = new THREE.Mesh(geo(new THREE.SphereGeometry(0.27, 24, 18)), skin);
  head.add(face);

  const earGeo = geo(new THREE.ConeGeometry(0.07, 0.24, 10));
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, skin);
    ear.position.set(sx * 0.29, 0.03, -0.02);
    ear.rotation.z = sx * -1.15;
    head.add(ear);
  }

  const eyeGeo = geo(new THREE.SphereGeometry(0.042, 12, 10));
  const glintGeo = geo(new THREE.SphereGeometry(0.013, 8, 6));
  const eyes: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * 0.095, 0.03, 0.235);
    const ball = new THREE.Mesh(eyeGeo, mat(C.eye, { roughness: 0.3 }));
    eye.add(ball);
    const glint = new THREE.Mesh(glintGeo, white);
    glint.position.set(0.012, 0.015, 0.035);
    eye.add(glint);
    head.add(eye);
    eyes.push(eye);
  }
  const cheekGeo = geo(new THREE.SphereGeometry(0.05, 12, 8));
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeo, mat(hungover ? 0xc9d9a0 : C.cheek, { transparent: true, opacity: hungover ? 0.55 : 0.75 }));
    cheek.scale.set(1, 0.6, 0.4);
    cheek.position.set(sx * 0.16, -0.06, 0.21);
    head.add(cheek);
  }
  const nose = new THREE.Mesh(geo(new THREE.SphereGeometry(0.035, 10, 8)), mat(0xf0b593));
  nose.position.set(0, -0.02, 0.27);
  head.add(nose);
  const smile = new THREE.Mesh(geo(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI)), mat(C.eye));
  smile.position.set(0, -0.09, 0.25);
  smile.rotation.z = hungover ? 0 : Math.PI; // upside down = a frown
  if (hungover) smile.position.y = -0.12;
  head.add(smile);
  if (hungover) {
    // dark rings under the eyes
    const bagMat = mat(0x9c7f8f, { transparent: true, opacity: 0.6 });
    for (const sx of [-1, 1]) {
      const bag = new THREE.Mesh(geo(new THREE.SphereGeometry(0.045, 12, 8)), bagMat);
      bag.scale.set(1.1, 0.45, 0.4);
      bag.position.set(sx * 0.095, -0.025, 0.232);
      head.add(bag);
    }
  }
  // a few ginger curls peeking out under the hat
  const curlGeo = geo(new THREE.SphereGeometry(0.06, 10, 8));
  for (const [x, z] of [
    [-0.2, 0.12],
    [-0.08, 0.2],
    [0.08, 0.2],
    [0.2, 0.12],
  ]) {
    const curl = new THREE.Mesh(curlGeo, mat(C.hair));
    curl.position.set(x, 0.17, z);
    head.add(curl);
  }

  // ── hat: three tapering segments so the tip can flop ─────────────────
  const brim = new THREE.Mesh(geo(new THREE.TorusGeometry(0.25, 0.06, 10, 28)), white);
  brim.rotation.x = Math.PI / 2;
  brim.position.y = 0.2;
  head.add(brim);
  const hat1 = new THREE.Group();
  hat1.position.y = 0.2;
  head.add(hat1);
  const seg1 = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.17, 0.26, 0.3, 20)), red);
  seg1.position.y = 0.15;
  hat1.add(seg1);
  const hat2 = new THREE.Group();
  hat2.position.y = 0.3;
  hat1.add(hat2);
  const seg2 = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.08, 0.17, 0.26, 18)), red);
  seg2.position.y = 0.13;
  hat2.add(seg2);
  const hat3 = new THREE.Group();
  hat3.position.y = 0.26;
  hat2.add(hat3);
  const seg3 = new THREE.Mesh(geo(new THREE.ConeGeometry(0.08, 0.22, 16)), red);
  seg3.position.y = 0.11;
  hat3.add(seg3);
  const pompom = new THREE.Mesh(geo(new THREE.SphereGeometry(0.075, 14, 10)), white);
  pompom.position.y = 0.23;
  hat3.add(pompom);
  hat2.rotation.z = -0.35;
  hat3.rotation.z = -0.55;

  // the morning after: hat in the snow, and he's being sick into a puddle
  // (cartoon style: a few green-yellow blobs, every few seconds)
  const blobs: { mesh: THREE.Mesh; t0: number; v: THREE.Vector3; p: THREE.Vector3 }[] = [];
  let puddle: THREE.Mesh | null = null;
  if (hungover) {
    const fallen = new THREE.Group();
    fallen.position.set(-0.45, 0.08, -0.3);
    fallen.rotation.set(0.2, -0.5, -1.45);
    group.add(fallen);
    head.remove(brim, hat1);
    brim.position.set(0, 0, 0);
    hat1.position.set(0, 0, 0);
    fallen.add(brim, hat1);
    // without the hat: a full head of messy ginger hair
    const hairMat = mat(C.hair, { roughness: 0.9 });
    const cap = new THREE.Mesh(geo(new THREE.SphereGeometry(0.29, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42)), hairMat);
    cap.position.y = 0.01;
    cap.rotation.x = -0.18; // a bit further down at the back
    head.add(cap);
    const tuftGeo = geo(new THREE.ConeGeometry(0.05, 0.16, 8));
    for (const [x, y, z, rx, rz] of [
      [0, 0.29, 0.02, 0.2, 0.1],
      [-0.1, 0.27, -0.02, -0.1, 0.7],
      [0.11, 0.26, 0.05, 0.3, -0.8],
      [0.04, 0.26, -0.12, -0.6, -0.3],
      [-0.06, 0.25, 0.12, 0.7, 0.4],
    ] as const) {
      const tuft = new THREE.Mesh(tuftGeo, hairMat);
      tuft.position.set(x, y, z);
      tuft.rotation.set(rx, 0, rz);
      head.add(tuft);
    }
    const sick = mat(0xb7c34a, { roughness: 0.25, metalness: 0.05 });
    puddle = new THREE.Mesh(geo(new THREE.CircleGeometry(0.24, 20)), sick);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(0.02, 0.012, 0.62);
    puddle.scale.set(1.15, 0.8, 1);
    group.add(puddle);
    const blobGeo = geo(new THREE.SphereGeometry(0.035, 8, 6));
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(blobGeo, sick);
      mesh.visible = false;
      group.add(mesh);
      blobs.push({ mesh, t0: -1, v: new THREE.Vector3(), p: new THREE.Vector3() });
    }
  }
  const PUKE_PERIOD = 5.5;
  const mouthLocal = new THREE.Vector3();
  let lastPuke = -1;

  // ── animation ────────────────────────────────────────────────────────
  let hopStart = -10;
  let danceStart = -10;
  const DANCE = 2.6;
  let nextWave = 2.5;
  let nextBlink = 1.5;
  const HOP = 0.6;

  const update = (time: number, reducedMotion: boolean) => {
    if (reducedMotion) {
      body.position.y = 0;
      return;
    }
    const breathe = Math.sin(time * (hungover ? 1.3 : sleeping ? 1.1 : 2.4));
    let y = breathe * 0.012;
    if (mood === "party") y += Math.abs(Math.sin(time * Math.PI * 1.6)) * 0.07; // bobbing to the beat
    let squash = 1;
    let armsUp = 0;

    const s = time - hopStart;
    if (s >= 0 && s < HOP) {
      const k = s / HOP;
      y += Math.sin(Math.PI * k) * 0.45;
      squash = 1 + Math.sin(Math.PI * k) * 0.08;
      armsUp = Math.sin(Math.PI * k);
    }
    // a little dance: bounce, spin once, arms up in turns
    const ds = time - danceStart;
    const dancing = ds >= 0 && ds < DANCE;
    if (dancing) {
      const k = ds / DANCE;
      y += Math.abs(Math.sin(ds * Math.PI * 3)) * 0.18;
      body.rotation.y = (k * k * (3 - 2 * k)) * Math.PI * 2; // one smooth turn
    } else {
      body.rotation.y = 0;
    }
    body.position.y = y;
    body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    if (sleeping) body.scale.x = body.scale.z = 1 + (breathe + 1) * 0.025; // deep breaths
    body.rotation.z = dancing
      ? Math.sin(ds * 9) * 0.12
      : mood === "party"
        ? Math.sin(time * Math.PI * 0.8) * 0.1
        : hungover
          ? Math.sin(time * 0.6) * 0.06 // slow, unsteady sway
          : Math.sin(time * 1.1) * 0.03;
    // the morning after: bent over, every few seconds a big heave
    const ph = time % PUKE_PERIOD;
    const heave = hungover && !dancing ? (ph > 0.5 && ph < 1.7 ? Math.sin(((ph - 0.5) / 1.2) * Math.PI) : 0) : 0;
    body.rotation.x = hungover && !dancing ? 0.22 + heave * 0.22 - (ph < 0.5 ? Math.sin((ph / 0.5) * Math.PI) * 0.08 : 0) : 0;

    // wave every few seconds with the right arm
    let wave = 0;
    if (time > nextWave && !hungover && !sleeping) {
      const w = time - nextWave;
      if (w < 1.6) wave = Math.sin(Math.min(w / 0.25, 1) * Math.PI * 0.5);
      else nextWave = time + 5 + Math.random() * 4;
    }
    const waveWiggle = wave > 0 ? Math.sin(time * 14) * 0.25 * wave : 0;
    if (flute) {
      // raise the glass for a toast, everyone at the same moment
      const ph = time % TOAST_PERIOD;
      const up = ph < 0.6 ? 0 : ph < 0.9 ? (ph - 0.6) / 0.3 : ph < 1.7 ? 1 : ph < 2.0 ? 1 - (ph - 1.7) / 0.3 : 0;
      const e = up * up * (3 - 2 * up);
      armR.rotation.z = 0.5 + e * 1.9 + armsUp * 0.6;
      flute.rotation.z = -armR.rotation.z; // keep it upright
    } else {
      armR.rotation.z = hungover
        ? 1.45 + armsUp * 0.3 // propped against the wall of the house
        : 0.35 + wave * 2.3 + waveWiggle + armsUp * 2.2;
    }
    armL.rotation.z = hungover
      ? -0.3 - armsUp * 0.5 // hand on his tummy
      : -0.35 - armsUp * 2.2 + Math.sin(time * 2.4) * 0.03;
    if (hungover) armL.rotation.x = -0.95;
    if (dancing) {
      const a = Math.sin(ds * 9);
      armL.rotation.z = -0.6 - Math.max(0, a) * 2.2;
      if (!flute) armR.rotation.z = 0.6 + Math.max(0, -a) * 2.2;
    }

    // blink
    let eyeScale = hungover ? 0.32 : 1; // half closed the morning after
    if (time > nextBlink) {
      const b = time - nextBlink;
      if (b < (hungover ? 0.5 : 0.14)) eyeScale = 0.12;
      else nextBlink = time + (hungover ? 1.8 : 2.5) + Math.random() * 3;
    }
    if (sleeping) eyeScale = 0.12;
    for (const e of eyes) e.scale.y = eyeScale;

    // floppy hat and a little head tilt
    if (!hungover) hat2.rotation.z = -0.35 + Math.sin(time * 1.7) * 0.06 - armsUp * 0.2;
    if (!hungover) hat3.rotation.z = -0.55 + Math.sin(time * 1.7 + 0.6) * 0.12 - armsUp * 0.35;
    head.rotation.z = hungover ? 0.1 + Math.sin(time * 0.5) * 0.05 : Math.sin(time * 0.9) * 0.06;
    if (hungover) head.rotation.x = 0.25 + heave * 0.35; // head hanging, more when he heaves

    // the blobs: launched from the mouth during the heave, fall into the puddle
    if (hungover && puddle) {
      const cycle = Math.floor(time / PUKE_PERIOD);
      if (heave > 0.5 && cycle !== lastPuke) {
        lastPuke = cycle;
        group.updateMatrixWorld(true);
        smile.getWorldPosition(mouthLocal);
        group.worldToLocal(mouthLocal);
        blobs.forEach((b, i) => {
          b.t0 = time + i * 0.04;
          b.p.copy(mouthLocal).add(new THREE.Vector3(0, -0.02, 0.05));
          b.v.set((Math.random() - 0.5) * 0.35, 0.15 + Math.random() * 0.3, 0.75 + Math.random() * 0.35);
        });
      }
      for (const b of blobs) {
        const age = time - b.t0;
        if (b.t0 < 0 || age < 0) {
          b.mesh.visible = false;
          continue;
        }
        const x = b.p.x + b.v.x * age;
        const yy = b.p.y + b.v.y * age - 4.9 * age * age;
        const z = b.p.z + b.v.z * age;
        if (yy <= 0.02) {
          b.mesh.visible = false;
          b.t0 = -1;
          continue;
        }
        b.mesh.visible = true;
        b.mesh.position.set(x, yy, z);
        b.mesh.scale.set(1, 1.3, 1);
      }
      const pulse = 1 + Math.max(0, 1 - (time % PUKE_PERIOD - 1.0) / 0.6) * 0.06 * (time % PUKE_PERIOD > 1.0 ? 1 : 0);
      puddle.scale.set(1.15 * pulse, 0.8 * pulse, 1);
    }
    head.rotation.y = Math.sin(time * 0.5) * 0.12;
  };

  const hop = (time: number) => {
    if (time - hopStart > HOP * 0.8) hopStart = time;
  };

  /** A little happy dance (an easter egg: tap the elf three times). */
  const dance = (time: number) => {
    if (time - danceStart > DANCE) danceStart = time;
  };

  /** World position just above the hat, for the speech bubble. */
  const headTop = (out: THREE.Vector3) => {
    if (hungover) {
      head.getWorldPosition(out);
      out.y += 0.55;
      return out;
    }
    pompom.getWorldPosition(out);
    out.y += 0.15;
    return out;
  };

  const dispose = () => {
    for (const d of disposables) d.dispose();
  };

  /** World position of the rim of the glass (for toast sparkles). */
  const glassTop = (out: THREE.Vector3) => (fluteTip ? fluteTip.getWorldPosition(out) : null);

  return { group, update, hop, dance, headTop, glassTop, dispose };
}
