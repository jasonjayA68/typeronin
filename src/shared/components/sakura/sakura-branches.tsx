"use client";

import { useEffect, useRef } from "react";

/**
 * Sakura branches reaching in from the two upper corners.
 *
 * The companion to the petal field: the petals are born along these branches
 * (see branch-sources.ts), so the blossom now falls FROM something rather than
 * out of an empty sky.
 *
 * Drawn as static SVG, not on the animated canvas — a branch does not move, so
 * redrawing it 60 times a second would be pure waste. The only thing that moves
 * is a few pixels of parallax on the two depth layers, applied as a compositor
 * transform on pointer, and skipped entirely under reduced-motion or a coarse
 * pointer. So it costs one paint at load and a cheap transform thereafter.
 *
 * It sits behind the petals (-z-20 to their -z-10) and is deliberately faint —
 * the same register as the kanji watermark on the page headers. A background is
 * atmosphere; the moment it competes with the content it has failed.
 */

/** A five-petalled blossom, small. `s` scales the whole thing. */
function Blossom({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { cx: Math.cos(a) * 3.1 * s, cy: Math.sin(a) * 3.1 * s };
  });
  return (
    <g transform={`translate(${x} ${y})`}>
      {petals.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={2.3 * s} className="fill-blossom" opacity={0.55} />
      ))}
      <circle cx={0} cy={0} r={1.5 * s} className="fill-sakura" opacity={0.6} />
    </g>
  );
}

/**
 * One corner's branch, in a 260×220 box anchored at the top-left. The right side
 * is the same drawing mirrored, so the two corners are a matched pair without a
 * second set of paths to keep in step.
 */
function BranchArt() {
  return (
    <>
      {/* Limbs — the trunk tapers as it travels, drawn as segments of falling
          stroke width; the offshoots are thinner again. */}
      <g
        className="text-foreground/15 dark:text-foreground/[0.12]"
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M-14 -12 C 46 22, 78 34, 104 60" strokeWidth={8} />
        <path d="M104 60 C 124 78, 138 104, 148 132" strokeWidth={5.5} />
        <path d="M148 132 C 156 152, 164 172, 176 198" strokeWidth={3.5} />

        <path d="M104 60 C 122 46, 148 42, 176 48" strokeWidth={4} />
        <path d="M176 48 C 190 44, 202 46, 214 39" strokeWidth={2} />

        <path d="M124 78 C 132 96, 130 116, 138 136" strokeWidth={3.5} />
        <path d="M138 136 C 146 148, 158 150, 170 145" strokeWidth={1.8} />

        <path d="M78 34 C 92 22, 110 18, 128 20" strokeWidth={2.6} />
        <path d="M128 20 C 140 16, 152 20, 161 13" strokeWidth={1.5} />
      </g>

      {/* Blossoms at the twig ends and a few along the limbs. */}
      <Blossom x={214} y={39} s={1} />
      <Blossom x={176} y={48} s={0.85} />
      <Blossom x={161} y={13} s={0.9} />
      <Blossom x={128} y={20} s={0.8} />
      <Blossom x={170} y={145} s={0.95} />
      <Blossom x={138} y={136} s={0.8} />
      <Blossom x={176} y={198} s={1} />
      <Blossom x={107} y={62} s={0.75} />
    </>
  );
}

/** One corner, positioned and (for the right) mirrored. */
function Corner({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 260 220"
      className={`absolute top-0 h-auto w-[clamp(210px,34vw,440px)] ${
        side === "left" ? "left-0" : "right-0 -scale-x-100"
      }`}
      preserveAspectRatio="xMinYMin meet"
    >
      <BranchArt />
    </svg>
  );
}

export function SakuraBranches() {
  const farRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const far = farRef.current;
    const near = nearRef.current;
    if (!far || !near) return;

    // A branch that swims when you scroll a form is a distraction, not depth.
    // Parallax is desktop-pointer only, and off under reduced motion.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (reduced.matches || !fine.matches) return;

    let frame = 0;
    let nx = 0;
    let ny = 0;

    const apply = () => {
      frame = 0;
      // Near moves more than far — the whole trick of parallax. Small numbers:
      // this is a suggestion of depth, not a diorama.
      far.style.transform = `translate3d(${nx * 6}px, ${ny * 5}px, 0)`;
      near.style.transform = `translate3d(${nx * 15}px, ${ny * 12}px, 0)`;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      nx = event.clientX / window.innerWidth - 0.5;
      ny = event.clientY / window.innerHeight - 0.5;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      {/*
        Two layers for depth. The far one is fainter and nudged down a little so
        its limbs peek out from behind the near one — a set-back second branch.
        The offset uses the `translate` property (Tailwind's translate-y), which
        is independent of the `transform` the parallax writes, so the two never
        fight over one property. Mirroring the right side lives on the SVG itself
        (-scale-x-100), also isolated, for the same reason.
      */}
      <div ref={farRef} className="absolute inset-0 translate-y-3 opacity-55 will-change-transform">
        <Corner side="left" />
        <Corner side="right" />
      </div>
      <div ref={nearRef} className="absolute inset-0 will-change-transform">
        <Corner side="left" />
        <Corner side="right" />
      </div>
    </div>
  );
}
