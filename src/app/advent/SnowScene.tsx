"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { createSnow } from "./snow";

/**
 * Full-screen three.js layer behind the calendar:
 *   - snowflakes at different depths (near ones bigger, faster, brighter)
 *   - a few soft golden bokeh lights far in the back
 *   - parallax: the camera drifts with the mouse, with scrolling, and with
 *     the phone's tilt where the browser allows it without a prompt
 *
 * Loaded lazily (see SnowLayer) so three.js only ships on /advent.
 * If WebGL isn't available it renders nothing and the CSS gradient remains.
 */

const BOKEH_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute vec3 aSeed; // x: size, y: drift speed, z: phase
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * aSeed.y + aSeed.z) * 0.8;
    p.y += cos(uTime * aSeed.y * 0.7 + aSeed.z) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSeed.x * uPixelRatio * (18.0 / -mv.z);
    vTwinkle = 0.65 + 0.35 * sin(uTime * 0.8 + aSeed.z * 3.0);
  }
`;

const BOKEH_FRAGMENT = /* glsl */ `
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * 0.3 * vTwinkle;
    if (a < 0.005) discard;
    gl_FragColor = vec4(0.95, 0.76, 0.31, a);
  }
`;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function SnowScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      return; // no WebGL: keep the plain CSS background
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 10);

    // ── Snowflakes ───────────────────────────────────────────────────────
    const snow = createSnow({
      count: window.innerWidth < 640 ? 420 : 750,
      box: { x: [-16, 16], y: [-13, 13], z: [-24, 7] },
      pixelRatio,
    });
    scene.add(snow.points);

    // ── Golden bokeh lights in the back ──────────────────────────────────
    const bokehCount = 16;
    const bokehPos = new Float32Array(bokehCount * 3);
    const bokehSeed = new Float32Array(bokehCount * 3);
    for (let i = 0; i < bokehCount; i++) {
      bokehPos.set([rand(-14, 14), rand(-11, 11), rand(-22, -12)], i * 3);
      bokehSeed.set([rand(60, 130), rand(0.05, 0.15), rand(0, Math.PI * 2)], i * 3);
    }
    const bokehGeo = new THREE.BufferGeometry();
    bokehGeo.setAttribute("position", new THREE.BufferAttribute(bokehPos, 3));
    bokehGeo.setAttribute("aSeed", new THREE.BufferAttribute(bokehSeed, 3));
    const bokehMat = new THREE.ShaderMaterial({
      vertexShader: BOKEH_VERTEX,
      fragmentShader: BOKEH_FRAGMENT,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const bokeh = new THREE.Points(bokehGeo, bokehMat);
    bokeh.frustumCulled = false;
    bokeh.renderOrder = -1;
    scene.add(bokeh);

    // ── Parallax input ───────────────────────────────────────────────────
    const target = { x: 0, y: 0 };
    let tilt = { x: 0, y: 0 };
    let pointer = { x: 0, y: 0 };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    // Android & desktop browsers deliver tilt without asking; iOS would need a
    // permission prompt, which we skip on purpose (scroll parallax still works).
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tilt = {
        x: THREE.MathUtils.clamp(e.gamma / 30, -1, 1),
        y: THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1),
      };
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    const orientationNeedsPermission =
      typeof DeviceOrientationEvent !== "undefined" &&
      "requestPermission" in DeviceOrientationEvent;
    if (!orientationNeedsPermission) {
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
    }

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (reducedMotion) renderFrame(0);
    };
    window.addEventListener("resize", onResize);

    // ── Loop ─────────────────────────────────────────────────────────────
    let last = performance.now();
    let elapsed = 0;
    let raf = 0;

    function renderFrame(dt: number) {
      elapsed += dt;
      snow.update(elapsed);
      bokehMat.uniforms.uTime.value = elapsed;

      const scroll = window.scrollY / Math.max(window.innerHeight, 1);
      target.x = pointer.x * 1.4 + tilt.x * 1.6;
      target.y = -pointer.y * 0.9 - tilt.y * 1.0 - scroll * 2.2;

      const ease = reducedMotion ? 1 : 1 - Math.pow(0.001, dt); // frame-rate independent
      camera.position.x += (target.x - camera.position.x) * ease;
      camera.position.y += (target.y - camera.position.y) * ease;
      camera.lookAt(0, camera.position.y * 0.35, -14);

      renderer.render(scene, camera);
    }

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (document.hidden) return;
      renderFrame(dt);
    };

    const onScrollStill = () => renderFrame(0);
    if (reducedMotion) {
      elapsed = 12; // a nicely spread-out still frame
      renderFrame(0);
      window.addEventListener("scroll", onScrollStill, { passive: true });
    } else {
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScrollStill);
      snow.dispose();
      bokehGeo.dispose();
      bokehMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}
