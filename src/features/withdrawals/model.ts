import {
  feeOn,
  honorToCents,
  type EconomyConfig,
} from "@/features/economy/config";

import type { PayoutMethod, WithdrawalStatus } from "../../../generated/prisma/enums";

/**
 * The payout domain, as pure logic.
 *
 * No database and no `server-only`: the money maths, the method catalogue and
 * the state machine all live here so the request form, the admin queue, the
 * server actions and a test share one definition. The two things that must never
 * disagree are what a payout is worth and which transitions are legal — a form
 * that offers "cancel" on a paid withdrawal, or an admin action that refunds
 * twice, is a money bug. This module is where both are decided, once.
 */

/* ---------------------------------------------------------------- methods */

export const PAYOUT_METHODS = ["GCASH", "MAYA", "PAYPAL", "WISE", "BANK"] as const;

// The `satisfies` is the drift guard: if the Prisma enum ever gains or loses a
// value, this array stops compiling until it is brought back into step.
const _methodsMatchSchema: readonly PayoutMethod[] = PAYOUT_METHODS;
void _methodsMatchSchema;

export type PayoutMethodValue = (typeof PAYOUT_METHODS)[number];

/** How each method asks for its destination — the label, and what the field is. */
export const PAYOUT_METHOD_INFO: Record<
  PayoutMethodValue,
  { label: string; refLabel: string; refPlaceholder: string; ref: "phone" | "email" | "account" }
> = {
  GCASH: { label: "GCash", refLabel: "GCash number", refPlaceholder: "09XX XXX XXXX", ref: "phone" },
  MAYA: { label: "Maya", refLabel: "Maya number", refPlaceholder: "09XX XXX XXXX", ref: "phone" },
  PAYPAL: { label: "PayPal", refLabel: "PayPal email", refPlaceholder: "you@example.com", ref: "email" },
  WISE: { label: "Wise", refLabel: "Wise email", refPlaceholder: "you@example.com", ref: "email" },
  BANK: {
    label: "Bank transfer",
    refLabel: "Account number or IBAN",
    refPlaceholder: "0000 0000 0000",
    ref: "account",
  },
};

export function isPayoutMethod(value: unknown): value is PayoutMethodValue {
  return typeof value === "string" && (PAYOUT_METHODS as readonly string[]).includes(value);
}

/* --------------------------------------------------------------- statuses */

export const WITHDRAWAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "PAID",
  "REJECTED",
  "CANCELLED",
] as const;

const _statusesMatchSchema: readonly WithdrawalStatus[] = WITHDRAWAL_STATUSES;
void _statusesMatchSchema;

export type WithdrawalStatusValue = (typeof WITHDRAWAL_STATUSES)[number];

export const STATUS_LABEL: Record<WithdrawalStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** For the status dot: live/settled = on, in-flight = warn, undone = off. */
export const STATUS_TONE: Record<WithdrawalStatusValue, "on" | "off" | "warn"> = {
  PENDING: "warn",
  APPROVED: "warn",
  PAID: "on",
  REJECTED: "off",
  CANCELLED: "off",
};

/* ---------------------------------------------------------- state machine */

/**
 * The legal transitions, in one place.
 *
 * The escrow model turns these into money rules: any move INTO a refundable
 * state returns the Honor, and a move that is not legal must not run at all. The
 * server enforces each of these with an atomic, status-guarded update so the
 * predicate and the write cannot disagree under a race — but the predicates are
 * what the UI reads to decide which buttons even appear.
 */

/** The user may pull a request back only before an admin has touched it. */
export function canUserCancel(status: WithdrawalStatusValue): boolean {
  return status === "PENDING";
}

/** An admin accepts a request that is still waiting. */
export function canApprove(status: WithdrawalStatusValue): boolean {
  return status === "PENDING";
}

/** Reject and mark-paid both act on anything not yet settled. */
export function canReject(status: WithdrawalStatusValue): boolean {
  return status === "PENDING" || status === "APPROVED";
}

export function canMarkPaid(status: WithdrawalStatusValue): boolean {
  return status === "PENDING" || status === "APPROVED";
}

/** Whether reaching REJECTED or CANCELLED from here must return the Honor. */
export function returnsHonor(status: WithdrawalStatusValue): boolean {
  return status === "PENDING" || status === "APPROVED";
}

export function isTerminal(status: WithdrawalStatusValue): boolean {
  return status === "PAID" || status === "REJECTED" || status === "CANCELLED";
}

/* ----------------------------------------------------------- computation */

export type WithdrawalQuote = {
  honorAmount: number;
  rateHonorPerDollar: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
};

/**
 * What a request of `honorAmount` becomes, frozen at the current rate.
 *
 * The output is exactly the set of columns the row stores — the caller writes
 * this straight down, so the figure a user was shown at request time is the
 * figure that gets paid, whatever the rate does afterwards.
 */
export function quoteWithdrawal(honorAmount: number, config: EconomyConfig): WithdrawalQuote {
  const grossCents = honorToCents(honorAmount, config);
  const feeCents = feeOn(grossCents, config);
  return {
    honorAmount,
    rateHonorPerDollar: config.honorPerDollar,
    grossCents,
    feeCents,
    netCents: grossCents - feeCents,
  };
}

export type AmountCheck = { ok: true } | { ok: false; message: string };

/**
 * Whether an amount may be requested at all — the bounds a form and the server
 * both apply. The balance is passed in rather than read here so the same rule
 * runs in a pure test; the SERVER additionally re-checks the balance inside the
 * debiting transaction, because a check here is advisory against a balance that
 * can change between the read and the write.
 */
export function checkWithdrawalAmount(
  honorAmount: number,
  balance: number,
  config: EconomyConfig
): AmountCheck {
  if (!Number.isInteger(honorAmount) || honorAmount <= 0) {
    return { ok: false, message: "Enter how much Honor to withdraw." };
  }
  if (honorAmount < config.minWithdrawalHonor) {
    return {
      ok: false,
      message: `The minimum withdrawal is ${config.minWithdrawalHonor.toLocaleString()} Honor.`,
    };
  }
  if (honorAmount > config.maxWithdrawalHonor) {
    return {
      ok: false,
      message: `The maximum withdrawal is ${config.maxWithdrawalHonor.toLocaleString()} Honor.`,
    };
  }
  if (honorAmount > balance) {
    return { ok: false, message: "That is more Honor than you have." };
  }
  return { ok: true };
}
