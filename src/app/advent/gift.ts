import * as THREE from "three";

/**
 * A wrapped present that can really be opened:
 *   - a hollow box (open top, tissue-paper lining inside) with ribbons
 *   - a separate lid with a bow, which lifts off
 *   - a beam of warm light that pours out of the opening
 *   - the day's icon, which rises up out of the box
 *
 * Calendar3D flies the present out of its niche and drives the stages
 * through the setters below; this file only builds the pieces.
 * Units: the box is 1 wide; the whole group gets scaled.
 */

const PALETTES = [
  { box: 0xc8372d, ribbon: 0xf2c14e },
  { box: 0x2f8a4e, ribbon: 0xfaf7f0 },
  { box: 0xf2c14e, ribbon: 0xc8372d },
  { box: 0xf3e6c8, ribbon: 0xc8372d },
  { box: 0x2b5c8a, ribbon: 0xf2c14e },
];

const BOX_H = 0.78;

function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,214,120,0)");
  g.addColorStop(0.6, "rgba(255,206,110,0.35)");
  g.addColorStop(1, "rgba(255,230,160,0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function iconTexture(icon: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  // soft halo behind the icon
  const halo = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  halo.addColorStop(0, "rgba(255,236,180,0.9)");
  halo.addColorStop(0.5, "rgba(255,206,110,0.35)");
  halo.addColorStop(1, "rgba(255,190,90,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 256, 256);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '150px system-ui, -apple-system, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText(icon, 128, 136);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export type Gift = ReturnType<typeof createGift>;

export function createGift(seed: number, icon: string) {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const p = PALETTES[seed % PALETTES.length];

  const boxMat = track(new THREE.MeshStandardMaterial({ color: p.box, roughness: 0.55, transparent: true }));
  const ribbonMat = track(
    new THREE.MeshStandardMaterial({ color: p.ribbon, roughness: 0.35, metalness: 0.2, transparent: true }),
  );
  const tissueMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfff1d6,
      emissive: new THREE.Color(0xffc46b),
      emissiveIntensity: 0,
      roughness: 0.9,
      side: THREE.BackSide,
      transparent: true,
    }),
  );
  const hidden = track(new THREE.MeshBasicMaterial({ visible: false }));
  const materials = [boxMat, ribbonMat, tissueMat];

  const group = new THREE.Group();

  // ── the box: outside walls without a top, lined with tissue inside ───
  // BoxGeometry face order: +x, -x, +y (top), -y, +z, -z
  const outer = new THREE.Mesh(track(new THREE.BoxGeometry(1, BOX_H, 1)), [
    boxMat,
    boxMat,
    hidden,
    boxMat,
    boxMat,
    boxMat,
  ]);
  outer.position.y = BOX_H / 2;
  group.add(outer);
  // seen from inside (BackSide): the top face is culled, which is the opening
  const lining = new THREE.Mesh(track(new THREE.BoxGeometry(0.96, BOX_H - 0.02, 0.96)), tissueMat);
  lining.position.y = BOX_H / 2 + 0.01;
  group.add(lining);
  // a rim so the walls look like they have thickness
  const rimGeo = track(new THREE.BoxGeometry(1.0, 0.02, 0.03));
  for (let i = 0; i < 4; i++) {
    const rim = new THREE.Mesh(rimGeo, boxMat);
    const a = (i * Math.PI) / 2;
    rim.position.set(Math.sin(a) * 0.485, BOX_H, Math.cos(a) * 0.485);
    rim.rotation.y = a;
    group.add(rim);
  }

  // crumpled tissue paper peeking out of the top (hidden under the lid)
  const tissueGeo = track(new THREE.ConeGeometry(0.16, 0.26, 7));
  const tissueOut = track(
    new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.95, transparent: true, flatShading: true }),
  );
  materials.push(tissueOut);
  for (const [x, z, r, h] of [
    [-0.2, -0.12, 0.35, 1],
    [0.18, -0.15, -0.3, 0.85],
    [0.02, 0.17, 0.15, 0.9],
    [-0.14, 0.2, -0.45, 0.7],
  ]) {
    const tuft = new THREE.Mesh(tissueGeo, tissueOut);
    tuft.position.set(x, BOX_H - 0.04, z);
    tuft.rotation.set(r * 0.6, x * 4, r);
    tuft.scale.set(1, h, 1);
    group.add(tuft);
  }

  // ribbons as plates on the four sides (nothing crosses the opening)
  const bandZ = track(new THREE.BoxGeometry(0.17, BOX_H + 0.005, 0.012));
  const bandX = track(new THREE.BoxGeometry(0.012, BOX_H + 0.005, 0.17));
  for (const s of [-1, 1]) {
    const bz = new THREE.Mesh(bandZ, ribbonMat);
    bz.position.set(0, BOX_H / 2, s * 0.506);
    group.add(bz);
    const bx = new THREE.Mesh(bandX, ribbonMat);
    bx.position.set(s * 0.506, BOX_H / 2, 0);
    group.add(bx);
  }

  // ── the lid with its bow ─────────────────────────────────────────────
  const lid = new THREE.Group();
  lid.position.y = BOX_H;
  group.add(lid);
  // a shallow box itself: walls and top, open underneath, lined inside
  const lidMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.box).multiplyScalar(0.72),
      roughness: 0.6,
      side: THREE.BackSide,
      transparent: true,
    }),
  );
  materials.push(lidMat);
  const lidOuter = new THREE.Mesh(track(new THREE.BoxGeometry(1.08, 0.22, 1.08)), [
    boxMat,
    boxMat,
    boxMat,
    hidden, // no bottom: that's where it fits over the box
    boxMat,
    boxMat,
  ]);
  lidOuter.position.y = 0.09;
  lid.add(lidOuter);
  // seen from inside: its bottom face is culled, which leaves the opening
  const lidInner = new THREE.Mesh(track(new THREE.BoxGeometry(1.04, 0.2, 1.04)), lidMat);
  lidInner.position.y = 0.08;
  lid.add(lidInner);
  // ribbons over the top and down the four sides (nothing underneath)
  const topBandA = track(new THREE.BoxGeometry(0.17, 0.012, 1.09));
  const topBandB = track(new THREE.BoxGeometry(1.09, 0.012, 0.17));
  for (const g of [topBandA, topBandB]) {
    const band = new THREE.Mesh(g, ribbonMat);
    band.position.y = 0.206;
    lid.add(band);
  }
  const sideBandZ = track(new THREE.BoxGeometry(0.17, 0.225, 0.012));
  const sideBandX = track(new THREE.BoxGeometry(0.012, 0.225, 0.17));
  for (const sgn of [-1, 1]) {
    const bz = new THREE.Mesh(sideBandZ, ribbonMat);
    bz.position.set(0, 0.09, sgn * 0.546);
    lid.add(bz);
    const bx = new THREE.Mesh(sideBandX, ribbonMat);
    bx.position.set(sgn * 0.546, 0.09, 0);
    lid.add(bx);
  }
  const loopGeo = track(new THREE.TorusGeometry(0.17, 0.055, 8, 18));
  for (const sx of [-1, 1]) {
    const loop = new THREE.Mesh(loopGeo, ribbonMat);
    loop.position.set(sx * 0.16, 0.36, 0);
    loop.rotation.set(0, Math.PI / 2, sx * 0.6);
    lid.add(loop);
  }
  const tailGeo = track(new THREE.BoxGeometry(0.08, 0.02, 0.3));
  for (const sx of [-1, 1]) {
    const tail = new THREE.Mesh(tailGeo, ribbonMat);
    tail.position.set(sx * 0.1, 0.22, 0.14);
    tail.rotation.set(0.25, sx * 0.4, 0);
    lid.add(tail);
  }
  const knot = new THREE.Mesh(track(new THREE.SphereGeometry(0.09, 12, 10)), ribbonMat);
  knot.position.y = 0.3;
  lid.add(knot);

  // ── light pouring out, and the icon rising ───────────────────────────
  const beamMat = track(
    new THREE.MeshBasicMaterial({
      map: track(beamTexture()),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const beam = new THREE.Mesh(track(new THREE.CylinderGeometry(0.7, 0.44, 1.5, 32, 1, true)), beamMat);
  beam.position.y = BOX_H + 0.75;
  beam.visible = false;
  group.add(beam);

  const iconMat = track(
    new THREE.SpriteMaterial({ map: track(iconTexture(icon)), transparent: true, opacity: 0, depthWrite: false }),
  );
  const iconSprite = new THREE.Sprite(iconMat);
  iconSprite.position.y = 0.3;
  iconSprite.scale.setScalar(0.5);
  iconSprite.renderOrder = 2;
  group.add(iconSprite);

  const ease = {
    outCubic: (x: number) => 1 - (1 - x) ** 3,
    outBack: (x: number) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2,
  };

  return {
    group,
    /** Height of the opening, in the gift's own units. */
    openingY: BOX_H,

    /** 0 = closed; 1 = lid lifted off and floated aside. */
    setLid(k: number) {
      const lift = ease.outBack(Math.min(k / 0.55, 1));
      const drift = Math.max(0, (k - 0.55) / 0.45);
      lid.position.set(-drift * 0.55, BOX_H + lift * 0.5 + drift * 0.25, -drift * 0.15);
      lid.rotation.set(-lift * 0.2 - drift * 0.2, 0, lift * 0.3 + drift * 0.25);
    },

    /** 0..1: the inside starts to glow and light pours out. */
    setGlow(k: number) {
      tissueMat.emissiveIntensity = k * 0.9;
      beam.visible = k > 0;
      beamMat.opacity = k * 0.5;
      beam.scale.set(0.9 + k * 0.1, 0.3 + k * 0.7, 0.9 + k * 0.1);
      beam.position.y = BOX_H + 0.75 * beam.scale.y;
    },

    /** 0..1: the icon rises out of the box and grows. `t` adds a gentle bob. */
    setIcon(k: number, t: number) {
      const e = ease.outCubic(k);
      iconMat.opacity = Math.min(1, k * 2.5);
      iconSprite.position.y = 0.3 + e * 1.35 + Math.sin(t * 3) * 0.03 * e;
      iconSprite.scale.setScalar(0.5 + e * 0.75);
      iconMat.rotation = Math.sin(t * 2.2) * 0.06 * e;
    },

    setOpacity(a: number) {
      for (const m of materials) m.opacity = a;
      iconMat.opacity = Math.min(iconMat.opacity, a);
      beamMat.opacity = Math.min(beamMat.opacity, a * 0.5);
    },

    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

/** A burst of golden sparkles that fly out and fade. */
export function createSparkles() {
  const COUNT = 80;
  const positions = new Float32Array(COUNT * 3);
  const velocities = new Float32Array(COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,226,140,0.9)");
  grad.addColorStop(1, "rgba(255,200,80,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(c);

  const material = new THREE.PointsMaterial({
    size: 0.045, // world units (three.js already accounts for the pixel ratio)
    map,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  let age = 99;
  const LIFE = 1.6;

  return {
    points,
    /** Sparkles fountain upwards out of `origin`. */
    burst(origin: THREE.Vector3, strength = 1) {
      const v = new THREE.Vector3();
      for (let i = 0; i < COUNT; i++) {
        positions.set([origin.x, origin.y, origin.z], i * 3);
        v.randomDirection();
        v.y = Math.abs(v.y) * 1.6 + 0.6; // mostly upwards, like out of a box
        v.multiplyScalar((0.6 + Math.random() * 1.2) * strength);
        velocities.set([v.x, v.y, v.z], i * 3);
      }
      geometry.attributes.position.needsUpdate = true;
      age = 0;
      points.visible = true;
    },
    update(dt: number) {
      if (!points.visible) return;
      age += dt;
      const drag = Math.pow(0.3, dt);
      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;
        velocities[j + 1] -= 1.4 * dt;
        velocities[j] *= drag;
        velocities[j + 1] *= drag;
        velocities[j + 2] *= drag;
        positions[j] += velocities[j] * dt;
        positions[j + 1] += velocities[j + 1] * dt;
        positions[j + 2] += velocities[j + 2] * dt;
      }
      geometry.attributes.position.needsUpdate = true;
      material.opacity = age < 0.15 ? age / 0.15 : Math.max(0, 1 - (age - 0.15) / (LIFE - 0.15));
      if (age > LIFE) points.visible = false;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      map.dispose();
    },
  };
}
