import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The single bundle of facts every achievement and mission is judged against.
 *
 * Both surfaces (see features/gamification/trials.ts and features/missions/
 * catalog.ts) read only from here, so the granting path and the display path can
 * never disagree about what a player has done. Everything is derived from the
 * two games that actually pay Honor — Typing Phrases runs and Find the Word
 * rounds — never stored, so there is nothing to keep in sync with the sessions
 * that produced it.
 *
 * The field names keep the original "kata" and "scroll" wording: they match the
 * session tables and the save actions, and only the labels players read changed.
 */
export type PlayerStats = {
  /** Finished Typing Phrases runs. */
  typingRuns: number;
  /** Finished Find the Word rounds. */
  scrollRuns: number;
  /** Both games together — one run of either counts once. */
  totalRuns: number;
  /** Typing Phrases runs finished with no incorrect characters. */
  cleanKatas: number;
  /** Typing Phrases runs at 95% accuracy or better. */
  katas95: number;
  /** Highest rhythm score (`ma`) held on any Typing Phrases run. */
  maxMa: number;
  /** Typing Phrases runs that held a rhythm score of 80 or above. */
  maRunsAbove80: number;
  /** HARD-difficulty runs across both games. */
  hardRuns: number;
  /** Find the Word rounds answered in full — every question correct. */
  perfectScrolls: number;
  /** Find the Word rounds at 95% correct or better. */
  scrolls95: number;
  /** Distinct calendar days the player has played on (either game). */
  distinctDays: number;
  /** The denormalised day streak kept on the profile. */
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
 * on a Find the Word round) and counting distinct play days across both tables.
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
