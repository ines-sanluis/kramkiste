import * as THREE from "three";

/**
 * The very first visit: a big present falls from the sky in front of the
 * empty snowy scene. She taps it, it shakes, the lid flies off, the four
 * walls fall open like petals, it bursts into confetti and the house grows
 * up out of it.
 *
 * This file builds the present and the confetti; Calendar3D runs the show.
 */

export type GiantGift = ReturnType<typeof createGiantGift>;

/** A tall present, `w` × `h` × `d`, whose four walls are hinged at the ground. */
export function createGiantGift(w: number, h: number, d: number) {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const paper = track(new THREE.MeshStandardMaterial({ color: 0xc8372d, roughness: 0.55, transparent: true }));
  const ribbon = track(
    new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.35, transparent: true }),
  );
  const materials = [paper, ribbon];
  const k = w / 3; // bow and ribbons scale with the box
  const T = 0.06 * k; // wall thickness
  const BAND = 0.34 * k;

  const group = new THREE.Group(); // falls, bounces, wobbles
  const walls: { pivot: THREE.Group; axis: "x" | "z"; dir: number }[] = [];

  const addWall = (width: number, axis: "x" | "z", dir: number, pos: THREE.Vector3, rotY: number) => {
    const pivot = new THREE.Group(); // hinge along the bottom edge
    pivot.position.copy(pos);
    pivot.rotation.y = rotY;
    group.add(pivot);
    const panel = new THREE.Mesh(track(new THREE.BoxGeometry(width, h, T)), paper);
    panel.position.y = h / 2;
    pivot.add(panel);
    const band = new THREE.Mesh(track(new THREE.BoxGeometry(BAND, h + 0.01, T + 0.04)), ribbon);
    band.position.y = h / 2;
    pivot.add(band);
    walls.push({ pivot, axis, dir });
  };
  // front & back (span the full width), left & right (fit in between)
  addWall(w, "x", 1, new THREE.Vector3(0, 0, d / 2 - T / 2), 0);
  addWall(w, "x", -1, new THREE.Vector3(0, 0, -d / 2 + T / 2), 0);
  addWall(d - 2 * T, "z", 1, new THREE.Vector3(-w / 2 + T / 2, 0, 0), Math.PI / 2);
  addWall(d - 2 * T, "z", -1, new THREE.Vector3(w / 2 - T / 2, 0, 0), Math.PI / 2);

  // lid with a big bow
  const lid = new THREE.Group();
  lid.position.y = h;
  group.add(lid);
  const LID_H = 0.3 * k;
  const lidBox = new THREE.Mesh(track(new THREE.BoxGeometry(w + 0.15 * k, LID_H, d + 0.15 * k)), paper);
  lidBox.position.y = LID_H / 2;
  lid.add(lidBox);
  for (const [bw, bd] of [
    [BAND, d + 0.16 * k],
    [w + 0.16 * k, BAND],
  ]) {
    const b = new THREE.Mesh(track(new THREE.BoxGeometry(bw, LID_H + 0.02, bd)), ribbon);
    b.position.y = LID_H / 2;
    lid.add(b);
  }
  const loopGeo = track(new THREE.TorusGeometry(0.45 * k, 0.13 * k, 12, 28));
  for (const sx of [-1, 1]) {
    const loop = new THREE.Mesh(loopGeo, ribbon);
    loop.position.set(sx * 0.4 * k, LID_H + 0.4 * k, 0);
    loop.rotation.set(0, Math.PI / 2, sx * 0.55);
    lid.add(loop);
  }
  const tailGeo = track(new THREE.BoxGeometry(0.22 * k, 0.04 * k, 0.8 * k));
  for (const sx of [-1, 1]) {
    const tail = new THREE.Mesh(tailGeo, ribbon);
    tail.position.set(sx * 0.2 * k, LID_H + 0.05 * k, 0.4 * k);
    tail.rotation.set(0.35, sx * 0.45, 0);
    lid.add(tail);
  }
  const knot = new THREE.Mesh(track(new THREE.SphereGeometry(0.2 * k, 16, 12)), ribbon);
  knot.position.y = LID_H + 0.2 * k;
  lid.add(knot);

  return {
    group,
    lid,
    height: h,
    /** 0 = standing, 1 = all four walls flat on the ground. */
    setWalls(k: number) {
      for (const wall of walls) {
        const a = k * (Math.PI / 2 + 0.05);
        if (wall.axis === "x") wall.pivot.rotation.x = wall.dir * a;
        else wall.pivot.rotation.z = wall.dir * a;
      }
    },
    setOpacity(a: number) {
      for (const m of materials) m.opacity = a;
      group.visible = a > 0.01;
    },
    dispose() {
      for (const x of disposables) x.dispose();
    },
  };
}

/** Colourful paper confetti that bursts out, flutters and falls. */
export function createConfetti(count = 220) {
  const geo = new THREE.PlaneGeometry(0.16, 0.1);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.visible = false;
  const colors = [0xf2c14e, 0xc8372d, 0x2f8a4e, 0xfaf7f0, 0xff8fb1, 0x8be9fd].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) mesh.setColorAt(i, colors[i % colors.length]);
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const spin = new Float32Array(count * 3);
  const rot = new Float32Array(count * 3);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  let age = 99;
  const LIFE = 4.5;

  return {
    mesh,
    /** Burst from a box (centre, half-size) outwards and upwards. */
    burst(center: THREE.Vector3, half: THREE.Vector3, strength = 1) {
      for (let i = 0; i < count; i++) {
        const j = i * 3;
        pos[j] = center.x + (Math.random() * 2 - 1) * half.x;
        pos[j + 1] = center.y + (Math.random() * 2 - 1) * half.y;
        pos[j + 2] = center.z + (Math.random() * 2 - 1) * half.z;
        const dx = pos[j] - center.x;
        const dz = pos[j + 2] - center.z;
        vel[j] = (dx * 1.2 + (Math.random() - 0.5) * 4) * strength;
        vel[j + 1] = (4 + Math.random() * 6) * strength;
        vel[j + 2] = (dz * 1.2 + Math.random() * 3) * strength;
        for (let k = 0; k < 3; k++) {
          spin[j + k] = (Math.random() - 0.5) * 12;
          rot[j + k] = Math.random() * Math.PI * 2;
        }
      }
      age = 0;
      mesh.visible = true;
    },
    update(dt: number) {
      if (!mesh.visible) return;
      age += dt;
      const drag = Math.pow(0.4, dt);
      for (let i = 0; i < count; i++) {
        const j = i * 3;
        vel[j + 1] -= 5.5 * dt;
        vel[j] *= drag;
        vel[j + 2] *= drag;
        vel[j + 1] = Math.max(vel[j + 1] * drag, -2.2); // flutter: slow fall
        pos[j] += vel[j] * dt + Math.sin(age * 3 + i) * 0.01;
        pos[j + 1] = Math.max(0.02, pos[j + 1] + vel[j + 1] * dt);
        pos[j + 2] += vel[j + 2] * dt;
        for (let k = 0; k < 3; k++) rot[j + k] += spin[j + k] * dt;
        e.set(rot[j], rot[j + 1], rot[j + 2]);
        q.setFromEuler(e);
        p.set(pos[j], pos[j + 1], pos[j + 2]);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mat.opacity = age < LIFE - 1 ? 1 : Math.max(0, LIFE - age);
      if (age > LIFE) mesh.visible = false;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      mesh.dispose();
    },
  };
}
