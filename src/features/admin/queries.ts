import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Admin overview figures.
 *
 * Every number is computed from the tables that own it. Nothing is a stored
 * counter that can drift from the thing it counts, and nothing here is invented:
 * a metric we cannot honestly compute yet is absent rather than faked, because a
 * dashboard that guesses is worse than one with a gap.
 */

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAdminOverview() {
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    students,
    newStudents,
    sessions,
    sessions7,
    speed,
    topPlayers,
    popularCategories,
    activePlacements,
    liveAds,
    posts,
    comments,
    subscribers,
    referrals,
    recentAudit,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { createdAt: { gte: since30 } } }),
    prisma.typingSession.count(),
    prisma.typingSession.count({ where: { playedAt: { gte: since7 } } }),
    prisma.typingSession.aggregate({ _avg: { wpm: true, accuracy: true, ma: true } }),

    prisma.profile.findMany({
      orderBy: { honor: "desc" },
      take: 5,
      select: { handle: true, displayName: true, honor: true },
    }),

    // Which pools people actually train on.
    prisma.typingSession.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 5,
    }),

    prisma.advertisementPlacement.count({ where: { isActive: true } }),
    prisma.advertisement.count({ where: { isActive: true } }),
    prisma.blogPost.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.comment.count({ where: { status: "PENDING" } }),
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED" } }),
    prisma.referral.count(),

    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, action: true, entity: true, createdAt: true, actorId: true },
    }),
  ]);

  // groupBy gives ids; names need a second read. Cheap, and only for the top 5.
  const categoryIds = popularCategories.map((c) => c.categoryId).filter((id): id is string => !!id);
  const categoryNames = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(categoryNames.map((c) => [c.id, c.name]));

  const postsByStatus = Object.fromEntries(posts.map((p) => [p.status, p._count._all]));

  return {
    students,
    newStudents,
    sessions,
    sessions7,
    avgWpm: Math.round(speed._avg.wpm ?? 0),
    avgAccuracy: Math.round((speed._avg.accuracy ?? 0) * 10) / 10,
    avgMa: Math.round(speed._avg.ma ?? 0),
    topPlayers,
    popularCategories: popularCategories.map((c) => ({
      name: c.categoryId ? (nameById.get(c.categoryId) ?? "Unknown") : "Free practice",
      plays: c._count._all,
    })),
    activePlacements,
    liveAds,
    posts: {
      published: postsByStatus.PUBLISHED ?? 0,
      draft: postsByStatus.DRAFT ?? 0,
      scheduled: postsByStatus.SCHEDULED ?? 0,
    },
    pendingComments: comments,
    subscribers,
    referrals,
    recentAudit,
  };
}

export type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;

/** Ad positions and whatever is booked in them. */
export async function getAdPlacements() {
  return prisma.advertisementPlacement.findMany({
    orderBy: [{ isActive: "desc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      showOnDesktop: true,
      showOnMobile: true,
      advertisements: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          provider: true,
          format: true,
          isActive: true,
          adSlotId: true,
          frequency: true,
          impressions: true,
          clicks: true,
        },
      },
    },
  });
}

export type AdPlacementRow = Awaited<ReturnType<typeof getAdPlacements>>[number];

export async function getAuditLog(take = 60) {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });

  const actorIds = [...new Set(entries.map((e) => e.actorId).filter((id): id is string => !!id))];
  const actors = actorIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, displayName: true, handle: true },
      })
    : [];
  const byId = new Map(actors.map((a) => [a.id, a]));

  return entries.map((e) => ({ ...e, actor: e.actorId ? (byId.get(e.actorId) ?? null) : null }));
}
