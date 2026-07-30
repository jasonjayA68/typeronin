import type { PlayerStats } from "@/features/gamification/player-stats";

/**
 * The seven achievements, each turned into a condition on real play.
 *
 * "Trial" is the internal name for an achievement and is kept everywhere it is a
 * key, a type or a slug; players only ever read "achievement". The names,
 * descriptions and Honor rewards live in the database (seeded in prisma/seed.ts
 * as `Achievement` rows) — this file adds the one thing the database cannot hold:
 * what a player must actually *do* to earn each one, expressed against the shared
 * PlayerStats. Keyed by the achievement `slug`, so the payout is always the
 * seeded `honorReward` and never drifts from it.
 *
 * Every condition is reachable through the two games that pay Honor — Typing
 * Phrases and Find the Word — so an achievement is a habit the player has been
 * seen to keep, not a number handed out for free.
 *
 * The progress labels below are player-facing: plain words, no game jargon.
 */
export type TrialRequirement = {
  /** Whether the achievement has been earned. */
  met: (s: PlayerStats) => boolean;
  /** 0..1 progress toward it, and a short human label, for the card. */
  progress: (s: PlayerStats) => { ratio: number; label: string };
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export const TRIAL_REQUIREMENTS: Record<string, TrialRequirement> = {
  // Finish one Typing Phrases game with no wrong keys.
  rectitude: {
    met: (s) => s.cleanKatas >= 1,
    progress: (s) => ({ ratio: clamp01(s.cleanKatas / 1), label: `${Math.min(s.cleanKatas, 1)} of 1 game with no mistakes` }),
  },
  // Finish one game on the hard setting.
  courage: {
    met: (s) => s.hardRuns >= 1,
    progress: (s) => ({ ratio: clamp01(s.hardRuns / 1), label: `${Math.min(s.hardRuns, 1)} of 1 hard game` }),
  },
  // Come back and play on a second day.
  benevolence: {
    met: (s) => s.distinctDays >= 2,
    progress: (s) => ({ ratio: clamp01(s.distinctDays / 2), label: `${Math.min(s.distinctDays, 2)} of 2 days played` }),
  },
  // Answer every question in one Find the Word round correctly.
  respect: {
    met: (s) => s.perfectScrolls >= 1,
    progress: (s) => ({ ratio: clamp01(s.perfectScrolls / 1), label: `${Math.min(s.perfectScrolls, 1)} of 1 perfect round` }),
  },
  // Simply play three games, good or bad. Every one is recorded.
  honesty: {
    met: (s) => s.totalRuns >= 3,
    progress: (s) => ({ ratio: clamp01(s.totalRuns / 3), label: `${Math.min(s.totalRuns, 3)} of 3 games played` }),
  },
  // Finish three Typing Phrases games with no wrong keys.
  honour: {
    met: (s) => s.cleanKatas >= 3,
    progress: (s) => ({ ratio: clamp01(s.cleanKatas / 3), label: `${Math.min(s.cleanKatas, 3)} of 3 games with no mistakes` }),
  },
  // Play on seven different days.
  loyalty: {
    met: (s) => s.distinctDays >= 7,
    progress: (s) => ({ ratio: clamp01(s.distinctDays / 7), label: `${Math.min(s.distinctDays, 7)} of 7 days played` }),
  },
};
