"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

/**
 * Account moderation — the tools that protect the economy from cheating, bots,
 * and payout fraud. Every action here is gated on a permission and written to
 * the activity log, because an action like this is exactly the kind of thing that
 * has to be answerable for later.
 *
 * Two permissions, deliberately: account state (ban/suspend/flag/note) is
 * `users:write`; anything that touches money (freeze withdrawals, hold a payout)
 * is `payouts:write`. An operator may hold one without the other.
 *
 * State only — the ENFORCEMENT of these flags lives where the money and play
 * decisions are made (see features/withdrawals/actions.ts and the save actions),
 * so the check happens inside the same transaction as the thing it guards.
 */

export type ModerationResult = { ok: true; message?: string } | { ok: false; message: string };

const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED"] as const;

function refreshUser(profileId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${profileId}`);
}

/* --------------------------------------------------------- account status */

const statusSchema = z.object({
  profileId: z.uuid(),
  status: z.enum(ACCOUNT_STATUSES),
  reason: z.string().trim().max(300).default(""),
});

/** Ban, suspend, or reactivate an account. */
export async function setAccountStatus(input: unknown): Promise<ModerationResult> {
  const { user } = await requirePermission("users:write");

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check what you entered." };
  }
  const { profileId, status, reason } = parsed.data;

  // An admin cannot lock themselves out of their own account.
  if (profileId === user.id && status !== "ACTIVE") {
    return { ok: false, message: "You cannot suspend or ban your own account." };
  }

  try {
    const updated = await prisma.profile.updateMany({
      where: { id: profileId },
      data: { status, moderatedAt: new Date(), moderatedById: user.id },
    });
    if (updated.count === 0) return { ok: false, message: "That account could not be found." };

    await audit({
      actorId: user.id,
      action: `account.${status.toLowerCase()}`,
      entity: "Profile",
      entityId: profileId,
      meta: reason ? { reason } : undefined,
    });

    refreshUser(profileId);
    const verb =
      status === "BANNED" ? "banned" : status === "SUSPENDED" ? "suspended" : "reactivated";
    return { ok: true, message: `Account ${verb}.` };
  } catch (error) {
    console.error("setAccountStatus failed", error);
    return { ok: false, message: "The account status could not be changed." };
  }
}

/* --------------------------------------------------------- flag / suspicious */

const flagSchema = z.object({ profileId: z.uuid(), flagged: z.boolean() });

/** Mark or clear the "watch this account" flag. Gates nothing; it is a signal. */
export async function setAccountFlag(input: unknown): Promise<ModerationResult> {
  const { user } = await requirePermission("users:write");

  const parsed = flagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check what you entered." };
  const { profileId, flagged } = parsed.data;

  try {
    const updated = await prisma.profile.updateMany({
      where: { id: profileId },
      data: { isFlagged: flagged, moderatedAt: new Date(), moderatedById: user.id },
    });
    if (updated.count === 0) return { ok: false, message: "That account could not be found." };

    await audit({
      actorId: user.id,
      action: flagged ? "account.flagged" : "account.unflagged",
      entity: "Profile",
      entityId: profileId,
    });

    refreshUser(profileId);
    return { ok: true, message: flagged ? "Account flagged." : "Flag removed." };
  } catch (error) {
    console.error("setAccountFlag failed", error);
    return { ok: false, message: "The flag could not be changed." };
  }
}

/* --------------------------------------------------- freeze withdrawals */

const freezeSchema = z.object({ profileId: z.uuid(), frozen: z.boolean() });

/** Stop (or resume) this account's ability to withdraw, without suspending play. */
export async function setWithdrawalsFrozen(input: unknown): Promise<ModerationResult> {
  const { user } = await requirePermission("payouts:write");

  const parsed = freezeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check what you entered." };
  const { profileId, frozen } = parsed.data;

  try {
    const updated = await prisma.profile.updateMany({
      where: { id: profileId },
      data: { withdrawalsFrozen: frozen, moderatedAt: new Date(), moderatedById: user.id },
    });
    if (updated.count === 0) return { ok: false, message: "That account could not be found." };

    await audit({
      actorId: user.id,
      action: frozen ? "account.withdrawalsFrozen" : "account.withdrawalsUnfrozen",
      entity: "Profile",
      entityId: profileId,
    });

    refreshUser(profileId);
    return { ok: true, message: frozen ? "Payouts blocked." : "Payouts allowed again." };
  } catch (error) {
    console.error("setWithdrawalsFrozen failed", error);
    return { ok: false, message: "That could not be changed." };
  }
}

/* --------------------------------------------------------- internal note */

const noteSchema = z.object({ profileId: z.uuid(), note: z.string().trim().max(1000).default("") });

/** Set the internal moderation note. Never shown to the account holder. */
export async function setModerationNote(input: unknown): Promise<ModerationResult> {
  const { user } = await requirePermission("users:write");

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the note." };
  const { profileId, note } = parsed.data;

  try {
    const updated = await prisma.profile.updateMany({
      where: { id: profileId },
      data: { moderationNote: note || null, moderatedAt: new Date(), moderatedById: user.id },
    });
    if (updated.count === 0) return { ok: false, message: "That account could not be found." };

    await audit({
      actorId: user.id,
      action: "account.noteUpdated",
      entity: "Profile",
      entityId: profileId,
    });

    refreshUser(profileId);
    return { ok: true, message: "Note saved." };
  } catch (error) {
    console.error("setModerationNote failed", error);
    return { ok: false, message: "The note could not be saved." };
  }
}

/* --------------------------------------------------- bulk (multi-account) */

const bulkSchema = z.object({
  profileIds: z.array(z.uuid()).min(1, "Select at least one account.").max(100),
});

/**
 * Flag a whole group of accounts at once — the point of the Suspicious accounts page,
 * where several accounts share one IP or one payout number. Flagging gates
 * nothing; it marks them for a human to review.
 */
export async function flagAccounts(input: unknown): Promise<ModerationResult> {
  const { user } = await requirePermission("users:write");

  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Nothing selected." };
  const ids = parsed.data.profileIds;

  try {
    const updated = await prisma.profile.updateMany({
      where: { id: { in: ids } },
      data: { isFlagged: true, moderatedAt: new Date(), moderatedById: user.id },
    });
    await audit({
      actorId: user.id,
      action: "account.bulkFlagged",
      entity: "Profile",
      meta: { count: updated.count, profileIds: ids },
    });
    revalidatePath("/admin/abuse");
    revalidatePath("/admin/users");
    return { ok: true, message: `Flagged ${updated.count} account${updated.count === 1 ? "" : "s"}.` };
  } catch (error) {
    console.error("flagAccounts failed", error);
    return { ok: false, message: "Those accounts could not be flagged." };
  }
}

/**
 * Ban a whole cluster at once. The acting admin's own account is never included,
 * so a shared-IP group that happens to contain the reviewer cannot lock them out.
 */
export async function banAccounts(input: unknown): Promise<ModerationResult> {
  const { user } = await requirePermission("users:write");

  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Nothing selected." };
  const ids = parsed.data.profileIds.filter((id) => id !== user.id);
  if (ids.length === 0) {
    return { ok: false, message: "That group holds only your own account." };
  }

  try {
    const updated = await prisma.profile.updateMany({
      where: { id: { in: ids } },
      data: { status: "BANNED", moderatedAt: new Date(), moderatedById: user.id },
    });
    await audit({
      actorId: user.id,
      action: "account.bulkBanned",
      entity: "Profile",
      meta: { count: updated.count, profileIds: ids },
    });
    revalidatePath("/admin/abuse");
    revalidatePath("/admin/users");
    return { ok: true, message: `Banned ${updated.count} account${updated.count === 1 ? "" : "s"}.` };
  } catch (error) {
    console.error("banAccounts failed", error);
    return { ok: false, message: "Those accounts could not be banned." };
  }
}

/* --------------------------------------------------- hold a payout */

const holdSchema = z.object({ withdrawalId: z.uuid(), onHold: z.boolean() });

/**
 * Hold (or release) a specific payout for manual review. A held payout cannot be
 * approved or marked paid until released — enforced in the withdrawal actions.
 * The Honor stays on hold throughout, so nothing moves either way.
 */
export async function setWithdrawalHold(input: unknown): Promise<ModerationResult> {
  const { user } = await requirePermission("payouts:write");

  const parsed = holdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Unknown withdrawal." };
  const { withdrawalId, onHold } = parsed.data;

  try {
    // Only an unresolved payout can be held; a paid/rejected one is settled.
    const updated = await prisma.withdrawal.updateMany({
      where: { id: withdrawalId, status: { in: ["PENDING", "APPROVED"] } },
      data: { onHold },
    });
    if (updated.count === 0) {
      return { ok: false, message: "Only a waiting or approved payout can be put on hold." };
    }

    await audit({
      actorId: user.id,
      action: onHold ? "withdrawal.held" : "withdrawal.released",
      entity: "Withdrawal",
      entityId: withdrawalId,
    });

    revalidatePath("/admin/withdrawals");
    return { ok: true, message: onHold ? "Payout put on hold." : "Payout released." };
  } catch (error) {
    console.error("setWithdrawalHold failed", error);
    return { ok: false, message: "The hold could not be changed." };
  }
}
