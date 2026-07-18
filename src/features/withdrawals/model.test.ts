import { describe, expect, it } from "vitest";

import type { EconomyConfig } from "@/features/economy/config";
import {
  canApprove,
  canMarkPaid,
  canReject,
  canUserCancel,
  checkWithdrawalAmount,
  isTerminal,
  quoteWithdrawal,
  returnsHonor,
  type WithdrawalStatusValue,
} from "@/features/withdrawals/model";

/**
 * The payout domain. These are money rules and state rules, and both fail
 * silently if wrong: a mis-priced quote pays the wrong amount, and a mislabelled
 * transition either refunds twice or strands Honor. The cases are the spec.
 */

const config: EconomyConfig = {
  honorPerDollar: 1000,
  minWithdrawalHonor: 5000,
  maxWithdrawalHonor: 500_000,
  dailyWithdrawalLimit: 1,
  processingFeePercent: 0,
};

describe("quoteWithdrawal", () => {
  it("freezes the current rate into the quote", () => {
    const quote = quoteWithdrawal(50_000, config);
    expect(quote.rateHonorPerDollar).toBe(1000);
    expect(quote.grossCents).toBe(5000); // $50.00
    expect(quote.feeCents).toBe(0);
    expect(quote.netCents).toBe(5000);
  });

  it("subtracts a percentage fee from the net, in the house's favour", () => {
    const withFee: EconomyConfig = { ...config, processingFeePercent: 10 };
    const quote = quoteWithdrawal(50_000, withFee);
    expect(quote.grossCents).toBe(5000);
    expect(quote.feeCents).toBe(500); // 10% of $50
    expect(quote.netCents).toBe(4500); // user receives $45
  });

  it("never lets net exceed gross", () => {
    const heavy: EconomyConfig = { ...config, processingFeePercent: 100 };
    const quote = quoteWithdrawal(50_000, heavy);
    expect(quote.netCents).toBe(0);
    expect(quote.netCents).toBeLessThanOrEqual(quote.grossCents);
  });
});

describe("checkWithdrawalAmount", () => {
  it("accepts an amount within the bounds and the balance", () => {
    expect(checkWithdrawalAmount(50_000, 100_000, config).ok).toBe(true);
  });

  it("refuses below the minimum", () => {
    expect(checkWithdrawalAmount(4000, 100_000, config).ok).toBe(false);
  });

  it("refuses above the maximum", () => {
    expect(checkWithdrawalAmount(600_000, 1_000_000, config).ok).toBe(false);
  });

  it("refuses more than the balance — the core of not spending Honor you lack", () => {
    expect(checkWithdrawalAmount(50_000, 40_000, config).ok).toBe(false);
  });

  it("refuses a non-integer or non-positive amount", () => {
    expect(checkWithdrawalAmount(0, 100_000, config).ok).toBe(false);
    expect(checkWithdrawalAmount(-5000, 100_000, config).ok).toBe(false);
    expect(checkWithdrawalAmount(5000.5, 100_000, config).ok).toBe(false);
  });

  it("accepts exactly the minimum and exactly the balance", () => {
    expect(checkWithdrawalAmount(5000, 5000, config).ok).toBe(true);
  });
});

describe("state machine", () => {
  const all: WithdrawalStatusValue[] = ["PENDING", "APPROVED", "PAID", "REJECTED", "CANCELLED"];

  it("lets a user cancel only while pending", () => {
    expect(all.filter(canUserCancel)).toEqual(["PENDING"]);
  });

  it("lets an admin approve only a pending request", () => {
    expect(all.filter(canApprove)).toEqual(["PENDING"]);
  });

  it("lets an admin reject or pay anything not yet settled", () => {
    expect(all.filter(canReject)).toEqual(["PENDING", "APPROVED"]);
    expect(all.filter(canMarkPaid)).toEqual(["PENDING", "APPROVED"]);
  });

  it("returns Honor exactly for the states that still hold it", () => {
    // The escrow invariant: PENDING and APPROVED hold Honor; the terminal
    // states have already resolved it one way or the other.
    expect(all.filter(returnsHonor)).toEqual(["PENDING", "APPROVED"]);
  });

  it("never offers an action on a settled payout", () => {
    for (const status of all.filter(isTerminal)) {
      expect(canUserCancel(status)).toBe(false);
      expect(canApprove(status)).toBe(false);
      expect(canReject(status)).toBe(false);
      expect(canMarkPaid(status)).toBe(false);
    }
  });

  it("agrees on which states are terminal", () => {
    expect(all.filter(isTerminal)).toEqual(["PAID", "REJECTED", "CANCELLED"]);
  });
});
