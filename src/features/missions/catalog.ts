import type { PlayerStats } from "@/features/gamification/player-stats";

/**
 * The ongoing goals a player works toward across every game.
 *
 * Missions have no database table of their own — they are defined here, their
 * progress is derived from session history (the same PlayerStats the achievements
 * read), and only their *completion* is persisted, as a MissionClaim row. That
 * keeps a mission's definition in code review rather than in data, and means a
 * mission cannot pay twice (the claim's composite key is the guard).
 *
 * `key` is the stable identity written to MissionClaim; never reuse a key for a
 * different mission — the keys keep their original wording even where the title a
 * player reads has changed. `icon` is a lucide name the page maps to a component.
 * Every condition is reachable through the two games that pay Honor: Typing
 * Phrases and Find the Word.
 *
 * Titles, descriptions and progress labels are player-facing. Keep them plain:
 * short sentences, no game jargon, nothing that needs local knowledge to read.
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
    title: "No Mistakes",
    description: "Finish one Typing Phrases game without a single wrong key.",
    icon: "swords",
    honor: 250,
    xp: 60,
    met: (s) => s.cleanKatas >= 1,
    progress: (s) => ({ ratio: clamp01(s.cleanKatas / 1), label: `${Math.min(s.cleanKatas, 1)} of 1 game with no mistakes` }),
  },
  {
    key: "dawn-practice",
    title: "Five Days of Practice",
    description: "Play on five different days. The days do not need to be in a row.",
    icon: "sunrise",
    honor: 400,
    xp: 100,
    met: (s) => s.distinctDays >= 5,
    progress: (s) => ({ ratio: clamp01(s.distinctDays / 5), label: `${Math.min(s.distinctDays, 5)} of 5 days` }),
  },
  {
    key: "still-water",
    title: "Steady Rhythm",
    description: "Keep your Rhythm score above 80 for a whole Typing Phrases game.",
    icon: "waves",
    honor: 350,
    xp: 90,
    met: (s) => s.maRunsAbove80 >= 1,
    progress: (s) => ({ ratio: clamp01(s.maxMa / 80), label: `Best Rhythm score: ${s.maxMa} of 80` }),
  },
  {
    key: "hundred-draws",
    title: "One Hundred Games",
    description: "Finish one hundred games. Typing Phrases and Find the Word both count.",
    icon: "flame",
    honor: 300,
    xp: 80,
    met: (s) => s.totalRuns >= 100,
    progress: (s) => ({ ratio: clamp01(s.totalRuns / 100), label: `${Math.min(s.totalRuns, 100)} of 100 games` }),
  },
  {
    key: "long-road",
    title: "Strong in Both Games",
    description: "Score above 95% in one Typing Phrases game and one Find the Word round.",
    icon: "mountain",
    honor: 600,
    xp: 150,
    met: (s) => s.katas95 >= 1 && s.scrolls95 >= 1,
    progress: (s) => ({
      ratio: ((s.katas95 >= 1 ? 1 : 0) + (s.scrolls95 >= 1 ? 1 : 0)) / 2,
      label: `${(s.katas95 >= 1 ? 1 : 0) + (s.scrolls95 >= 1 ? 1 : 0)} of 2 games above 95%`,
    }),
  },
  {
    key: "no-second-chance",
    title: "Three Clean Games",
    description: "Finish three Typing Phrases games without a single wrong key.",
    icon: "swords",
    honor: 500,
    xp: 120,
    met: (s) => s.cleanKatas >= 3,
    progress: (s) => ({ ratio: clamp01(s.cleanKatas / 3), label: `${Math.min(s.cleanKatas, 3)} of 3 games with no mistakes` }),
  },
];

export const MISSIONS_BY_KEY: ReadonlyMap<string, Mission> = new Map(
  MISSIONS.map((m) => [m.key, m])
);
