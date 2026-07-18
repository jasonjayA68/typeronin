/**
 * Where blossom is born.
 *
 * The petals used to spawn uniformly across the top of the screen, which read as
 * falling from nothing. These are the points they emit from instead — clusters
 * along the two upper-corner branches, given as viewport fractions so they hold
 * at any size. Shared by the canvas (which spawns petals here) and the SVG
 * branches (which are drawn to occupy the same two corners), so the two agree
 * that the blossom comes off the branches.
 *
 * Fractions, not pixels: the field and the branches both scale with the viewport,
 * and a pixel would drift out of the corner on a wide screen.
 */
export type EmitSource = { fx: number; fy: number };

export const EMIT_SOURCES: readonly EmitSource[] = [
  // Left branch — top-left corner, trailing down and inward.
  { fx: 0.04, fy: 0.05 },
  { fx: 0.11, fy: 0.08 },
  { fx: 0.18, fy: 0.06 },
  { fx: 0.23, fy: 0.13 },
  { fx: 0.09, fy: 0.16 },
  { fx: 0.16, fy: 0.2 },
  // Right branch — the mirror.
  { fx: 0.96, fy: 0.05 },
  { fx: 0.89, fy: 0.08 },
  { fx: 0.82, fy: 0.06 },
  { fx: 0.77, fy: 0.13 },
  { fx: 0.91, fy: 0.16 },
  { fx: 0.84, fy: 0.2 },
];
