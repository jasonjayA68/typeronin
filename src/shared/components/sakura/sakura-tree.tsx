/**
 * The signature sakura tree — the identity of TypeRonin.
 *
 * The composition is one ancient tree seen from beneath: a MASSIVE trunk anchored
 * to the far-left edge, most of it continuing off-screen, only a sliver visible,
 * climbing the full height and leaning up and to the right. From it, ONE graceful
 * branch sweeps high across almost the whole width and tapers into the upper-right
 * corner, where the blossom gathers into a lush canopy. There is no second tree,
 * no mirror, no scattered limbs.
 *
 * The blossom runs the WHOLE length of that branch, so the page reads as standing
 * beneath one big tree in full bloom rather than beside a branch that happens to
 * flower at its ends. It used to gather in two pockets with a clean gap over the
 * centre; the gap made the branch a frame, and a frame is not what a canopy is.
 * Density still varies along the run — richest where the branch thickens into the
 * upper-right corner, lighter over the middle — because an even wash of pink
 * reads as wallpaper, and the variation is what makes it a tree.
 *
 * It stays UNDER the interface, and that is what the low group opacity is for:
 * the canopy now sits above the content column rather than beside it, so it has
 * to be quiet enough that typography, cards, buttons and stats still read first.
 *
 * Style: premium anime vector line art. The wood is tapered brush ribbons (thin,
 * organic, subtle weight variation — no thick outlines, no bark texture, no
 * gradients); the blossom is small hand-shaped flowers over a faint backing.
 * Everything is faint enough to sit beneath the UI. Colours come from the
 * --tree-* tokens, so it themes for free, and the falling petals are a separate
 * animated layer (petal-field.tsx) — this tree is static, so it costs nothing per
 * frame. The geometry is deterministic (seeded) and drawn once, referenced by
 * both the desktop and mobile views via <use>.
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
  const steps = 22;
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

// Drawn in a 1600×1000 box; the SVG covers the viewport anchored bottom-left.
// Massive trunk hugging the left edge, most of it off-canvas, leaning up-right.
// Only a slim sliver (~a quarter of the trunk's width) peeks in from the far
// left; the rest of the massive trunk continues off-canvas.
const TRUNK_FILL =
  "M-440 1030 L110 1030 C148 800 112 540 158 320 C172 190 176 90 186 -30 L-440 -30 Z";
const TRUNK_EDGE: Ribbon = [110, 1030, 148, 800, 128, 540, 158, 320, 12, 7];
const TRUNK_EDGE2: Ribbon = [158, 320, 170, 200, 174, 96, 186, -30, 7, 3];
const TRUNK_LINES: Ribbon[] = [
  [62, 1030, 88, 760, 54, 470, 98, 250, 3, 1.5],
  [6, 1030, 44, 720, 12, 470, 68, 230, 2.4, 1.2],
];

// ONE branch: it leaves the trunk below the header, stays high over the centre
// (clear of the heading), then slopes down into a rich flower canopy on the right.
const BRANCH: Ribbon[] = [
  [158, 205, 300, 150, 400, 130, 520, 132, 40, 24],
  [520, 132, 720, 120, 920, 124, 1120, 150, 24, 16],
  [1120, 150, 1280, 172, 1400, 220, 1520, 300, 16, 7],
  [1520, 300, 1568, 318, 1592, 330, 1636, 352, 7, 2],
];
// Short offshoots that lift the blossom off the bough. They now run the whole
// length rather than clustering at the ends — a pocket hanging off nothing reads
// as a cloud, and the eye wants the wood it grew from. Alternating up and down
// so the canopy has depth instead of sitting on one line.
const TWIGS: Ribbon[] = [
  [230, 150, 240, 120, 236, 104, 248, 84, 5, 2],
  [352, 140, 360, 172, 356, 192, 366, 216, 4.5, 1.8],
  [468, 130, 478, 100, 474, 82, 484, 60, 4.5, 1.8],
  [572, 126, 580, 160, 576, 182, 586, 208, 4.5, 1.8],
  [688, 124, 698, 94, 694, 76, 704, 54, 4.5, 1.8],
  [792, 126, 800, 160, 796, 182, 806, 208, 4.5, 1.8],
  [908, 130, 918, 100, 914, 82, 924, 60, 4.5, 1.8],
  [1012, 134, 1020, 168, 1016, 190, 1026, 216, 4.5, 1.8],
  [1220, 160, 1230, 120, 1226, 100, 1238, 78, 5, 2],
  [1390, 220, 1402, 180, 1398, 158, 1410, 134, 5, 2],
  [1490, 290, 1502, 250, 1498, 230, 1510, 208, 5, 2],
];

// Blossom pockets: [cx, cy, radius, density].
//
// One continuous canopy along the bough, not two clusters. Density carries the
// composition instead of empty space: a lighter hand over the middle, where the
// content column sits beneath, thickening into the rich mass in the upper-right
// where the branch itself thickens. The pockets are staggered above and below
// the bough line so the mass has a ragged underside — a canopy seen from below
// has no straight edge.
type Pocket = readonly [number, number, number, number];
const POCKETS: readonly Pocket[] = [
  // by the trunk, where the bough leaves the wood
  [150, 88, 40, 0.85],
  [230, 150, 46, 0.9],
  [300, 108, 50, 0.85],
  [316, 196, 44, 0.7],
  // the long middle run — lighter, so the content beneath still reads
  [392, 146, 52, 0.75],
  [408, 232, 44, 0.6],
  [478, 106, 50, 0.8],
  [496, 192, 50, 0.7],
  [578, 148, 54, 0.8],
  [592, 238, 46, 0.62],
  [668, 110, 50, 0.78],
  [684, 198, 52, 0.72],
  [762, 150, 54, 0.82],
  [778, 242, 46, 0.64],
  [852, 114, 50, 0.8],
  [868, 202, 52, 0.74],
  [944, 152, 54, 0.85],
  [960, 244, 46, 0.66],
  [1032, 118, 52, 0.85],
  [1048, 208, 54, 0.78],
  // the rich, dense canopy — many blossoms spilling down the right side
  [1140, 130, 54, 1.05],
  [1220, 160, 58, 1.1],
  [1200, 240, 60, 1.15],
  [1290, 122, 52, 1.0],
  [1300, 205, 66, 1.2],
  [1300, 300, 56, 1.05],
  [1385, 150, 58, 1.1],
  [1390, 250, 66, 1.2],
  [1400, 342, 54, 1.0],
  [1480, 195, 60, 1.15],
  [1490, 296, 56, 1.05],
  [1560, 155, 52, 1.0],
  [1560, 258, 54, 1.05],
  [1602, 338, 48, 0.95],
];

type Dot = { cx: string; cy: string; r: string };

/** The three blossom tones, palest last — see the tone pick in buildCanopy. */
const TONES = ["var(--tree-b1)", "var(--tree-b2)", "var(--tree-b3)"] as const;

/**
 * A circle as path data, so a thousand of them can share one <path>.
 *
 * Two half-arcs, which is the only way to write a closed circle in a path. The
 * coordinates are rounded to whole units: this is a 1600-wide box scaled to the
 * viewport and a petal is about three units across, so a tenth of a unit is far
 * below anything that can be seen — and at this element count the decimals cost
 * more in payload than the geometry gains.
 */
function circleData(cx: number, cy: number, r: number): string {
  const x = Math.round(cx - r);
  const y = Math.round(cy);
  const d = Math.round(r * 2);
  const rr = Math.round(r * 10) / 10;
  return `M${x} ${y}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 ${-d} 0`;
}

/**
 * Build the canopy: a faint backing mass, then many small hand-shaped blossoms,
 * palest toward the top of each pocket (where the light catches). One seeded
 * stream, so the scatter is identical on the server and in the browser — a
 * random tree would hydrate into a different tree and React would say so.
 *
 * The flowers are accumulated into ONE path string per tone rather than emitted
 * as elements. A full-width canopy is on the order of a thousand blossoms, and
 * at six circles each that is six thousand DOM nodes sitting behind every page
 * of the site. Batched, it is three paths and a fourth for the centres. The
 * drawing is identical; only the node count changes.
 */
function buildCanopy() {
  const rnd = mulberry32(7);
  const back: Dot[] = [];
  const petals: string[] = ["", "", ""];
  let centers = "";
  let count = 0;

  for (const [cx, cy, R, dens] of POCKETS) {
    const bk = 4 + ((rnd() * 3) | 0);
    for (let i = 0; i < bk; i++) {
      const a = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * R * 0.7;
      back.push({
        cx: (cx + Math.cos(a) * rad).toFixed(1),
        cy: (cy + Math.sin(a) * rad * 0.85).toFixed(1),
        r: (8 + rnd() * 10).toFixed(1),
      });
    }

    const n = Math.round((28 + rnd() * 12) * dens);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * R;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad * 0.85;
      const s = (0.8 + rnd() * 0.7) * dens;
      const up = -(y - cy) / R; // higher = toward the top of the pocket
      const tone = up > 0.3 && rnd() < 0.6 ? 2 : rnd() < 0.5 ? 0 : 1;

      // Five petals around the centre, then the paler eye.
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 - Math.PI / 2;
        petals[tone] += circleData(x + Math.cos(pa) * 3.2 * s, y + Math.sin(pa) * 3.2 * s, 2.5 * s);
      }
      centers += circleData(x, y, 1.4 * s);
      count++;
    }
  }

  return { back, petals, centers, count };
}

const TRUNK_LINE_PATHS = TRUNK_LINES.map(ribbon);
const BRANCH_PATHS = BRANCH.map(ribbon);
const TWIG_PATHS = TWIGS.map(ribbon);
const { back: BACK, petals: PETALS, centers: CENTERS } = buildCanopy();

/**
 * How far the canopy is held back from full strength.
 *
 * The blossom used to sit in the corners, clear of everything, so it could be
 * drawn at full token strength. It now passes over the content column, and a
 * solid pink behind a paragraph is a paragraph nobody reads.
 *
 * It is a CSS variable (--tree-canopy in globals.css) rather than a number here
 * because the two themes need different answers — see the token for why — and it
 * is applied through `style` rather than the `opacity` attribute because a
 * presentation attribute cannot read a custom property.
 */
const CANOPY_STYLE = { opacity: "var(--tree-canopy)" } as const;

/** The whole illustration, defined once and referenced by both viewports. */
function TreeArt() {
  return (
    <g id="sakura-tree-art">
      {/* Trunk: soft mass, then a crisper contour edge, then faint bark lines. */}
      <path d={TRUNK_FILL} fill="var(--tree-bark)" opacity={0.16} />
      <path d={ribbon(TRUNK_EDGE)} fill="var(--tree-bark2)" opacity={0.28} />
      <path d={ribbon(TRUNK_EDGE2)} fill="var(--tree-bark2)" opacity={0.26} />
      {TRUNK_LINE_PATHS.map((d, i) => (
        <path key={`tl${i}`} d={d} fill="var(--tree-bark2)" opacity={0.13} />
      ))}

      {/* The branch and its canopy hang well below the header, so the page reads
          as standing underneath the tree rather than beside it. The trunk (above)
          still runs the full height, which is what keeps the bough attached to
          something at this depth. */}
      <g transform="translate(0 150)">
        {/* The one branch, and the little offshoots that lift the blossom. */}
        {BRANCH_PATHS.map((d, i) => (
          <path key={`b${i}`} d={d} fill="var(--tree-bark)" opacity={0.17} />
        ))}
        {TWIG_PATHS.map((d, i) => (
          <path key={`t${i}`} d={d} fill="var(--tree-bark)" opacity={0.13} />
        ))}

        {/* Canopy: faint backing mass, then the blossoms — one path per tone,
            and a fourth for the pale eyes. See buildCanopy for why they are
            batched rather than drawn as elements. */}
        {BACK.map((c, i) => (
          <circle key={`bk${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="var(--tree-b2)" opacity={0.13} />
        ))}
        <g style={CANOPY_STYLE}>
          {PETALS.map((d, i) => (
            <path key={`p${i}`} d={d} fill={TONES[i]} />
          ))}
          <path d={CENTERS} fill="var(--tree-b3)" />
        </g>
      </g>
    </g>
  );
}

export function SakuraTree() {
  return (
    <>
      {/* Geometry defined once; the two views below are <use> references. */}
      <svg width={0} height={0} className="absolute" aria-hidden="true">
        <defs>
          <TreeArt />
        </defs>
      </svg>

      {/* Desktop / tablet: the full tree covers the viewport — massive trunk on
          the left, the branch arcing to the upper-right canopy. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMinYMax slice"
        className="pointer-events-none fixed inset-0 -z-20 hidden h-full w-full sm:block"
      >
        <use href="#sakura-tree-art" />
      </svg>

      {/* Mobile: the same art cropped to the canopy and pinned as a band below
          the header. The window follows the branch down — it is 150 lower than
          it was — and is deeper than before because the blossom now runs the
          whole width rather than gathering at one end. The trunk still falls
          outside this viewBox: on a narrow screen it would cross the content. */}
      <svg
        aria-hidden="true"
        viewBox="0 255 1600 285"
        preserveAspectRatio="xMaxYMin slice"
        className="pointer-events-none fixed inset-x-0 top-14 -z-20 block h-[22%] w-full sm:hidden"
      >
        <use href="#sakura-tree-art" />
      </svg>
    </>
  );
}
