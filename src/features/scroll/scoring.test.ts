import { describe, expect, it } from "vitest";

import { computeScrollHonor, validateScrollResult } from "@/features/scroll/scoring";

/**
 * SCROLL scoring. Honor is the server's to compute, so it must be predictable
 * from the counts; and the validator is the arithmetic floor that refuses a
 * result that could not have happened before any Honor is reckoned at all.
 */

describe("computeScrollHonor", () => {
  it("pays per correct answer, scaled by difficulty", () => {
    expect(computeScrollHonor(5, 0, "EASY")).toBe(40); // 5 × 8
    expect(computeScrollHonor(5, 0, "MEDIUM")).toBe(60); // 5 × 12
    expect(computeScrollHonor(5, 0, "HARD")).toBe(90); // 5 × 18
  });

  it("pays nothing for a round with no correct answers", () => {
    expect(computeScrollHonor(0, 0, "HARD")).toBe(0);
  });

  it("adds a combo bonus of 10% per five-in-a-row", () => {
    // 10 correct MEDIUM = 120 base; a 5-combo adds 10% → 132.
    expect(computeScrollHonor(10, 5, "MEDIUM")).toBe(132);
    // A 10-combo adds 20% → 144.
    expect(computeScrollHonor(10, 10, "MEDIUM")).toBe(144);
  });

  it("caps the combo bonus at +50%", () => {
    // A 100-combo would be +200% uncapped; capped at +50% → 120 × 1.5 = 180.
    expect(computeScrollHonor(10, 100, "MEDIUM")).toBe(180);
  });
});

describe("validateScrollResult", () => {
  const base = { questionCount: 10, correctCount: 7, wrongCount: 3, maxCombo: 4 };

  it("accepts a consistent result", () => {
    expect(validateScrollResult(base).ok).toBe(true);
  });

  it("refuses more answers than questions", () => {
    expect(validateScrollResult({ ...base, correctCount: 8, wrongCount: 5 }).ok).toBe(false);
  });

  it("refuses a combo longer than the correct answers", () => {
    expect(validateScrollResult({ ...base, correctCount: 3, maxCombo: 4 }).ok).toBe(false);
  });

  it("refuses non-integer or negative counts", () => {
    expect(validateScrollResult({ ...base, correctCount: -1 }).ok).toBe(false);
    expect(validateScrollResult({ ...base, maxCombo: 2.5 }).ok).toBe(false);
  });

  it("refuses a round length the game does not play", () => {
    expect(validateScrollResult({ ...base, questionCount: 0 }).ok).toBe(false);
    expect(validateScrollResult({ ...base, questionCount: 999 }).ok).toBe(false);
  });

  it("allows a perfect round", () => {
    expect(validateScrollResult({ questionCount: 10, correctCount: 10, wrongCount: 0, maxCombo: 10 }).ok).toBe(
      true
    );
  });
});
