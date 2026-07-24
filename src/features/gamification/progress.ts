import "server-only";

import { computePlayerStats, type PlayerStats } from "@/features/gamification/player-stats";
import { TRIAL_REQUIREMENTS } from "@/features/gamification/trials";
import { MISSIONS } from "@/features/missions/catalog";
import { prisma } from "@/lib/prisma";

/**
 * Where Bushido trials and Missions are actually paid.
 *
 * The two game mechanics (KATA typing, SCROLL vocab) already credit the Honor a
 * single run is worth. This is the second, slower payout: after a run is saved,
 * we recompute the player's standing and hand over the reward for any trial or
 * mission that is newly complete — once, and only once. Idempotency is the
 * database's job: ProfileAchievement and MissionClaim both have composite primary
 * keys, so `createMany({ skipDuplicates: true })` cannot pay the same trial or
 * mission twice, and we only add the Honor for rows that were genuinely new.
 */

export type Unlocked = {
  kind: "trial" | "mission";
  title: string;
  honor: number;
};

export type ProgressReward = {
  honor: number;
  xp: number;
  unlocked: Unlocked[];
};

const NOTHING: ProgressReward = { honor: 0, xp: 0, unlocked: [] };

/**
 * Grant every trial and mission the player has newly earned. Safe to call after
 * any run; returns what was awarded so the caller can celebrate it.
 */
export async function grantProgressRewards(profileId: string): Promise<ProgressReward> {
  const stats = await computePlayerStats(profileId);

  // Trials are the seeded Achievement rows; their reward is the seeded value, so
  // it can never drift from what the trial card shows.
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true, slug: { in: Object.keys(TRIAL_REQUIREMENTS) } },
    select: { id: true, slug: true, name: true, honorReward: true, xpReward: true },
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const [earned, claimed] = await Promise.all([
        tx.profileAchievement.findMany({ where: { profileId }, select: { achievementId: true } }),
        tx.missionClaim.findMany({ where: { profileId }, select: { missionKey: true } }),
      ]);
      const earnedIds = new Set(earned.map((e) => e.achievementId));
      const claimedKeys = new Set(claimed.map((c) => c.missionKey));

      const unlocked: Unlocked[] = [];
      let honor = 0;
      let xp = 0;

      const newTrials = achievements.filter(
        (a) => !earnedIds.has(a.id) && TRIAL_REQUIREMENTS[a.slug]?.met(stats)
      );
      for (const a of newTrials) {
        honor += a.honorReward;
        xp += a.xpReward;
        unlocked.push({ kind: "trial", title: a.name, honor: a.honorReward });
      }

      const newMissions = MISSIONS.filter((m) => !claimedKeys.has(m.key) && m.met(stats));
      for (const m of newMissions) {
        honor += m.honor;
        xp += m.xp;
        unlocked.push({ kind: "mission", title: m.title, honor: m.honor });
      }

      if (unlocked.length === 0) return NOTHING;

      if (newTrials.length > 0) {
        await tx.profileAchievement.createMany({
          data: newTrials.map((a) => ({ profileId, achievementId: a.id })),
          skipDuplicates: true,
        });
      }
      if (newMissions.length > 0) {
        await tx.missionClaim.createMany({
          data: newMissions.map((m) => ({ profileId, missionKey: m.key, honor: m.honor, xp: m.xp })),
          skipDuplicates: true,
        });
      }

      await tx.profile.update({
        where: { id: profileId },
        data: { honor: { increment: honor }, xp: { increment: xp } },
      });

      return { honor, xp, unlocked };
    });
  } catch (error) {
    // A failed bonus payout must never undo a saved run — the run and its Honor
    // are already committed by the caller. Log and move on; the next run will
    // find the same trials still unmet and pay them then.
    console.error("grantProgressRewards failed", error);
    return NOTHING;
  }
}

// ------------------------------------------------------------------ page views

export type TrialView = {
  slug: string;
  name: string;
  kanji: string | null;
  description: string;
  honor: number;
  earned: boolean;
  unlockedAt: Date | null;
  progress: { ratio: number; label: string };
};

export type MissionView = {
  key: string;
  title: string;
  description: string;
  icon: string;
  honor: number;
  complete: boolean;
  progress: { ratio: number; label: string };
};

export type ProgressView = {
  trials: TrialView[];
  missions: MissionView[];
  /** Null when signed out — the catalog still renders, just untracked. */
  stats: PlayerStats | null;
};

/**
 * Everything the /achievements and /missions pages render. Signed out, it shows
 * the catalog with nothing earned; signed in, it reflects real standing.
 */
export async function getProgressView(profileId: string | null): Promise<ProgressView> {
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true, slug: { in: Object.keys(TRIAL_REQUIREMENTS) } },
    orderBy: { sort: "asc" },
    select: { slug: true, name: true, kanji: true, description: true, honorReward: true },
  });

  const zero = { ratio: 0, label: "Not yet begun" };

  if (!profileId) {
    return {
      stats: null,
      trials: achievements.map((a) => ({
        slug: a.slug,
        name: a.name,
        kanji: a.kanji,
        description: a.description,
        honor: a.honorReward,
        earned: false,
        unlockedAt: null,
        progress: zero,
      })),
      missions: MISSIONS.map((m) => ({
        key: m.key,
        title: m.title,
        description: m.description,
        icon: m.icon,
        honor: m.honor,
        complete: false,
        progress: zero,
      })),
    };
  }

  const [stats, earned, claimed] = await Promise.all([
    computePlayerStats(profileId),
    prisma.profileAchievement.findMany({
      where: { profileId },
      select: { unlockedAt: true, achievement: { select: { slug: true } } },
    }),
    prisma.missionClaim.findMany({ where: { profileId }, select: { missionKey: true } }),
  ]);

  const earnedBySlug = new Map(earned.map((e) => [e.achievement.slug, e.unlockedAt]));
  const claimedKeys = new Set(claimed.map((c) => c.missionKey));

  return {
    stats,
    trials: achievements.map((a) => {
      const unlockedAt = earnedBySlug.get(a.slug) ?? null;
      return {
        slug: a.slug,
        name: a.name,
        kanji: a.kanji,
        description: a.description,
        honor: a.honorReward,
        earned: unlockedAt !== null,
        unlockedAt,
        progress: TRIAL_REQUIREMENTS[a.slug]?.progress(stats) ?? zero,
      };
    }),
    missions: MISSIONS.map((m) => ({
      key: m.key,
      title: m.title,
      description: m.description,
      icon: m.icon,
      honor: m.honor,
      complete: claimedKeys.has(m.key) || m.met(stats),
      progress: m.progress(stats),
    })),
  };
}
