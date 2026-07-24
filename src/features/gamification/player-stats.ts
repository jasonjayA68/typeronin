import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The single bundle of facts every Bushido trial and Mission is judged against.
 *
 * Both surfaces (see features/gamification/trials.ts and features/missions/
 * catalog.ts) read only from here, so the granting path and the display path can
 * never disagree about what a player has done. Everything is derived from the
 * two game mechanics that actually pay Honor — KATA typing runs and SCROLL vocab
 * rounds — never stored, so there is nothing to keep in sync with the sessions
 * that produced it.
 */
export type PlayerStats = {
  /** Finished KATA typing runs. */
  typingRuns: number;
  /** Finished SCROLL vocab rounds. */
  scrollRuns: number;
  /** Both mechanics together — one "draw" is one run of either. */
  totalRuns: number;
  /** KATA runs finished with not one stroke astray (no incorrect characters). */
  cleanKatas: number;
  /** KATA runs at 95% accuracy or better. */
  katas95: number;
  /** Highest Ma (rhythm) held on any KATA run. */
  maxMa: number;
  /** KATA runs that held Ma at 80 or above. */
  maRunsAbove80: number;
  /** HARD-difficulty runs across both mechanics. */
  hardRuns: number;
  /** SCROLL rounds answered in full — every question correct. */
  perfectScrolls: number;
  /** SCROLL rounds at 95% correct or better. */
  scrolls95: number;
  /** Distinct calendar days the player has trained on (either mechanic). */
  distinctDays: number;
  /** The denormalised login/training streak kept on the profile. */
  streakDays: number;
};

/** Postgres `count(*)` comes back as BigInt through the raw driver. */
function toInt(value: unknown): number {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

/**
 * Compute the whole bundle for one profile.
 *
 * A handful of aggregate queries for the predicates Prisma can express, plus two
 * raw queries for the ones it cannot: comparing two columns (correct vs. total
 * on a SCROLL round) and counting distinct training days across both tables.
 * Table and column names are the model/field names verbatim (no @@map in the
 * schema), quoted so Postgres does not fold them to lowercase.
 */
export async function computePlayerStats(profileId: string): Promise<PlayerStats> {
  const [
    typingRuns,
    cleanKatas,
    katas95,
    maAgg,
    maRunsAbove80,
    hardTyping,
    scrollRuns,
    hardScroll,
    scrollShape,
    days,
    profile,
  ] = await Promise.all([
    prisma.typingSession.count({ where: { profileId } }),
    prisma.typingSession.count({
      where: { profileId, incorrectChars: 0, correctChars: { gt: 0 } },
    }),
    prisma.typingSession.count({ where: { profileId, accuracy: { gte: 95 } } }),
    prisma.typingSession.aggregate({ where: { profileId }, _max: { ma: true } }),
    prisma.typingSession.count({ where: { profileId, ma: { gte: 80 } } }),
    prisma.typingSession.count({ where: { profileId, difficulty: "HARD" } }),
    prisma.scrollSession.count({ where: { profileId } }),
    prisma.scrollSession.count({ where: { profileId, difficulty: "HARD" } }),
    prisma.$queryRaw<{ perfect: bigint; s95: bigint }[]>`
      select
        count(*) filter (
          where "correctCount" = "questionCount" and "questionCount" > 0
        ) as perfect,
        count(*) filter (
          where "correctCount" * 100 >= "questionCount" * 95 and "questionCount" > 0
        ) as s95
      from "ScrollSession"
      where "profileId" = ${profileId}::uuid
    `,
    prisma.$queryRaw<{ d: Date }[]>`
      select distinct date_trunc('day', "playedAt") as d
        from "TypingSession" where "profileId" = ${profileId}::uuid
      union
      select distinct date_trunc('day', "playedAt") as d
        from "ScrollSession" where "profileId" = ${profileId}::uuid
    `,
    prisma.profile.findUnique({ where: { id: profileId }, select: { streakDays: true } }),
  ]);

  return {
    typingRuns,
    scrollRuns,
    totalRuns: typingRuns + scrollRuns,
    cleanKatas,
    katas95,
    maxMa: maAgg._max.ma ?? 0,
    maRunsAbove80,
    hardRuns: hardTyping + hardScroll,
    perfectScrolls: toInt(scrollShape[0]?.perfect),
    scrolls95: toInt(scrollShape[0]?.s95),
    distinctDays: days.length,
    streakDays: profile?.streakDays ?? 0,
  };
}
