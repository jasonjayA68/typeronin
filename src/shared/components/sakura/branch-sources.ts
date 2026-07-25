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
  // A small cluster on the left, where the branch and its blossoms now sit —
  // lowered to just below the header. Petals catch the air here and drift
  // rightward and down across the page.
  { fx: 0.04, fy: 0.24 },
  { fx: 0.08, fy: 0.2 },
  { fx: 0.12, fy: 0.28 },
  { fx: 0.16, fy: 0.22 },
  { fx: 0.2, fy: 0.3 },
];
