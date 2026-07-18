import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Dashboard reads.
 *
 * Everything a dashboard shows is derived from TypingSession rather than kept
 * on Profile: a denormalised "best WPM" column is one more thing that can drift
 * from the sessions that produced it. Honor and Ki are the exception — they are
 * a running balance, not a summary, so they are stored.
 */

export type SessionSummary = {
  id: string;
  mode: string;
  wpm: number;
  accuracy: number;
  ma: number | null;
  honorEarned: number;
  categoryName: string | null;
  playedAt: Date;
};

export async function getDashboard(profileId: string) {
  const [profile, totals, best, recent, achievements, referrals, unread] = await Promise.all([
    prisma.profile.findUnique({ where: { id: profileId } }),

    prisma.typingSession.aggregate({
      where: { profileId },
      _count: { _all: true },
      _avg: { accuracy: true, wpm: true, ma: true },
      _sum: { honorEarned: true, correctWords: true },
    }),

    // Personal best by net speed. Ties break toward the older run — the first
    // time you hit a number is the time you earned it.
    prisma.typingSession.findFirst({
      where: { profileId },
      orderBy: [{ wpm: "desc" }, { playedAt: "asc" }],
      select: { wpm: true, accuracy: true, playedAt: true, mode: true },
    }),

    prisma.typingSession.findMany({
      where: { profileId },
      orderBy: { playedAt: "desc" },
      take: 6,
      select: {
        id: true,
        mode: true,
        wpm: true,
        accuracy: true,
        ma: true,
        honorEarned: true,
        playedAt: true,
        category: { select: { name: true } },
      },
    }),

    prisma.profileAchievement.findMany({
      where: { profileId },
      orderBy: { unlockedAt: "desc" },
      take: 4,
      select: {
        unlockedAt: true,
        achievement: { select: { slug: true, name: true, kanji: true, honorReward: true } },
      },
    }),

    prisma.referral.groupBy({
      by: ["status"],
      where: { referrerId: profileId },
      _count: { _all: true },
    }),

    prisma.notification.findMany({
      where: { profileId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!profile) return null;

  const achievementTotal = await prisma.achievement.count({ where: { isActive: true } });
  const earnedTotal = await prisma.profileAchievement.count({ where: { profileId } });

  const referralCounts = Object.fromEntries(referrals.map((r) => [r.status, r._count._all]));

  return {
    profile,
    stats: {
      sessions: totals._count._all,
      avgWpm: Math.round(totals._avg.wpm ?? 0),
      avgAccuracy: Math.round((totals._avg.accuracy ?? 0) * 10) / 10,
      avgMa: Math.round(totals._avg.ma ?? 0),
      honorFromSessions: totals._sum.honorEarned ?? 0,
      wordsCut: totals._sum.correctWords ?? 0,
      best,
    },
    recent: recent.map(
      (s): SessionSummary => ({
        id: s.id,
        mode: s.mode,
        wpm: s.wpm,
        accuracy: s.accuracy,
        ma: s.ma,
        honorEarned: s.honorEarned,
        categoryName: s.category?.name ?? null,
        playedAt: s.playedAt,
      })
    ),
    achievements: { recent: achievements, earned: earnedTotal, total: achievementTotal },
    referrals: {
      pending: referralCounts.PENDING ?? 0,
      qualified: referralCounts.QUALIFIED ?? 0,
      rewarded: referralCounts.REWARDED ?? 0,
      total: referrals.reduce((n, r) => n + r._count._all, 0),
    },
    notifications: unread,
  };
}

export type Dashboard = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;

/** A public profile, addressed by handle. */
export async function getPublicProfile(handle: string) {
  const profile = await prisma.profile.findUnique({
    where: { handle },
    select: {
      id: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
      countryCode: true,
      bio: true,
      honor: true,
      xp: true,
      streakDays: true,
      createdAt: true,
    },
  });
  if (!profile) return null;

  const [totals, best, byMode, badges, history] = await Promise.all([
    prisma.typingSession.aggregate({
      where: { profileId: profile.id },
      _count: { _all: true },
      _avg: { wpm: true, accuracy: true, ma: true },
      _sum: { correctWords: true },
    }),
    prisma.typingSession.findFirst({
      where: { profileId: profile.id },
      orderBy: [{ wpm: "desc" }, { playedAt: "asc" }],
      select: { wpm: true, accuracy: true, playedAt: true },
    }),
    // "Favourite mode" is simply the one played most.
    prisma.typingSession.groupBy({
      by: ["mode"],
      where: { profileId: profile.id },
      _count: { _all: true },
      orderBy: { _count: { mode: "desc" } },
      take: 1,
    }),
    prisma.profileAchievement.findMany({
      where: { profileId: profile.id },
      orderBy: { unlockedAt: "desc" },
      select: {
        unlockedAt: true,
        achievement: { select: { slug: true, name: true, kanji: true } },
      },
    }),
    prisma.typingSession.findMany({
      where: { profileId: profile.id },
      orderBy: { playedAt: "desc" },
      take: 10,
      select: {
        id: true,
        mode: true,
        wpm: true,
        accuracy: true,
        ma: true,
        playedAt: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  return {
    profile,
    stats: {
      sessions: totals._count._all,
      avgWpm: Math.round(totals._avg.wpm ?? 0),
      avgAccuracy: Math.round((totals._avg.accuracy ?? 0) * 10) / 10,
      avgMa: Math.round(totals._avg.ma ?? 0),
      wordsCut: totals._sum.correctWords ?? 0,
      best,
      favouriteMode: byMode[0]?.mode ?? null,
    },
    badges,
    history,
  };
}
