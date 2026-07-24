/**
 * Where blossom is born.
 *
 * The petals used to spawn uniformly across the top of the screen, which read as
 * falling from nothing. These are the points they emit from instead — the canopy
 * of the two arching sakura trees (see sakura-tree.tsx): dense down both sides
 * and along the top, and deliberately absent from the centre, where the trees
 * leave a light gap. So the blossom drifts down off the boughs overhead, heavier
 * at the edges, thinning over the middle — just as it hangs in the trees.
 *
 * Fractions, not pixels: the field and the trees both scale with the viewport, so
 * a pixel would drift off the canopy on a wide screen. They are deliberately
 * approximate — a petal sways as it falls, so "from the boughs above" is all that
 * has to read, not a pixel-exact origin.
 */
export type EmitSource = { fx: number; fy: number };

export const EMIT_SOURCES: readonly EmitSource[] = [
  // The signature tree's canopy runs along the top; petals catch the air off the
  // upper-right boughs, where the blossom is densest, and drift down the right
  // margin — away from the content column, per the design spec.
  { fx: 0.62, fy: 0.05 },
  { fx: 0.68, fy: 0.09 },
  { fx: 0.74, fy: 0.04 },
  { fx: 0.8, fy: 0.08 },
  { fx: 0.86, fy: 0.05 },
  { fx: 0.9, fy: 0.11 },
  { fx: 0.95, fy: 0.06 },
  { fx: 0.98, fy: 0.14 },
];
