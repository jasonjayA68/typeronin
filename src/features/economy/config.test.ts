import { describe, expect, it } from "vitest";

import {
  DEFAULT_ECONOMY,
  feeOn,
  formatCash,
  honorToCash,
  honorToCents,
  parseEconomy,
  type EconomyConfig,
} from "@/features/economy/config";

/**
 * The economy's money maths and its validation gate.
 *
 * This is the kind of code a reviewer cannot confirm by eye and a typecheck
 * cannot catch: rounding that leaks a fraction of a cent, or a validator that
 * lets a minimum-above-maximum into the row every wallet reads. The cases below
 * are the specification for both.
 */

const config: EconomyConfig = {
  honorPerDollar: 1000,
  minWithdrawalHonor: 5000,
  maxWithdrawalHonor: 500_000,
  dailyWithdrawalLimit: 1,
  processingFeePercent: 0,
};

describe("honorToCents", () => {
  it("converts at the configured rate", () => {
    // 1000 Honor to the dollar → 1000 Honor is 100 cents.
    expect(honorToCents(1000, config)).toBe(100);
    expect(honorToCents(5000, config)).toBe(500);
  });

  it("floors rather than rounds up — the house never over-credits by accident", () => {
    // 1 Honor at 1000/$ is a tenth of a cent. It must round DOWN to zero, not up.
    expect(honorToCents(1, config)).toBe(0);
    // 1509 Honor is 150.9 cents → 150, never 151.
    expect(honorToCents(1509, config)).toBe(150);
  });

  it("treats zero and negatives as nothing", () => {
    expect(honorToCents(0, config)).toBe(0);
    expect(honorToCents(-1000, config)).toBe(0);
  });

  it("tracks the rate — a cheaper rate is worth more cash", () => {
    const cheap: EconomyConfig = { ...config, honorPerDollar: 100 };
    expect(honorToCents(1000, cheap)).toBe(1000); // $10.00
  });
});

describe("feeOn", () => {
  it("is nothing when the fee is zero", () => {
    expect(feeOn(10_000, config)).toBe(0);
  });

  it("takes a whole percent, floored", () => {
    const withFee: EconomyConfig = { ...config, processingFeePercent: 10 };
    expect(feeOn(1000, withFee)).toBe(100);
    // 155 * 10% = 15.5 → 15, floored in the house's favour.
    expect(feeOn(155, withFee)).toBe(15);
  });
});

describe("formatCash / honorToCash", () => {
  it("renders cents as a dollar string", () => {
    expect(formatCash(100)).toBe("$1.00");
    expect(formatCash(150_034)).toBe("$1,500.34");
    expect(formatCash(0)).toBe("$0.00");
  });

  it("goes from a balance straight to the string the wallet shows", () => {
    expect(honorToCash(500_000, config)).toBe("$500.00");
  });
});

describe("parseEconomy — the validation gate", () => {
  it("accepts a well-formed config and returns the parsed value", () => {
    const parsed = parseEconomy(config);
    expect(parsed).toEqual(config);
  });

  it("strips keys it was not told about", () => {
    const parsed = parseEconomy({ ...config, secretBackdoor: true });
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("secretBackdoor");
  });

  it("refuses a rate of zero — it would divide every balance by nothing", () => {
    expect(parseEconomy({ ...config, honorPerDollar: 0 })).toBeNull();
  });

  it("refuses a minimum above the maximum", () => {
    expect(
      parseEconomy({ ...config, minWithdrawalHonor: 900_000, maxWithdrawalHonor: 1000 })
    ).toBeNull();
  });

  it("refuses a fee over 100 percent", () => {
    expect(parseEconomy({ ...config, processingFeePercent: 150 })).toBeNull();
  });

  it("refuses a fractional rate", () => {
    expect(parseEconomy({ ...config, honorPerDollar: 100.5 })).toBeNull();
  });

  it("refuses a daily limit below one — the door would simply be shut", () => {
    expect(parseEconomy({ ...config, dailyWithdrawalLimit: 0 })).toBeNull();
  });

  it("coerces numeric strings, as a form would send them", () => {
    const parsed = parseEconomy({
      honorPerDollar: "1000",
      minWithdrawalHonor: "5000",
      maxWithdrawalHonor: "500000",
      dailyWithdrawalLimit: "1",
      processingFeePercent: "0",
    });
    expect(parsed).toEqual(config);
  });

  it("rejects junk outright", () => {
    expect(parseEconomy(null)).toBeNull();
    expect(parseEconomy("nope")).toBeNull();
    expect(parseEconomy({})).toBeNull();
  });
});

describe("DEFAULT_ECONOMY", () => {
  it("is itself valid — the fallback must never be a shape the reader rejects", () => {
    expect(parseEconomy(DEFAULT_ECONOMY)).toEqual(DEFAULT_ECONOMY);
  });

  it("takes no fee by default — the safe default for a knob is the one that takes nothing", () => {
    expect(DEFAULT_ECONOMY.processingFeePercent).toBe(0);
  });
});
