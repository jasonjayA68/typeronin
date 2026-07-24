import type { PlayerStats } from "@/features/gamification/player-stats";

/**
 * The seven Bushido virtues, each turned into a condition on real play.
 *
 * The virtues, their kanji, descriptions and Honor rewards live in the database
 * (seeded in prisma/seed.ts as `Achievement` rows) — this file adds the one thing
 * the database cannot hold: what a player must actually *do* to earn each one,
 * expressed against the shared PlayerStats. Keyed by the achievement `slug`, so a
 * trial's payout is always the seeded `honorReward` and never drifts from it.
 *
 * Every condition is reachable through the two mechanics that pay Honor — KATA
 * typing and SCROLL vocab — so a trial is "a habit the dojo has watched you
 * keep", not a number handed out for free.
 */
export type TrialRequirement = {
  /** Whether the virtue has been earned. */
  met: (s: PlayerStats) => boolean;
  /** 0..1 progress toward it, and a short human label, for the trial card. */
  progress: (s: PlayerStats) => { ratio: number; label: string };
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export const TRIAL_REQUIREMENTS: Record<string, TrialRequirement> = {
  // Gi — type what is written; the first kata cut clean, no correction.
  rectitude: {
    met: (s) => s.cleanKatas >= 1,
    progress: (s) => ({ ratio: clamp01(s.cleanKatas / 1), label: `${Math.min(s.cleanKatas, 1)} of 1 clean kata` }),
  },
  // Yū — courage: take the hard road and finish it.
  courage: {
    met: (s) => s.hardRuns >= 1,
    progress: (s) => ({ ratio: clamp01(s.hardRuns / 1), label: `${Math.min(s.hardRuns, 1)} of 1 hard run` }),
  },
  // Jin — benevolence: forgive the slow morning, return another day.
  benevolence: {
    met: (s) => s.distinctDays >= 2,
    progress: (s) => ({ ratio: clamp01(s.distinctDays / 2), label: `${Math.min(s.distinctDays, 2)} of 2 days trained` }),
  },
  // Rei — respect: hold rhythm through a full scroll, every answer true.
  respect: {
    met: (s) => s.perfectScrolls >= 1,
    progress: (s) => ({ ratio: clamp01(s.perfectScrolls / 1), label: `${Math.min(s.perfectScrolls, 1)} of 1 perfect scroll` }),
  },
  // Makoto — honesty: keep the record, good runs and bad. Simply train, on the record.
  honesty: {
    met: (s) => s.totalRuns >= 3,
    progress: (s) => ({ ratio: clamp01(s.totalRuns / 3), label: `${Math.min(s.totalRuns, 3)} of 3 runs recorded` }),
  },
  // Meiyo — honour: three katas finished with not one stroke astray.
  honour: {
    met: (s) => s.cleanKatas >= 3,
    progress: (s) => ({ ratio: clamp01(s.cleanKatas / 3), label: `${Math.min(s.cleanKatas, 3)} of 3 clean katas` }),
  },
  // Chūgi — loyalty: train seven days; the dojo remembers who returns.
  loyalty: {
    met: (s) => s.distinctDays >= 7,
    progress: (s) => ({ ratio: clamp01(s.distinctDays / 7), label: `${Math.min(s.distinctDays, 7)} of 7 days trained` }),
  },
};
