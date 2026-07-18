import "server-only";

import {
  DEFAULT_PLAY_LIMITS,
  cooldownLeftSeconds,
  gamesRemaining,
  isLimitReached,
  parsePlayLimits,
  type PlayLimits,
} from "@/features/play/limits";
import { prisma } from "@/lib/prisma";

/** The one `Setting` key the daily limits live under. */
export const PLAY_LIMITS_KEY = "play";

/**
 * The live daily limits.
 *
 * Resilient like the economy reader: a missing row, a row an older version
 * wrote, or the database being unreachable all land on the inert defaults rather
 * than an error page. Falling back to "no limit" on a read failure is the right
 * direction here — a transient hiccup should not lock a paying player out of the
 * dojo, and the save action re-checks against the database anyway.
 */
export async function getPlayLimits(): Promise<PlayLimits> {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: PLAY_LIMITS_KEY },
      select: { value: true },
    });
    if (!row) return DEFAULT_PLAY_LIMITS;
    const parsed = parsePlayLimits(row.value);
    if (!parsed) {
      console.error("play-limits setting present but invalid; using defaults");
      return DEFAULT_PLAY_LIMITS;
    }
    return parsed;
  } catch (error) {
    console.error("getPlayLimits failed", error);
    return DEFAULT_PLAY_LIMITS;
  }
}

export type DailyPlayState = {
  playedToday: number;
  /** null when unlimited; a count otherwise. */
  remaining: number | null;
  limitReached: boolean;
  /** Seconds to wait before the next game counts. 0 when free to play. */
  cooldownLeft: number;
  limits: PlayLimits;
};

/** Midnight UTC today — the window a day's games are counted within. */
function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Where a player stands against today's limits.
 *
 * Read by the dojo to decide whether to show the trainer or the "come back
 * tomorrow" notice, and to show the remaining count. The save action does its own
 * authoritative check inside the recording transaction — this is what the page
 * shows, not what it trusts.
 *
 * On any failure it returns a permissive, unlimited state: the display degrades
 * to "no limit shown" rather than wrongly locking someone out.
 */
export async function getDailyPlayState(
  profileId: string,
  limits?: PlayLimits
): Promise<DailyPlayState> {
  const rules = limits ?? (await getPlayLimits());

  try {
    const [playedToday, last] = await Promise.all([
      prisma.typingSession.count({
        where: { profileId, playedAt: { gte: startOfUtcDay() } },
      }),
      prisma.typingSession.findFirst({
        where: { profileId },
        orderBy: { playedAt: "desc" },
        select: { playedAt: true },
      }),
    ]);

    return {
      playedToday,
      remaining: gamesRemaining(playedToday, rules),
      limitReached: isLimitReached(playedToday, rules),
      cooldownLeft: cooldownLeftSeconds(last?.playedAt.getTime() ?? null, Date.now(), rules),
      limits: rules,
    };
  } catch (error) {
    console.error("getDailyPlayState failed", error);
    return {
      playedToday: 0,
      remaining: null,
      limitReached: false,
      cooldownLeft: 0,
      limits: rules,
    };
  }
}
