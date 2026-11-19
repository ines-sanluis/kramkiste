import * as THREE from "three";

/**
 * Shared three.js snowfall: soft round flakes at different depths that fall,
 * sway and wrap around. Used by the 3D house and the "not yet" teaser.
 */

const FLAKE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uHeight;
  uniform float uBottom;
  uniform float uSizeScale;
  attribute vec3 aSeed; // x: size, y: fall speed, z: phase
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.y = mod(p.y - uBottom - uTime * aSeed.y, uHeight) + uBottom;
    p.x += sin(uTime * 0.6 + aSeed.z) * 0.35 + sin(uTime * 0.23 + aSeed.z * 2.0) * 0.2;
    p.z += cos(uTime * 0.4 + aSeed.z) * 0.15;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSeed.x * uPixelRatio * (uSizeScale / -mv.z);
    vAlpha = clamp(1.2 - (-mv.z) / 40.0, 0.15, 0.95);
  }
`;

const FLAKE_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(1.0, 0.99, 0.95, a);
  }
`;

export type SnowBox = {
  x: [number, number];
  y: [number, number];
  z: [number, number];
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function createSnow(opts: {
  count: number;
  box: SnowBox;
  pixelRatio: number;
  sizeScale?: number;
}) {
  const { count, box, pixelRatio } = opts;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);
  const [z0, z1] = box.z;
  for (let i = 0; i < count; i++) {
    const z = rand(z0, z1);
    pos.set([rand(box.x[0], box.x[1]), rand(box.y[0], box.y[1]), z], i * 3);
    const near = (z - z0) / (z1 - z0); // bigger, faster flakes up front
    seed.set([rand(2.2, 4.2) + near * 2.5, rand(0.35, 0.7) + near * 0.5, rand(0, Math.PI * 2)], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
  const material = new THREE.ShaderMaterial({
    vertexShader: FLAKE_VERTEX,
    fragmentShader: FLAKE_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uHeight: { value: box.y[1] - box.y[0] },
      uBottom: { value: box.y[0] },
      uSizeScale: { value: opts.sizeScale ?? 26 },
    },
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    update(time: number) {
      material.uniforms.uTime.value = time;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
