import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Record an administrative action.
 *
 * Called from mutations, never from renders. Writing the log must never be able
 * to fail the action it describes — a lost audit line is bad, but an admin who
 * cannot disable an advert because logging is down is worse. So it swallows and
 * reports rather than throws.
 */
export async function audit(entry: {
  /** Who did it. Null only for system actions. */
  actorId: string | null;
  /** Verb, past tense: "ad.enabled", "role.granted". */
  action: string;
  /** What kind of thing was acted on. */
  entity: string;
  entityId?: string | null;
  /** Anything useful for reading the line back later. Never secrets. */
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        meta: (entry.meta ?? {}) as never,
      },
    });
  } catch (error) {
    console.error("audit write failed", entry.action, error);
  }
}
