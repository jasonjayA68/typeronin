import { describe, expect, it } from "vitest";

import type { PlayerStats } from "@/features/gamification/player-stats";
import { TRIAL_REQUIREMENTS } from "@/features/gamification/trials";
import { MISSIONS_BY_KEY } from "@/features/missions/catalog";

/**
 * The alignment between the two games (Typing Phrases and Find the Word — "kata"
 * and "scroll" in the code) and the extra Honor paid by achievements and missions
 * lives entirely in these predicates. If a threshold moves, that is a product
 * decision and this test should move with it — but it must never move by
 * accident.
 *
 * Slugs, keys and stat fields keep their original wording; only the labels a
 * player reads changed, and no assertion here depends on those.
 */

const ZERO: PlayerStats = {
  typingRuns: 0,
  scrollRuns: 0,
  totalRuns: 0,
  cleanKatas: 0,
  katas95: 0,
  maxMa: 0,
  maRunsAbove80: 0,
  hardRuns: 0,
  perfectScrolls: 0,
  scrolls95: 0,
  distinctDays: 0,
  streakDays: 0,
};

const stats = (over: Partial<PlayerStats>): PlayerStats => ({ ...ZERO, ...over });

const trialMet = (slug: string, s: PlayerStats) => TRIAL_REQUIREMENTS[slug]!.met(s);
const missionMet = (key: string, s: PlayerStats) => MISSIONS_BY_KEY.get(key)!.met(s);

describe("Achievements map to real play", () => {
  it("a fresh account has earned nothing", () => {
    for (const slug of Object.keys(TRIAL_REQUIREMENTS)) {
      expect(trialMet(slug, ZERO), slug).toBe(false);
    }
  });

  it("rectitude: one clean kata", () => {
    expect(trialMet("rectitude", stats({ cleanKatas: 1 }))).toBe(true);
  });

  it("courage: any hard run", () => {
    expect(trialMet("courage", stats({ hardRuns: 1 }))).toBe(true);
  });

  it("benevolence: two distinct days", () => {
    expect(trialMet("benevolence", stats({ distinctDays: 1 }))).toBe(false);
    expect(trialMet("benevolence", stats({ distinctDays: 2 }))).toBe(true);
  });

  it("respect: a perfect scroll", () => {
    expect(trialMet("respect", stats({ perfectScrolls: 1 }))).toBe(true);
  });

  it("honesty: three runs on the record", () => {
    expect(trialMet("honesty", stats({ totalRuns: 2 }))).toBe(false);
    expect(trialMet("honesty", stats({ totalRuns: 3 }))).toBe(true);
  });

  it("honour: three clean katas", () => {
    expect(trialMet("honour", stats({ cleanKatas: 2 }))).toBe(false);
    expect(trialMet("honour", stats({ cleanKatas: 3 }))).toBe(true);
  });

  it("loyalty: seven distinct days", () => {
    expect(trialMet("loyalty", stats({ distinctDays: 6 }))).toBe(false);
    expect(trialMet("loyalty", stats({ distinctDays: 7 }))).toBe(true);
  });
});

describe("Missions map to real play", () => {
  it("a fresh account has completed nothing", () => {
    for (const key of MISSIONS_BY_KEY.keys()) {
      expect(missionMet(key, ZERO), key).toBe(false);
    }
  });

  it("the unbroken line: one clean kata", () => {
    expect(missionMet("unbroken-line", stats({ cleanKatas: 1 }))).toBe(true);
  });

  it("dawn practice: five distinct days", () => {
    expect(missionMet("dawn-practice", stats({ distinctDays: 4 }))).toBe(false);
    expect(missionMet("dawn-practice", stats({ distinctDays: 5 }))).toBe(true);
  });

  it("still water: a run holding Ma at 80+", () => {
    expect(missionMet("still-water", stats({ maRunsAbove80: 1 }))).toBe(true);
  });

  it("one hundred draws: 100 total runs", () => {
    expect(missionMet("hundred-draws", stats({ totalRuns: 99 }))).toBe(false);
    expect(missionMet("hundred-draws", stats({ totalRuns: 100 }))).toBe(true);
  });

  it("the long road: a 95% kata AND a 95% scroll", () => {
    expect(missionMet("long-road", stats({ katas95: 1 }))).toBe(false);
    expect(missionMet("long-road", stats({ scrolls95: 1 }))).toBe(false);
    expect(missionMet("long-road", stats({ katas95: 1, scrolls95: 1 }))).toBe(true);
  });

  it("no second chance: three clean katas", () => {
    expect(missionMet("no-second-chance", stats({ cleanKatas: 2 }))).toBe(false);
    expect(missionMet("no-second-chance", stats({ cleanKatas: 3 }))).toBe(true);
  });

  it("progress ratios stay within 0..1 even past the threshold", () => {
    for (const m of MISSIONS_BY_KEY.values()) {
      const big = stats({
        cleanKatas: 99,
        distinctDays: 99,
        maxMa: 999,
        maRunsAbove80: 9,
        totalRuns: 9999,
        katas95: 9,
        scrolls95: 9,
      });
      const { ratio } = m.progress(big);
      expect(ratio, m.key).toBeGreaterThanOrEqual(0);
      expect(ratio, m.key).toBeLessThanOrEqual(1);
    }
  });
});
