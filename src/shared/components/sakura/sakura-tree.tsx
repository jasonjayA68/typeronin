/**
 * The sakura accent — a slim, quiet frame on the far left.
 *
 * A single slim trunk hugging the left edge, one branch reaching in just below
 * the header, and a full drift of blossom along it. It used to be one big tree
 * arcing across the whole viewport, which competed with the content; the answer
 * was to move it aside, not to strip it — so the canopy is generous and the
 * whole thing stays faint enough to sit beneath every surface.
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

// Root flare at the base — the trunk splays into a few tapered roots near the
// bottom edge, so it reads as growing out of the ground rather than cut off.
// Each leaves the lower trunk and curves down and out to the right, thick at the
// trunk, thinning to a tip.
const ROOTS: Ribbon[] = [
  [40, 900, 90, 965, 140, 995, 214, 1016, 12, 2],
  [34, 940, 70, 985, 104, 1004, 156, 1024, 8, 2],
  [30, 970, 44, 995, 44, 1010, 40, 1032, 6, 2],
];

// The branch rides just under the header.
//
// It used to leave the trunk at y 320, which put it and its whole canopy down
// in the middle of the hero — across the headline on a narrow screen, and only
// two thirds of the viewport above the bottom edge for a petal to fall through.
// At y ~190 it clears the 64px bar with room to spare (the bar is ~70 viewBox
// units at the scale a desktop lands on, ~75 on a phone) and hands the petals
// most of the screen to fall down.
const BRANCH: Ribbon[] = [
  [50, 195, 130, 160, 205, 150, 275, 165, 15, 8],
  [275, 165, 330, 175, 375, 200, 415, 245, 8, 3],
];
// Offshoots that lift the blossom off the branch, and two that hang below it —
// a canopy only ever growing upward reads as a hedge.
const TWIGS: Ribbon[] = [
  [120, 168, 126, 140, 122, 122, 132, 102, 3.5, 1.5],
  [190, 152, 198, 124, 194, 106, 204, 88, 3.5, 1.5],
  [255, 158, 264, 132, 260, 114, 270, 96, 3.5, 1.5],
  [320, 172, 330, 148, 326, 130, 336, 112, 3.2, 1.4],
  [370, 196, 380, 174, 376, 158, 386, 142, 3, 1.3],
  [155, 158, 160, 186, 156, 202, 166, 220, 3, 1.2],
  [290, 168, 296, 196, 292, 212, 302, 230, 3, 1.2],
];

// Blossom clusters: [cx, cy, radius, density].
//
// Twelve pockets at near-full density rather than five thin ones. The old
// canopy was deliberately sparse — a touch of blossom, never a mass — but read
// as a branch that had mostly finished dropping. Abundance here comes from
// overlapping pockets: clusters that share edges merge into one drift of
// blossom, where spaced pockets stay five separate polka dots however many
// flowers each holds.
type Pocket = readonly [number, number, number, number];
const POCKETS: readonly Pocket[] = [
  [58, 178, 46, 0.95],
  [102, 150, 44, 0.95],
  [136, 120, 42, 0.9],
  [172, 148, 46, 0.95],
  [206, 108, 40, 0.9],
  [240, 138, 46, 0.95],
  [274, 104, 40, 0.85],
  [302, 152, 44, 0.9],
  [340, 124, 40, 0.85],
  [362, 182, 42, 0.85],
  [166, 216, 36, 0.8],
  [302, 226, 36, 0.8],
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
const ROOT_PATHS = ROOTS.map(ribbon);
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

      {/* Root flare at the base, so the trunk reads as rooted, not cut off. */}
      {ROOT_PATHS.map((d, i) => (
        <path key={`r${i}`} d={d} fill="var(--tree-bark)" opacity={0.15} />
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

      {/* One viewport at every size.
          ------------------------------------------------------------------
          Phones used to get their own crop — a 17%-tall window onto the branch
          alone, pinned below the header. It cost the phone every part of the
          tree that gives it its shape: no trunk down the left edge, no root
          flare, and a hard horizontal seam where the crop simply stopped.

          The viewBox is far wider than the art so that HEIGHT always binds.
          `slice` scales by max(W/vbW, H/vbH); whichever term wins decides which
          axis gets cropped. At 1600×1000 that flipped with the window: a
          viewport wider than 1.6:1 — 1600×900, 1920×1080, most laptops — made
          width the winner and cropped the surplus off the TOP, and since
          YMax pins the bottom, the top is exactly where the canopy lives. The
          blossom disappeared behind the header on the very shapes of screen
          most people use, while 1440×900 landed on a clean 0.9 and looked
          perfect. A 4:1 box puts the flip beyond any real display, so height
          wins everywhere: the art always fills the height exactly, the canopy
          always sits just below the header, the roots always reach the bottom
          edge, and the surplus width is cropped from the right — which is
          exactly where there is nothing to lose, the tree living against the
          left edge. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 4000 1000"
        preserveAspectRatio="xMinYMax slice"
        className="pointer-events-none fixed inset-0 -z-20 block h-full w-full"
      >
        <use href="#sakura-tree-art" />
      </svg>
    </>
  );
}
