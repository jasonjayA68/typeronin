import { z } from "zod";

/**
 * The daily play limits, as configuration.
 *
 * Three admin knobs — how many games count in a day, how long between them, and
 * a multiplier on the Honor each one pays — kept in the `Setting` table under one
 * key, exactly like the economy config. Pure module: no database, no
 * `server-only`, so the dojo, the admin form, the save action and a test all read
 * one definition of what a limit is and how it is applied.
 *
 * The defaults are INERT on purpose. A limit of zero is "no limit", a cooldown of
 * zero is "none", and a multiplier of 100 is "unchanged" — so until an admin sets
 * a real value, this feature changes nothing about how the dojo already plays.
 * The safe default for an abuse control is off, because a control that switches
 * itself on at install breaks the thing it was added to protect.
 */

export type PlayLimits = {
  /** Games that count toward earning per day. 0 means unlimited. */
  maxGamesPerDay: number;
  /** Seconds a player must wait between counted games. 0 means none. */
  cooldownSeconds: number;
  /** Multiplier on Honor earned, as a whole percent. 100 leaves it unchanged. */
  honorMultiplierPercent: number;
};

export const DEFAULT_PLAY_LIMITS: PlayLimits = {
  maxGamesPerDay: 0,
  cooldownSeconds: 0,
  honorMultiplierPercent: 100,
};

/** The exact words the dojo shows once the day's games are used up. */
export const LIMIT_REACHED_MESSAGE =
  "You have completed today's training. Return tomorrow to continue earning Honors.";

export const playLimitsSchema = z.object({
  maxGamesPerDay: z.coerce
    .number()
    .int("Games per day must be a whole number.")
    .min(0, "Use 0 for no limit.")
    .max(1000),
  cooldownSeconds: z.coerce
    .number()
    .int("The cooldown must be a whole number of seconds.")
    .min(0, "Use 0 for no cooldown.")
    .max(86_400, "A cooldown longer than a day makes no sense."),
  honorMultiplierPercent: z.coerce
    .number()
    .int("The multiplier is a whole percent.")
    .min(0)
    .max(1000, "A multiplier over 1000% is almost certainly a mistake."),
});

/** Validate and clean an unknown config, or null. Returns the parsed value. */
export function parsePlayLimits(input: unknown): PlayLimits | null {
  const result = playLimitsSchema.safeParse(input);
  return result.success ? result.data : null;
}

/* ------------------------------------------------------------- application */

/**
 * Games left today, or null when there is no limit.
 *
 * Null and zero are different answers and callers must not conflate them: null is
 * "unlimited, show no counter", zero is "the limit is reached, stop". Clamped at
 * zero because a played-count above the limit (a limit lowered mid-day) must read
 * as done, not as a negative remaining.
 */
export function gamesRemaining(playedToday: number, limits: PlayLimits): number | null {
  if (limits.maxGamesPerDay <= 0) return null;
  return Math.max(0, limits.maxGamesPerDay - playedToday);
}

/** Whether the day's games are used up. Always false when there is no limit. */
export function isLimitReached(playedToday: number, limits: PlayLimits): boolean {
  return limits.maxGamesPerDay > 0 && playedToday >= limits.maxGamesPerDay;
}

/**
 * Seconds still to wait before the next game counts, given when the last one was.
 *
 * Zero when there is no cooldown, or none is owed, or nothing has been played
 * (`lastPlayedAtMs` null). Rounded up — a caller showing "wait 1s" should not let
 * a game through at 0.4s left.
 */
export function cooldownLeftSeconds(
  lastPlayedAtMs: number | null,
  nowMs: number,
  limits: PlayLimits
): number {
  if (limits.cooldownSeconds <= 0 || lastPlayedAtMs === null) return 0;
  const elapsed = (nowMs - lastPlayedAtMs) / 1000;
  return Math.max(0, Math.ceil(limits.cooldownSeconds - elapsed));
}

/**
 * Honor after the daily multiplier.
 *
 * Floored, in the house's favour, for the same reason the cash conversion is —
 * a multiplier of 150% on 3 Honor is 4.5, and paying 4 rather than 5 keeps the
 * rounding from inventing currency. A multiplier of 100 returns the input
 * unchanged.
 */
export function applyHonorMultiplier(honor: number, limits: PlayLimits): number {
  if (limits.honorMultiplierPercent === 100) return honor;
  return Math.floor((honor * limits.honorMultiplierPercent) / 100);
}
