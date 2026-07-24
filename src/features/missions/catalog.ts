import type { PlayerStats } from "@/features/gamification/player-stats";

/**
 * The standing orders.
 *
 * Missions have no database table of their own — they are defined here, their
 * progress is derived from session history (the same PlayerStats the Bushido
 * trials read), and only their *completion* is persisted, as a MissionClaim row.
 * That keeps a mission's definition in code review rather than in data, and means
 * a mission cannot pay twice (the claim's composite key is the guard).
 *
 * `key` is the stable identity written to MissionClaim; never reuse a key for a
 * different order. `icon` is a lucide name the page maps to a component. Every
 * condition is reachable through KATA typing and SCROLL vocab — the two mechanics
 * that pay Honor.
 */
export type Mission = {
  key: string;
  title: string;
  description: string;
  icon: "swords" | "sunrise" | "waves" | "flame" | "mountain";
  honor: number;
  xp: number;
  met: (s: PlayerStats) => boolean;
  progress: (s: PlayerStats) => { ratio: number; label: string };
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export const MISSIONS: readonly Mission[] = [
  {
    key: "unbroken-line",
    title: "The Unbroken Line",
    description: "Finish a kata with not one stroke astray. Backspace will not save you.",
    icon: "swords",
    honor: 250,
    xp: 60,
    met: (s) => s.cleanKatas >= 1,
    progress: (s) => ({ ratio: clamp01(s.cleanKatas / 1), label: `${Math.min(s.cleanKatas, 1)} of 1 clean cut` }),
  },
  {
    key: "dawn-practice",
    title: "Dawn Practice",
    description: "Train five days running. The grey mornings are the ones that count.",
    icon: "sunrise",
    honor: 400,
    xp: 100,
    met: (s) => s.distinctDays >= 5,
    progress: (s) => ({ ratio: clamp01(s.distinctDays / 5), label: `${Math.min(s.distinctDays, 5)} of 5 days` }),
  },
  {
    key: "still-water",
    title: "Still Water",
    description: "Hold Ma above 80 for a full kata. Your rhythm will drift; notice it.",
    icon: "waves",
    honor: 350,
    xp: 90,
    met: (s) => s.maRunsAbove80 >= 1,
    progress: (s) => ({ ratio: clamp01(s.maxMa / 80), label: `Best Ma held: ${s.maxMa} of 80` }),
  },
  {
    key: "hundred-draws",
    title: "One Hundred Draws",
    description: "Complete one hundred draws across the dojo. Kata or scroll, each one counts.",
    icon: "flame",
    honor: 300,
    xp: 80,
    met: (s) => s.totalRuns >= 100,
    progress: (s) => ({ ratio: clamp01(s.totalRuns / 100), label: `${Math.min(s.totalRuns, 100)} of 100 draws` }),
  },
  {
    key: "long-road",
    title: "The Long Road",
    description: "Carry both scrolls above 95% — a kata and a vocab scroll, neither abandoned.",
    icon: "mountain",
    honor: 600,
    xp: 150,
    met: (s) => s.katas95 >= 1 && s.scrolls95 >= 1,
    progress: (s) => ({
      ratio: ((s.katas95 >= 1 ? 1 : 0) + (s.scrolls95 >= 1 ? 1 : 0)) / 2,
      label: `${(s.katas95 >= 1 ? 1 : 0) + (s.scrolls95 >= 1 ? 1 : 0)} of 2 scrolls above 95%`,
    }),
  },
  {
    key: "no-second-chance",
    title: "No Second Chance",
    description: "Three katas drawn and finished without a single stroke astray.",
    icon: "swords",
    honor: 500,
    xp: 120,
    met: (s) => s.cleanKatas >= 3,
    progress: (s) => ({ ratio: clamp01(s.cleanKatas / 3), label: `${Math.min(s.cleanKatas, 3)} of 3 clean draws` }),
  },
];

export const MISSIONS_BY_KEY: ReadonlyMap<string, Mission> = new Map(
  MISSIONS.map((m) => [m.key, m])
);
