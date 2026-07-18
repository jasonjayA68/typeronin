import { describe, expect, it } from "vitest";

import { RANKS, rankForHonor, rankTier, rankUpBetween } from "@/features/gamification/ranks";

/**
 * Rank boundaries decide when the celebration fires. An off-by-one here either
 * throws confetti for a run that changed nothing, or swallows a real promotion —
 * both erode the one moment the modal exists for.
 */

describe("rankTier", () => {
  it("numbers the ladder 1..N", () => {
    expect(rankTier(RANKS[0])).toBe(1);
    expect(rankTier(RANKS[RANKS.length - 1])).toBe(RANKS.length);
  });
});

describe("rankUpBetween", () => {
  it("fires exactly on crossing a threshold", () => {
    // Ashigaru is 500. 490 → 510 crosses it.
    const up = rankUpBetween(490, 510);
    expect(up?.slug).toBe("ashigaru");
  });

  it("does not fire when the tier is unchanged", () => {
    expect(rankUpBetween(510, 900)).toBeNull(); // both Ashigaru
    expect(rankUpBetween(0, 400)).toBeNull(); // both Heimin
  });

  it("does not fire when landing exactly on the same held rank", () => {
    expect(rankUpBetween(500, 500)).toBeNull();
  });

  it("fires once for the highest rank reached when several tiers are skipped", () => {
    // 0 → 5000 clears Ashigaru, Bushi and Samurai (4000) in one leap.
    const up = rankUpBetween(0, 5000);
    expect(up?.slug).toBe(rankForHonor(5000).slug);
    expect(up?.slug).toBe("samurai");
  });

  it("never fires downward — a refund or correction is not a promotion", () => {
    expect(rankUpBetween(600, 400)).toBeNull();
    expect(rankUpBetween(5000, 0)).toBeNull();
  });

  it("fires on the boundary value itself", () => {
    // Reaching exactly 1500 is Bushi.
    expect(rankUpBetween(1499, 1500)?.slug).toBe("bushi");
  });
});
