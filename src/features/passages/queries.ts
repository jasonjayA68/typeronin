import "server-only";

import { PASSAGES } from "@/features/typing/passages";
import { prisma } from "@/lib/prisma";

/**
 * The passages the game draws from, and the ones the admin manages.
 *
 * The game reads only active passages; if the table is empty or unreachable it
 * falls back to the built-in set, so the dojo is never left with nothing to
 * type. The admin sees everything, active or not.
 */

export type GamePassage = { id: string; title: string; text: string };

export async function getKataPassages(): Promise<GamePassage[]> {
  try {
    const rows = await prisma.passage.findMany({
      where: { isActive: true },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, text: true },
    });
    if (rows.length > 0) return rows;
  } catch (error) {
    console.error("getKataPassages failed", error);
  }

  // The built-in set, so a fresh or broken database still gives the dojo prose.
  return PASSAGES.map((p) => ({ id: p.id, title: p.title, text: p.text }));
}
