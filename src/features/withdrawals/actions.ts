"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { getEconomyConfig } from "@/features/economy/service";
import {
  PAYOUT_METHODS,
  PAYOUT_METHOD_INFO,
  canReject,
  checkWithdrawalAmount,
  quoteWithdrawal,
} from "@/features/withdrawals/model";
import { ensureProfile } from "@/features/profile/service";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";

/**
 * Payout mutations — the money-critical code.
 *
 * Two invariants hold everything together, and both are enforced in the database
 * rather than in a read-then-write that a second request can slip between:
 *
 *  1. ESCROW. Honor leaves the balance the instant a request is made, by a
 *     conditional decrement (`where honor >= amount`) that either moves the whole
 *     amount or nothing — so a balance can never go negative and can never fund
 *     two payouts. It returns only by an increment on the reverse transitions.
 *
 *  2. GUARDED TRANSITIONS. Every status change is an `updateMany` filtered on the
 *     states it is legal from. A refund runs only when that update actually moved
 *     the row (`count === 1`), so two concurrent rejects cannot both refund — the
 *     second finds the row already resolved and does nothing.
 *
 * Every balance move and its status change share one interactive transaction, so
 * a crash between them cannot leave Honor debited with no payout, or refunded
 * twice.
 */

export type WithdrawalActionResult = { ok: true } | { ok: false; message: string };
export type RequestResult = { ok: true; id: string } | { ok: false; message: string };

function refresh(id?: string) {
  revalidatePath("/withdrawals");
  revalidatePath("/dashboard");
  revalidatePath("/admin/withdrawals");
  if (id) revalidatePath(`/admin/withdrawals`);
}

/** Midnight UTC today — the window the daily limit counts within. */
function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* --------------------------------------------------------------- request */

const requestSchema = z.object({
  method: z.enum(PAYOUT_METHODS),
  accountName: z.string().trim().min(2, "Give the account holder's name.").max(120),
  accountRef: z.string().trim().min(3, "Give the payout destination.").max(160),
  details: z.string().trim().max(200),
  honorAmount: z.coerce.number().int("Enter a whole number of Honor.").positive(),
});

export async function requestWithdrawal(input: unknown): Promise<RequestResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in to request a withdrawal." };

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };
  }
  const data = parsed.data;

  // The destination has to look like the method expects — a PayPal "email" that
  // is a phone number is a payout that will bounce.
  if (PAYOUT_METHOD_INFO[data.method].ref === "email" && !EMAIL.test(data.accountRef)) {
    return { ok: false, message: `Enter a valid ${PAYOUT_METHOD_INFO[data.method].label} email.` };
  }

  const profile = await ensureProfile(user);
  const config = await getEconomyConfig();

  // Advisory — the authoritative balance check is the atomic debit below. This
  // is here for the good error messages (min/max/too much).
  const check = checkWithdrawalAmount(data.honorAmount, profile.honor, config);
  if (!check.ok) return check;

  const quote = quoteWithdrawal(data.honorAmount, config);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const today = await tx.withdrawal.count({
        where: { profileId: profile.id, createdAt: { gte: startOfUtcDay() } },
      });
      if (today >= config.dailyWithdrawalLimit) {
        return { ok: false as const, reason: "daily" as const };
      }

      // The escrow debit. Conditional, so it is all-or-nothing and can never
      // drive the balance below zero — the balance check and the write are one
      // atomic step, not two.
      const debit = await tx.profile.updateMany({
        where: { id: profile.id, honor: { gte: data.honorAmount } },
        data: { honor: { decrement: data.honorAmount } },
      });
      if (debit.count === 0) {
        return { ok: false as const, reason: "insufficient" as const };
      }

      const created = await tx.withdrawal.create({
        data: {
          profileId: profile.id,
          method: data.method,
          accountName: data.accountName,
          accountRef: data.accountRef,
          details: data.details || null,
          honorAmount: quote.honorAmount,
          rateHonorPerDollar: quote.rateHonorPerDollar,
          grossCents: quote.grossCents,
          feeCents: quote.feeCents,
          netCents: quote.netCents,
        },
        select: { id: true },
      });

      return { ok: true as const, id: created.id };
    });

    if (!result.ok) {
      return {
        ok: false,
        message:
          result.reason === "daily"
            ? config.dailyWithdrawalLimit === 1
              ? "You have already requested a withdrawal today. Try again tomorrow."
              : `You have reached today's limit of ${config.dailyWithdrawalLimit} withdrawals.`
            : "That is more Honor than you have.",
      };
    }

    await audit({
      actorId: user.id,
      action: "withdrawal.requested",
      entity: "Withdrawal",
      entityId: result.id,
      meta: {
        method: data.method,
        honorAmount: quote.honorAmount,
        netCents: quote.netCents,
        rate: quote.rateHonorPerDollar,
      },
    });

    refresh(result.id);
    return { ok: true, id: result.id };
  } catch (error) {
    console.error("requestWithdrawal failed", error);
    return { ok: false, message: "That withdrawal could not be requested." };
  }
}

/* ---------------------------------------------------------------- cancel */

/** A user pulls their own request back before an admin has touched it. */
export async function cancelWithdrawal(withdrawalId: string): Promise<WithdrawalActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };

  const id = z.uuid().safeParse(withdrawalId);
  if (!id.success) return { ok: false, message: "Unknown withdrawal." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.withdrawal.findUnique({
        where: { id: id.data },
        select: { profileId: true, status: true, honorAmount: true },
      });
      // Not found, or not theirs, or already resolved — the same answer, because
      // a user should not learn which of those it was about someone else's row.
      if (!row || row.profileId !== user.id || row.status !== "PENDING") {
        return { ok: false as const };
      }

      const moved = await tx.withdrawal.updateMany({
        where: { id: id.data, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      if (moved.count === 0) return { ok: false as const }; // raced with an admin

      // Refund the escrowed Honor. Runs only because the guarded update moved
      // the row, so it cannot run twice.
      await tx.profile.update({
        where: { id: row.profileId },
        data: { honor: { increment: row.honorAmount } },
      });

      return { ok: true as const, honorAmount: row.honorAmount };
    });

    if (!result.ok) {
      return { ok: false, message: "That withdrawal can no longer be cancelled." };
    }

    await audit({
      actorId: user.id,
      action: "withdrawal.cancelled",
      entity: "Withdrawal",
      entityId: id.data,
      meta: { honorRefunded: result.honorAmount },
    });

    refresh();
    return { ok: true };
  } catch (error) {
    console.error("cancelWithdrawal failed", error);
    return { ok: false, message: "That withdrawal could not be cancelled." };
  }
}

/* ------------------------------------------------------------- admin: approve */

export async function approveWithdrawal(withdrawalId: string): Promise<WithdrawalActionResult> {
  const { user } = await requirePermission("payouts:write");

  const id = z.uuid().safeParse(withdrawalId);
  if (!id.success) return { ok: false, message: "Unknown withdrawal." };

  try {
    // No money moves on approval — the Honor is already held. A guarded update
    // is all that is needed.
    const moved = await prisma.withdrawal.updateMany({
      where: { id: id.data, status: "PENDING" },
      data: { status: "APPROVED", resolvedById: user.id, resolvedAt: new Date() },
    });
    if (moved.count === 0) {
      return { ok: false, message: "Only a pending withdrawal can be approved." };
    }

    await audit({
      actorId: user.id,
      action: "withdrawal.approved",
      entity: "Withdrawal",
      entityId: id.data,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    console.error("approveWithdrawal failed", error);
    return { ok: false, message: "That withdrawal could not be approved." };
  }
}

/* -------------------------------------------------------------- admin: reject */

export async function rejectWithdrawal(
  withdrawalId: string,
  note = ""
): Promise<WithdrawalActionResult> {
  const { user } = await requirePermission("payouts:write");

  const id = z.uuid().safeParse(withdrawalId);
  if (!id.success) return { ok: false, message: "Unknown withdrawal." };

  const trimmedNote = note.trim().slice(0, 200);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.withdrawal.findUnique({
        where: { id: id.data },
        select: { status: true, honorAmount: true, profileId: true },
      });
      if (!row || !canReject(row.status)) return { ok: false as const };

      const moved = await tx.withdrawal.updateMany({
        where: { id: id.data, status: { in: ["PENDING", "APPROVED"] } },
        data: {
          status: "REJECTED",
          resolvedById: user.id,
          resolvedAt: new Date(),
          adminNote: trimmedNote || null,
        },
      });
      if (moved.count === 0) return { ok: false as const };

      // Return the escrowed Honor. Guarded update moved the row, so this is once.
      await tx.profile.update({
        where: { id: row.profileId },
        data: { honor: { increment: row.honorAmount } },
      });

      return { ok: true as const, honorAmount: row.honorAmount };
    });

    if (!result.ok) {
      return { ok: false, message: "That withdrawal can no longer be rejected." };
    }

    await audit({
      actorId: user.id,
      action: "withdrawal.rejected",
      entity: "Withdrawal",
      entityId: id.data,
      meta: { honorRefunded: result.honorAmount, note: trimmedNote || undefined },
    });

    refresh();
    return { ok: true };
  } catch (error) {
    console.error("rejectWithdrawal failed", error);
    return { ok: false, message: "That withdrawal could not be rejected." };
  }
}

/* ------------------------------------------------------------ admin: mark paid */

const paidSchema = z.object({
  reference: z.string().trim().min(2, "Add the transaction reference.").max(120),
});

export async function markWithdrawalPaid(
  withdrawalId: string,
  input: unknown
): Promise<WithdrawalActionResult> {
  const { user } = await requirePermission("payouts:write");

  const id = z.uuid().safeParse(withdrawalId);
  if (!id.success) return { ok: false, message: "Unknown withdrawal." };

  const parsed = paidSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Add a reference." };
  }

  try {
    // No refund path — the Honor stays spent, because it became the cash sent.
    // Guarded so a paid row cannot be paid twice.
    const now = new Date();
    const moved = await prisma.withdrawal.updateMany({
      where: { id: id.data, status: { in: ["PENDING", "APPROVED"] } },
      data: {
        status: "PAID",
        reference: parsed.data.reference,
        paidAt: now,
        resolvedById: user.id,
        resolvedAt: now,
      },
    });
    if (moved.count === 0) {
      return { ok: false, message: "Only a pending or approved withdrawal can be marked paid." };
    }

    await audit({
      actorId: user.id,
      action: "withdrawal.paid",
      entity: "Withdrawal",
      entityId: id.data,
      meta: { reference: parsed.data.reference },
    });

    refresh();
    return { ok: true };
  } catch (error) {
    console.error("markWithdrawalPaid failed", error);
    return { ok: false, message: "That withdrawal could not be marked paid." };
  }
}
