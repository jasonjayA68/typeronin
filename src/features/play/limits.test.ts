import { describe, expect, it } from "vitest";

import {
  DEFAULT_PLAY_LIMITS,
  applyHonorMultiplier,
  cooldownLeftSeconds,
  gamesRemaining,
  isLimitReached,
  parsePlayLimits,
  type PlayLimits,
} from "@/features/play/limits";

/**
 * The daily-limit rules. Two things matter most and neither is obvious by eye:
 * the difference between "no limit" (null) and "limit reached" (zero), and that
 * the shipped default now caps play at 50 games a day (the product rule).
 */

// An explicit "no limit" config, for the null-vs-zero cases. Distinct from the
// default, which now carries the 50/day cap.
const off: PlayLimits = { maxGamesPerDay: 0, cooldownSeconds: 0, honorMultiplierPercent: 100 };
const capped: PlayLimits = { maxGamesPerDay: 5, cooldownSeconds: 30, honorMultiplierPercent: 100 };

describe("the shipped default", () => {
  it("caps play at 50 games a day, with no cooldown or multiplier change", () => {
    expect(DEFAULT_PLAY_LIMITS.maxGamesPerDay).toBe(50);
    expect(gamesRemaining(0, DEFAULT_PLAY_LIMITS)).toBe(50);
    expect(gamesRemaining(50, DEFAULT_PLAY_LIMITS)).toBe(0);
    expect(isLimitReached(50, DEFAULT_PLAY_LIMITS)).toBe(true);
    expect(isLimitReached(49, DEFAULT_PLAY_LIMITS)).toBe(false);
    expect(cooldownLeftSeconds(Date.now(), Date.now(), DEFAULT_PLAY_LIMITS)).toBe(0);
    expect(applyHonorMultiplier(123, DEFAULT_PLAY_LIMITS)).toBe(123);
  });

  it("is itself valid", () => {
    expect(parsePlayLimits(DEFAULT_PLAY_LIMITS)).toEqual(DEFAULT_PLAY_LIMITS);
  });
});

describe("gamesRemaining", () => {
  it("is null when unlimited, a count when capped", () => {
    expect(gamesRemaining(2, off)).toBeNull();
    expect(gamesRemaining(2, capped)).toBe(3);
  });

  it("never goes negative when the played count exceeds a lowered limit", () => {
    expect(gamesRemaining(9, capped)).toBe(0);
  });

  it("distinguishes null (unlimited) from 0 (used up)", () => {
    expect(gamesRemaining(0, off)).toBeNull();
    expect(gamesRemaining(5, capped)).toBe(0);
  });
});

describe("isLimitReached", () => {
  it("is true only at or past the cap, and never when uncapped", () => {
    expect(isLimitReached(4, capped)).toBe(false);
    expect(isLimitReached(5, capped)).toBe(true);
    expect(isLimitReached(6, capped)).toBe(true);
    expect(isLimitReached(1_000_000, off)).toBe(false);
  });
});

describe("cooldownLeftSeconds", () => {
  const now = 1_000_000_000;

  it("is zero with no cooldown configured", () => {
    expect(cooldownLeftSeconds(now - 1000, now, off)).toBe(0);
  });

  it("is zero when nothing has been played", () => {
    expect(cooldownLeftSeconds(null, now, capped)).toBe(0);
  });

  it("counts down and rounds up", () => {
    // 10s ago, 30s cooldown → 20s left.
    expect(cooldownLeftSeconds(now - 10_000, now, capped)).toBe(20);
    // 29.5s ago → 0.5s left, rounded up to 1.
    expect(cooldownLeftSeconds(now - 29_500, now, capped)).toBe(1);
  });

  it("is zero once the cooldown has elapsed", () => {
    expect(cooldownLeftSeconds(now - 40_000, now, capped)).toBe(0);
  });
});

describe("applyHonorMultiplier", () => {
  it("leaves Honor unchanged at 100%", () => {
    expect(applyHonorMultiplier(250, capped)).toBe(250);
  });

  it("scales and floors in the house's favour", () => {
    const boosted: PlayLimits = { ...capped, honorMultiplierPercent: 150 };
    expect(applyHonorMultiplier(3, boosted)).toBe(4); // 4.5 → 4
    expect(applyHonorMultiplier(200, boosted)).toBe(300);
  });

  it("can zero out Honor with a 0% multiplier", () => {
    const none: PlayLimits = { ...capped, honorMultiplierPercent: 0 };
    expect(applyHonorMultiplier(500, none)).toBe(0);
  });
});

describe("parsePlayLimits", () => {
  it("strips unknown keys", () => {
    const parsed = parsePlayLimits({ ...capped, sneaky: true });
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("sneaky");
  });

  it("refuses a negative limit or cooldown", () => {
    expect(parsePlayLimits({ ...capped, maxGamesPerDay: -1 })).toBeNull();
    expect(parsePlayLimits({ ...capped, cooldownSeconds: -5 })).toBeNull();
  });

  it("coerces numeric strings from a form", () => {
    expect(
      parsePlayLimits({ maxGamesPerDay: "5", cooldownSeconds: "30", honorMultiplierPercent: "100" })
    ).toEqual(capped);
  });

  it("rejects junk", () => {
    expect(parsePlayLimits(null)).toBeNull();
    expect(parsePlayLimits("nope")).toBeNull();
  });
});
