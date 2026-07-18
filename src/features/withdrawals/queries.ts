import "server-only";

import { prisma } from "@/lib/prisma";

import type { Prisma } from "../../../generated/prisma/client";

/**
 * Payout reads.
 *
 * The wallet totals are the only slightly delicate part: "total withdrawn" is
 * the sum of what was actually PAID, in the cents each payout was frozen at —
 * never the live rate applied to old rows, which would re-price history every
 * time an admin changed the conversion. "Pending" is everything still in flight,
 * the Honor an escrow is holding that has not yet come back or been paid out.
 */

export type WalletTotals = {
  /** Cash actually paid out, summed from the frozen cents. */
  totalWithdrawnCents: number;
  /** Cash value of requests still in flight. */
  pendingCents: number;
  /** Honor held against in-flight requests — the amount off the balance. */
  pendingHonor: number;
  /** How many requests are still open. */
  pendingCount: number;
};

const IN_FLIGHT = ["PENDING", "APPROVED"] as const;

export async function getWalletTotals(profileId: string): Promise<WalletTotals> {
  try {
    const [paid, pending] = await Promise.all([
      prisma.withdrawal.aggregate({
        where: { profileId, status: "PAID" },
        _sum: { netCents: true },
      }),
      prisma.withdrawal.aggregate({
        where: { profileId, status: { in: [...IN_FLIGHT] } },
        _sum: { netCents: true, honorAmount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      totalWithdrawnCents: paid._sum.netCents ?? 0,
      pendingCents: pending._sum.netCents ?? 0,
      pendingHonor: pending._sum.honorAmount ?? 0,
      pendingCount: pending._count._all,
    };
  } catch (error) {
    // The wallet is on the dashboard; a totals read is never worth a 500. Zeroes
    // are the honest fallback — nothing is claimed that cannot be confirmed.
    console.error("getWalletTotals failed", error);
    return { totalWithdrawnCents: 0, pendingCents: 0, pendingHonor: 0, pendingCount: 0 };
  }
}

/** The columns a history row shows — both the user's list and the admin queue. */
export const withdrawalSelect = {
  id: true,
  method: true,
  status: true,
  accountName: true,
  accountRef: true,
  details: true,
  honorAmount: true,
  rateHonorPerDollar: true,
  grossCents: true,
  feeCents: true,
  netCents: true,
  reference: true,
  adminNote: true,
  createdAt: true,
  resolvedAt: true,
  paidAt: true,
} satisfies Prisma.WithdrawalSelect;

export type WithdrawalRow = Prisma.WithdrawalGetPayload<{ select: typeof withdrawalSelect }>;

/** One user's own history, newest first. */
export async function listUserWithdrawals(profileId: string): Promise<WithdrawalRow[]> {
  return prisma.withdrawal.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: withdrawalSelect,
  });
}
