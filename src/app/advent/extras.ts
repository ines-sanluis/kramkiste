import * as THREE from "three";

/**
 * Little extras for the advent house:
 *   - the countdown sign on the front wall ("Noch 5 Tage, dann bin ich wieder da")
 *   - a shooting star (hidden surprise: tap the moon)
 *   - chimney smoke puffs (hidden surprise: tap the chimney)
 */

// ── countdown sign ──────────────────────────────────────────────────────
/** From this day on the sign shows how long until you're back. */
export const COUNTDOWN_FROM = "2026-12-22";

/** Short, so it's readable on a phone; the elf says the full sentence. */
export function countdownText(daysLeft: number): string {
  if (daysLeft <= 0) return "Heute!";
  if (daysLeft === 1) return "Noch 1 Tag";
  return `Noch ${daysLeft} Tage`;
}

/** A wooden plank with a snowy top edge, `width` × 0.5, text on the front. */
export function createCountdownSign(text: string, width: number, anisotropy: number) {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  const W = 1024;
  const H = Math.round((W * 0.5) / width);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  // wood with a few grain lines
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#d6a46a");
  g.addColorStop(1, "#b98552");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(80,45,20,0.18)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = (H / 8) * (i + 1) + Math.sin(i * 2.1) * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W * 0.3, y + 6, W * 0.6, y - 6, W, y + 2);
    ctx.stroke();
  }
  // carved-looking text
  let size = Math.round(H * 0.62);
  const font = (px: number) => `800 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.font = font(size);
  while (ctx.measureText(text).width > W * 0.9 && size > 20) {
    size -= 2;
    ctx.font = font(size);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,240,215,0.35)";
  ctx.fillText(text, W / 2, H / 2 + 3);
  ctx.fillStyle = "#4a2a12";
  ctx.fillText(text, W / 2, H / 2);
  const map = track(new THREE.CanvasTexture(c));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;

  const wood = track(new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.9 }));
  const front = track(new THREE.MeshStandardMaterial({ map, roughness: 0.85 }));
  const group = new THREE.Group();
  const board = new THREE.Mesh(track(new THREE.BoxGeometry(width, 0.5, 0.05)), [
    wood,
    wood,
    wood,
    wood,
    front,
    wood,
  ]);
  group.add(board);
  const snowCap = new THREE.Mesh(
    track(new THREE.BoxGeometry(width + 0.04, 0.05, 0.09)),
    track(new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 1 })),
  );
  snowCap.position.set(0, 0.27, 0.01);
  group.add(snowCap);
  const nailGeo = track(new THREE.SphereGeometry(0.025, 8, 6));
  const nailMat = track(new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.6, roughness: 0.4 }));
  for (const sx of [-1, 1]) {
    const nail = new THREE.Mesh(nailGeo, nailMat);
    nail.position.set(sx * (width / 2 - 0.08), 0, 0.03);
    group.add(nail);
  }
  return {
    group,
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

// ── shooting star ───────────────────────────────────────────────────────
export function createShootingStar() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 16;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.85, "rgba(255,246,220,0.7)");
  g.addColorStop(1, "rgba(255,255,255,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 16);
  const map = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const LENGTH = 7;
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(LENGTH, 0.22), mat);
  streak.visible = false;
  streak.renderOrder = -1;
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  let start = -10;
  const DURATION = 1.1;

  return {
    mesh: streak,
    /** Fly from `a` to `b` (world positions far behind the house). */
    trigger(a: THREE.Vector3, b: THREE.Vector3, time: number) {
      from.copy(a);
      to.copy(b);
      start = time;
      const dir = new THREE.Vector3().subVectors(b, a);
      streak.rotation.set(0, 0, Math.atan2(dir.y, dir.x));
      streak.visible = true;
    },
    update(time: number) {
      const s = (time - start) / DURATION;
      if (s < 0 || s > 1) {
        streak.visible = false;
        return;
      }
      const e = 1 - (1 - s) ** 2;
      // the streak's bright head leads; it lies along the direction of travel
      streak.position.lerpVectors(from, to, e);
      streak.position.addScaledVector(new THREE.Vector3().subVectors(to, from).normalize(), -LENGTH / 2);
      mat.opacity = Math.sin(Math.PI * s);
    },
    dispose() {
      streak.geometry.dispose();
      mat.dispose();
      map.dispose();
    },
  };
}

// ── chimney smoke ───────────────────────────────────────────────────────
export function createChimneySmoke() {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.16, 12, 10);
  const puffs: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; delay: number; drift: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xeef1f4,
      roughness: 1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    group.add(mesh);
    puffs.push({ mesh, mat, delay: i * 0.18, drift: (Math.random() - 0.5) * 0.6 });
  }
  let start = -10;
  const LIFE = 2.2;

  return {
    group,
    puff(time: number) {
      start = time;
    },
    update(time: number) {
      for (const p of puffs) {
        const s = (time - start - p.delay) / LIFE;
        if (s < 0 || s > 1) {
          p.mesh.visible = false;
          continue;
        }
        p.mesh.visible = true;
        p.mesh.position.set(p.drift * s + Math.sin(s * 6 + p.delay * 10) * 0.08, s * 2.2, 0);
        p.mesh.scale.setScalar(0.6 + s * 1.8);
        p.mat.opacity = Math.sin(Math.PI * Math.min(s * 1.6, 1)) * 0.75 * (1 - s * 0.6);
      }
    },
    dispose() {
      geo.dispose();
      for (const p of puffs) p.mat.dispose();
    },
  };
}
