import { z } from "zod";

/**
 * The Honor economy, as configuration.
 *
 * "The conversion rate must NOT be hardcoded." So it lives in the database, in
 * the `Setting` table, under one key — `economy` — as a single validated JSON
 * object. One row rather than a row per knob, because these values are read and
 * written together: a partial update that set a new maximum without seeing the
 * minimum is how a max-below-min slips in, and a wallet that reads five keys is
 * five chances for one to be missing.
 *
 * This module is pure — no database, no `server-only`. The reader that loads a
 * row lives in `service.ts`; the money maths and the schema live here so a
 * dashboard, an admin form and a test can all share exactly one definition of
 * what a valid economy is and what a balance is worth.
 *
 * A NOTE ON MONEY. Every amount that represents cash is in integer **cents**,
 * and every amount that represents earned currency is in integer **Honor**.
 * Nothing here produces a floating-point dollar amount except the final
 * `formatCash`, at the very edge, for a human to read. Float dollars that get
 * summed are how a balance ends up a hundredth of a cent wrong and a ledger
 * stops reconciling.
 */

export type EconomyConfig = {
  /**
   * Honor to the dollar. 1000 means 1000 Honor is worth $1.
   *
   * The rate itself, and the one value the whole feature exists to make
   * editable. An integer and at least 1 — a rate of zero is a division by zero
   * dressed as a giveaway.
   */
  honorPerDollar: number;

  /** The floor and ceiling of a single withdrawal, in Honor. */
  minWithdrawalHonor: number;
  maxWithdrawalHonor: number;

  /** How many withdrawals one account may request in a day. */
  dailyWithdrawalLimit: number;

  /**
   * A cut taken from each payout, as a whole percent, 0–100. Optional in spirit
   * — 0 disables it — but always present as a number so nothing downstream has
   * to guess whether "unset" means zero.
   */
  processingFeePercent: number;
};

/**
 * What the economy is before an admin has touched it.
 *
 * Also the fallback whenever the stored row is missing or unreadable (see
 * `service.ts`). These are deliberately conservative: a real rate an operator
 * sets on purpose, a withdrawal window wide enough to be usable, and no fee —
 * the safe default for a knob is the one that takes nothing.
 */
export const DEFAULT_ECONOMY: EconomyConfig = {
  honorPerDollar: 1000,
  minWithdrawalHonor: 5000,
  maxWithdrawalHonor: 500_000,
  dailyWithdrawalLimit: 1,
  processingFeePercent: 0,
};

/**
 * The gate every stored or submitted economy passes through.
 *
 * The cross-field rule — min at or below max — matters as much as the per-field
 * bounds: each field can be individually valid while the pair is nonsense, and a
 * minimum above the maximum is a withdrawal form nobody can ever satisfy.
 */
export const economySchema = z
  .object({
    honorPerDollar: z.coerce
      .number()
      .int("The rate must be a whole number of Honor.")
      .min(1, "A rate of zero would make every balance worth nothing — or everything.")
      .max(10_000_000),
    minWithdrawalHonor: z.coerce.number().int().min(0).max(1_000_000_000),
    maxWithdrawalHonor: z.coerce.number().int().min(1).max(1_000_000_000),
    dailyWithdrawalLimit: z.coerce
      .number()
      .int()
      .min(1, "At least one withdrawal a day, or the door is simply shut.")
      .max(100),
    processingFeePercent: z.coerce
      .number()
      .int("A fee is a whole percent.")
      .min(0)
      .max(100, "A fee cannot take more than the whole payout."),
  })
  .refine((value) => value.minWithdrawalHonor <= value.maxWithdrawalHonor, {
    message: "The minimum withdrawal cannot be above the maximum.",
    path: ["minWithdrawalHonor"],
  });

/**
 * Coerce an unknown value into a valid config, or return null.
 *
 * Used by the reader against whatever JSON the `Setting` row holds, and by the
 * admin action against whatever the form sent. Returning the PARSED value, not
 * the input, is the point — an old row with an extra key loses it here rather
 * than carrying it forward forever.
 */
export function parseEconomy(input: unknown): EconomyConfig | null {
  const result = economySchema.safeParse(input);
  return result.success ? result.data : null;
}

/* --------------------------------------------------------------- money maths */

/**
 * What a pile of Honor is worth, in whole cents.
 *
 * Floored, never rounded up: crediting a fraction of a cent that was not earned
 * is the kind of rounding that, multiplied across a user base, becomes real
 * money the ledger cannot account for. The house never rounds in the user's
 * favour by accident.
 */
export function honorToCents(honor: number, config: EconomyConfig): number {
  if (honor <= 0) return 0;
  return Math.floor((honor * 100) / config.honorPerDollar);
}

/** The fee on a gross payout, in the same unit it was given. */
export function feeOn(amount: number, config: EconomyConfig): number {
  if (config.processingFeePercent <= 0) return 0;
  return Math.floor((amount * config.processingFeePercent) / 100);
}

/** Cents as "$1,234.56", for display only — the one place floats are allowed. */
export function formatCash(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** A balance straight to a dollar string, the pairing the wallet actually uses. */
export function honorToCash(honor: number, config: EconomyConfig): string {
  return formatCash(honorToCents(honor, config));
}
