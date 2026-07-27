/**
 * Where blossom is born.
 *
 * The petals fall from the slim sakura branch on the FAR LEFT of the screen (see
 * sakura-tree.tsx), then drift gently left-to-right and down. So they are emitted
 * from a tight cluster near the top-left — over the branch and its blossoms — and
 * the rightward drift in petal-field.tsx carries them across the page from there.
 *
 * Fractions, not pixels: the field and the tree both scale with the viewport, so
 * a pixel would drift off the branch on a wide screen. They are deliberately
 * approximate — a petal sways as it falls, so "from the branch on the left" is
 * all that has to read, not a pixel-exact origin.
 */
export type EmitSource = { fx: number; fy: number };

export const EMIT_SOURCES: readonly EmitSource[] = [
  // Spread along the left, under the canopy, which now sits just below the
  // header rather than down in the middle of the hero. Petals catch the air
  // here and drift rightward and down across the page.
  //
  // Raised to match the branch. These were at fy 0.2–0.3, so a petal was born
  // a third of the way down the screen and had only the remainder to fall
  // through — it barely got going before it was recycled. From ~0.13 it has
  // most of the viewport to cross, which is what makes the drift read as a
  // fall rather than a sprinkle near the top.
  { fx: 0.03, fy: 0.14 },
  { fx: 0.07, fy: 0.11 },
  { fx: 0.11, fy: 0.17 },
  { fx: 0.15, fy: 0.12 },
  { fx: 0.19, fy: 0.19 },
  { fx: 0.24, fy: 0.15 },
];
