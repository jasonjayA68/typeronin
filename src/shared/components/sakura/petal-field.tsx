"use client";

import { useEffect, useRef } from "react";

import { EMIT_SOURCES } from "@/shared/components/sakura/branch-sources";
import { usePetalDensity } from "@/shared/components/sakura/petal-context";

/**
 * Cherry blossom drifting across the whole app.
 *
 * Canvas, not DOM nodes: ~40 animated elements would each need layout and paint
 * every frame, and the compositor cannot help because they change shape as well
 * as position. One canvas is one paint.
 *
 * Rules it keeps:
 *  - prefers-reduced-motion: renders nothing at all, and never starts a loop.
 *  - Hidden tab: rAF is already throttled, but we stop entirely so a background
 *    tab costs nothing.
 *  - DPR-aware, capped at 2 — beyond that we are shading pixels nobody can see.
 */

type Petal = {
  x: number;
  y: number;
  /** Half-width in px. */
  size: number;
  /** Downward drift, px/sec. */
  fall: number;
  /** Sideways sway amplitude. */
  sway: number;
  /** Where the petal is in its own sway cycle. */
  phase: number;
  /** Radians/sec of tumble. */
  spin: number;
  rotation: number;
  /** 0-1, its own opacity. */
  alpha: number;
  /** Parallax depth, 0 (far) to 1 (near). Drives size, speed and cursor pull. */
  depth: number;
  /** Which of the three petal tones this one wears (index into `tones`). */
  tone: number;
};

// Kept low: the petals are Layer 5, felt not watched. A quiet drift, not a storm.
const MAX_PETALS = 30;

/** A five-lobed blossom would be too busy at 8px; one lobe reads better. */
function drawPetal(ctx: CanvasRenderingContext2D, petal: Petal, tones: string[]) {
  const { size } = petal;
  ctx.save();
  ctx.translate(petal.x, petal.y);
  ctx.rotate(petal.rotation);
  ctx.globalAlpha = petal.alpha;
  ctx.fillStyle = tones[petal.tone] ?? tones[0];

  // A single petal: two arcs meeting at a soft point, with a notched tip.
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.9, -size * 0.5, size * 0.7, size * 0.7, 0, size);
  ctx.bezierCurveTo(-size * 0.7, size * 0.7, -size * 0.9, -size * 0.5, 0, -size);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function makePetal(width: number, height: number, seeded: boolean): Petal {
  const depth = Math.random();

  // Seeded petals fill the whole field so it is already alive on first paint.
  // Every petal after that is born at a branch: pick one of the corner sources
  // and jitter around it, so the blossom drifts down FROM the branches rather
  // than in from an empty top edge.
  let x: number;
  let y: number;
  if (seeded) {
    x = Math.random() * width;
    y = Math.random() * height;
  } else {
    const source = EMIT_SOURCES[(Math.random() * EMIT_SOURCES.length) | 0];
    x = source.fx * width + (Math.random() - 0.5) * width * 0.1;
    y = source.fy * height + (Math.random() - 0.5) * height * 0.05;
  }

  return {
    x,
    y,
    size: 3 + depth * 5,
    fall: 14 + depth * 32,
    sway: 8 + depth * 26,
    phase: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.2,
    rotation: Math.random() * Math.PI * 2,
    // 40–70% opacity per the spec: present enough to read, faint enough to stay
    // beneath the interface. The paler tones lean more transparent.
    alpha: 0.4 + depth * 0.3,
    depth,
    // Weighted toward the mid pink; the palest tone is the rarest, like real fall.
    tone: [0, 0, 1, 1, 2][(Math.random() * 5) | 0],
  };
}

export function PetalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const density = usePetalDensity();

  /**
   * Mirrored into a ref so the animation loop can read the latest density
   * without the effect re-running — restarting the loop on every gust would
   * reseed the field and make the petals jump.
   */
  const densityRef = useRef(density);
  useEffect(() => {
    densityRef.current = density;
  }, [density]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let petals: Petal[] = [];
    let frame = 0;
    let last = performance.now();

    // Cursor influence, in canvas space. -1 means "no cursor yet".
    const pointer = { x: -1, y: -1 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      // Backing store only. The CSS size is left to the `w-full h-full` classes
      // on a `fixed inset-0` element, so it can never be anything but the
      // viewport.
      //
      // It used to also set style.width/height in pixels from innerWidth. On a
      // page that scrolled sideways for any reason, that pinned the canvas to
      // the *wider* value — and because a fixed element that wide keeps the
      // document that wide, the overflow could not then resolve itself. It
      // presented as "the petal canvas is 48px too wide", which looks like a
      // canvas bug and is really a feedback loop.
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (petals.length === 0) {
        petals = Array.from({ length: MAX_PETALS }, () => makePetal(width, height, true));
      }
    };

    // The three petal tones come from the theme tokens, so night petals glow the
    // right pink rather than white. Petals store a tone INDEX, so a theme swap
    // just refills this array and every petal recolours for free.
    let tones = ["#f29dba", "#f7bfd1", "#ffd9e7"];
    const readTones = () => {
      const s = getComputedStyle(document.documentElement);
      const next = ["--tree-b1", "--tree-b2", "--tree-b3"].map((v) => s.getPropertyValue(v).trim());
      if (next.every(Boolean)) tones = next;
    };

    const step = (now: number) => {
      // Seconds, clamped: a backgrounded tab returns a vast delta that would
      // teleport every petal to the bottom of the screen.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      ctx.clearRect(0, 0, width, height);

      // Fewer petals on a small screen — a phone should not be cluttered.
      const mobileFactor = width < 640 ? 0.45 : 1;
      const active = Math.round(MAX_PETALS * densityRef.current * mobileFactor);

      for (let i = 0; i < petals.length; i++) {
        const petal = petals[i];

        // Fade petals beyond the current density out rather than popping them.
        const wanted = i < active;
        const target = wanted ? 0.4 + petal.depth * 0.3 : 0;
        petal.alpha += (target - petal.alpha) * Math.min(1, dt * 3);
        if (petal.alpha < 0.01 && !wanted) continue;

        petal.phase += dt * 0.9;
        petal.y += petal.fall * dt;
        petal.x += Math.sin(petal.phase) * petal.sway * dt;
        petal.rotation += petal.spin * dt;

        // Cursor pushes petals aside — nearer petals feel it more.
        if (pointer.x >= 0) {
          const dx = petal.x - pointer.x;
          const dy = petal.y - pointer.y;
          const distanceSq = dx * dx + dy * dy;
          const radius = 120;
          if (distanceSq < radius * radius && distanceSq > 0.01) {
            const distance = Math.sqrt(distanceSq);
            const push = (1 - distance / radius) * 42 * (0.4 + petal.depth);
            petal.x += (dx / distance) * push * dt;
            petal.y += (dy / distance) * push * dt;
          }
        }

        // Recycle rather than allocate.
        if (petal.y - petal.size > height) {
          Object.assign(petal, makePetal(width, height, false));
        } else if (petal.x < -30) {
          petal.x = width + 20;
        } else if (petal.x > width + 30) {
          petal.x = -20;
        }

        drawPetal(ctx, petal, tones);
      }

      frame = requestAnimationFrame(step);
    };

    const start = () => {
      last = performance.now();
      frame = requestAnimationFrame(step);
    };
    const stop = () => cancelAnimationFrame(frame);

    const onPointerMove = (event: PointerEvent) => {
      // Coarse pointers have no hover; the "push" would fire on tap and look
      // like a glitch.
      if (event.pointerType !== "mouse") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onPointerLeave = () => {
      pointer.x = -1;
      pointer.y = -1;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onReducedChange = () => {
      if (reduced.matches) {
        stop();
        ctx.clearRect(0, 0, width, height);
      } else {
        start();
      }
    };

    readTones();
    resize();
    start();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onReducedChange);

    // The theme toggle swaps --blossom underneath us.
    const themeObserver = new MutationObserver(readTones);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onReducedChange);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
