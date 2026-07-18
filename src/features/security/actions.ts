"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

/**
 * The admin override the spec calls for.
 *
 * Trusting a device is the human decision that a share is legitimate — it clears
 * the flag and stops the device being flagged again. Untrusting reopens it. Gated
 * on `users:write`, the permission that already governs acting on accounts, and
 * every override is written to the audit log, because a security override is
 * exactly the kind of action that should never be quiet.
 */

export type DeviceActionResult = { ok: true } | { ok: false; message: string };

export async function trustDevice(deviceId: string): Promise<DeviceActionResult> {
  const { user } = await requirePermission("users:write");

  const id = z.uuid().safeParse(deviceId);
  if (!id.success) return { ok: false, message: "Unknown device." };

  try {
    const device = await prisma.device.update({
      where: { id: id.data },
      // Trusting clears the flag: the review is done, the answer is "allowed".
      data: { trusted: true, flaggedAt: null },
      select: { _count: { select: { accounts: true } } },
    });

    await audit({
      actorId: user.id,
      action: "device.trusted",
      entity: "Device",
      entityId: id.data,
      meta: { accounts: device._count.accounts },
    });

    revalidatePath("/admin/devices");
    return { ok: true };
  } catch (error) {
    console.error("trustDevice failed", error);
    return { ok: false, message: "That device could not be trusted." };
  }
}

export async function untrustDevice(deviceId: string): Promise<DeviceActionResult> {
  const { user } = await requirePermission("users:write");

  const id = z.uuid().safeParse(deviceId);
  if (!id.success) return { ok: false, message: "Unknown device." };

  try {
    const device = await prisma.device.findUnique({
      where: { id: id.data },
      select: { _count: { select: { accounts: true } } },
    });
    if (!device) return { ok: false, message: "That device no longer exists." };

    // Reopen it: no longer trusted, and re-flagged if it is in fact shared.
    await prisma.device.update({
      where: { id: id.data },
      data: {
        trusted: false,
        flaggedAt: device._count.accounts > 1 ? new Date() : null,
      },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "device.untrusted",
      entity: "Device",
      entityId: id.data,
      meta: { accounts: device._count.accounts },
    });

    revalidatePath("/admin/devices");
    return { ok: true };
  } catch (error) {
    console.error("untrustDevice failed", error);
    return { ok: false, message: "That device could not be changed." };
  }
}
