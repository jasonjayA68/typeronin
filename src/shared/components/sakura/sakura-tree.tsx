/**
 * The sakura accent — a slim, quiet frame on the far left.
 *
 * Deliberately minimal. It used to be one big tree arcing across the whole
 * viewport; that competed with the content. This is a single slim trunk hugging
 * the left edge, one small branch reaching a little way in near the top, and a
 * few soft blossom clusters. Nothing crosses the reading column, and it is faint
 * enough to sit beneath every surface.
 *
 * Static geometry, drawn once and referenced by both viewports via <use>, so it
 * costs nothing per frame — the falling petals are the only animated layer
 * (petal-field.tsx), and they are born from this branch. Colours come from the
 * --tree-* tokens, so it themes for free.
 */

/** Deterministic PRNG — seeded, so the blossom scatter is identical every render. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bez = (t: number, a: number, b: number, c: number, d: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};
const dbez = (t: number, a: number, b: number, c: number, d: number) => {
  const u = 1 - t;
  return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c);
};

// [p0x,p0y, c1x,c1y, c2x,c2y, p1x,p1y, w0, w1]
type Ribbon = readonly [number, number, number, number, number, number, number, number, number, number];

/** A tapered filled ribbon along a cubic bezier — one path, smooth thick→thin. */
function ribbon(B: Ribbon): string {
  const [ax, ay, c1x, c1y, c2x, c2y, bx, by, w0, w1] = B;
  const steps = 20;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = bez(t, ax, c1x, c2x, bx);
    const y = bez(t, ay, c1y, c2y, by);
    let dx = dbez(t, ax, c1x, c2x, bx);
    let dy = dbez(t, ay, c1y, c2y, by);
    const m = Math.hypot(dx, dy) || 1;
    dx /= m;
    dy /= m;
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push(`${(x - dy * w).toFixed(1)} ${(y + dx * w).toFixed(1)}`);
    right.push(`${(x + dy * w).toFixed(1)} ${(y - dx * w).toFixed(1)}`);
  }
  return `M${left[0]}${left.slice(1).map((p) => `L${p}`).join("")}${right
    .reverse()
    .map((p) => `L${p}`)
    .join("")}Z`;
}

// Drawn in a 1600×1000 box, anchored bottom-left over the viewport.
//
// A slim trunk hugging the far-left edge, most of it off-canvas — only a narrow
// sliver shows. It rises the full height with a gentle lean.
const TRUNK_FILL = "M-140 1030 L44 1030 C58 720 40 380 70 40 L-140 40 Z";
const TRUNK_EDGE: Ribbon = [44, 1030, 58, 720, 46, 360, 70, 40, 7, 3];
const TRUNK_LINES: Ribbon[] = [
  [20, 1030, 34, 700, 16, 380, 40, 60, 2, 1],
];

// ONE small branch, leaving the trunk near the top and reaching only a little way
// in — it stays well clear of the content column.
const BRANCH: Ribbon[] = [
  [58, 150, 130, 118, 200, 108, 268, 120, 14, 8],
  [268, 120, 320, 128, 360, 150, 396, 190, 8, 3],
];
// A couple of short offshoots that lift the blossom off the branch.
const TWIGS: Ribbon[] = [
  [150, 116, 158, 88, 154, 70, 164, 50, 3.5, 1.5],
  [300, 126, 310, 98, 306, 80, 316, 60, 3.5, 1.5],
];

// Blossom clusters: [cx, cy, radius, density]. A soft touch near the trunk and
// along the little branch — subtle, never a mass.
type Pocket = readonly [number, number, number, number];
const POCKETS: readonly Pocket[] = [
  [70, 78, 40, 0.7],
  [150, 96, 44, 0.75],
  [232, 108, 46, 0.7],
  [300, 128, 44, 0.7],
  [372, 176, 40, 0.6],
];

type Dot = { cx: string; cy: string; r: string };

const TONES = ["var(--tree-b1)", "var(--tree-b2)", "var(--tree-b3)"] as const;

/** A circle as path data, so many share one <path>. */
function circleData(cx: number, cy: number, r: number): string {
  const x = Math.round(cx - r);
  const y = Math.round(cy);
  const d = Math.round(r * 2);
  const rr = Math.round(r * 10) / 10;
  return `M${x} ${y}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 ${-d} 0`;
}

/**
 * Build the blossom clusters: a faint backing mass, then small hand-shaped
 * blossoms batched into one path per tone (plus one for the pale centres). One
 * seeded stream, so the scatter is identical on server and client — a random
 * tree would hydrate into a different tree and React would say so.
 */
function buildCanopy() {
  const rnd = mulberry32(7);
  const back: Dot[] = [];
  const petals: string[] = ["", "", ""];
  let centers = "";

  for (const [cx, cy, R, dens] of POCKETS) {
    const bk = 3 + ((rnd() * 2) | 0);
    for (let i = 0; i < bk; i++) {
      const a = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * R * 0.7;
      back.push({
        cx: (cx + Math.cos(a) * rad).toFixed(1),
        cy: (cy + Math.sin(a) * rad * 0.85).toFixed(1),
        r: (7 + rnd() * 8).toFixed(1),
      });
    }

    const n = Math.round((14 + rnd() * 8) * dens);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * R;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad * 0.85;
      const s = (0.8 + rnd() * 0.6) * dens;
      const up = -(y - cy) / R;
      const tone = up > 0.3 && rnd() < 0.6 ? 2 : rnd() < 0.5 ? 0 : 1;

      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 - Math.PI / 2;
        petals[tone] += circleData(x + Math.cos(pa) * 3 * s, y + Math.sin(pa) * 3 * s, 2.3 * s);
      }
      centers += circleData(x, y, 1.3 * s);
    }
  }

  return { back, petals, centers };
}

const TRUNK_LINE_PATHS = TRUNK_LINES.map(ribbon);
const BRANCH_PATHS = BRANCH.map(ribbon);
const TWIG_PATHS = TWIGS.map(ribbon);
const { back: BACK, petals: PETALS, centers: CENTERS } = buildCanopy();

/**
 * How strongly the blossom reads. A token (see --tree-canopy in globals.css)
 * rather than a constant, because the two themes need different answers — pink
 * on near-black is a far higher contrast than pink on warm white.
 */
const CANOPY_STYLE = { opacity: "var(--tree-canopy)" } as const;

/** The whole illustration, defined once and referenced by both viewports. */
function TreeArt() {
  return (
    <g id="sakura-tree-art">
      {/* Trunk: a soft mass, then a crisper contour edge, then one faint line. */}
      <path d={TRUNK_FILL} fill="var(--tree-bark)" opacity={0.14} />
      <path d={ribbon(TRUNK_EDGE)} fill="var(--tree-bark2)" opacity={0.24} />
      {TRUNK_LINE_PATHS.map((d, i) => (
        <path key={`tl${i}`} d={d} fill="var(--tree-bark2)" opacity={0.12} />
      ))}

      {/* The one small branch and its offshoots. */}
      {BRANCH_PATHS.map((d, i) => (
        <path key={`b${i}`} d={d} fill="var(--tree-bark)" opacity={0.16} />
      ))}
      {TWIG_PATHS.map((d, i) => (
        <path key={`t${i}`} d={d} fill="var(--tree-bark)" opacity={0.12} />
      ))}

      {/* Blossom: faint backing mass, then the small clusters on top. */}
      {BACK.map((c, i) => (
        <circle key={`bk${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="var(--tree-b2)" opacity={0.11} />
      ))}
      <g style={CANOPY_STYLE}>
        {PETALS.map((d, i) => (
          <path key={`p${i}`} d={d} fill={TONES[i]} />
        ))}
        <path d={CENTERS} fill="var(--tree-b3)" />
      </g>
    </g>
  );
}

export function SakuraTree() {
  return (
    <>
      {/* Geometry defined once; the views below are <use> references. */}
      <svg width={0} height={0} className="absolute" aria-hidden="true">
        <defs>
          <TreeArt />
        </defs>
      </svg>

      {/* Desktop / tablet: slim trunk on the left, the small branch near the top. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMinYMax slice"
        className="pointer-events-none fixed inset-0 -z-20 hidden h-full w-full sm:block"
      >
        <use href="#sakura-tree-art" />
      </svg>

      {/* Mobile: just the top-left corner — the branch and its blossoms as a small
          accent, pinned below the header. The trunk falls outside this crop. */}
      <svg
        aria-hidden="true"
        viewBox="0 40 620 320"
        preserveAspectRatio="xMinYMin slice"
        className="pointer-events-none fixed inset-x-0 top-14 -z-20 block h-[16%] w-full sm:hidden"
      >
        <use href="#sakura-tree-art" />
      </svg>
    </>
  );
}
