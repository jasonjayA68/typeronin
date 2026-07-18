/**
 * Sakura branches reaching in from the two upper corners.
 *
 * The companion to the petal field: the petals are born along these branches
 * (see branch-sources.ts), so the blossom falls FROM something rather than out
 * of an empty sky.
 *
 * A SINGLE, faint, static layer — no depth-doubling (which read as a branch and
 * its shadow) and no parallax (which pulled the eye while you were trying to
 * read). It sits behind the petals (-z-20 to their -z-10) and is drawn very
 * lightly, fainter than the kanji watermark on the page headers: a background is
 * atmosphere, and the moment it competes with the content it has failed, so this
 * one is barely there.
 */

/** A five-petalled blossom, small and pale. `s` scales the whole thing. */
function Blossom({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { cx: Math.cos(a) * 3.1 * s, cy: Math.sin(a) * 3.1 * s };
  });
  return (
    <g transform={`translate(${x} ${y})`}>
      {petals.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={2.3 * s} className="fill-blossom" opacity={0.28} />
      ))}
      <circle cx={0} cy={0} r={1.5 * s} className="fill-sakura" opacity={0.32} />
    </g>
  );
}

/** One corner's branch, in a 260×220 box anchored at the top-left. */
function BranchArt() {
  return (
    <>
      {/* Limbs — the trunk tapers as it travels; the offshoots are thinner. Kept
          very faint so text near a corner stays perfectly legible over it. */}
      <g
        className="text-foreground/[0.06] dark:text-foreground/[0.08]"
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

/** One corner, positioned and (for the right) mirrored. Smaller than before so
    the branches stay in the corners and out of the content column. */
function Corner({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 260 220"
      className={`absolute top-0 h-auto w-[clamp(170px,26vw,360px)] ${
        side === "left" ? "left-0" : "right-0 -scale-x-100"
      }`}
      preserveAspectRatio="xMinYMin meet"
    >
      <BranchArt />
    </svg>
  );
}

export function SakuraBranches() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <Corner side="left" />
      <Corner side="right" />
    </div>
  );
}
