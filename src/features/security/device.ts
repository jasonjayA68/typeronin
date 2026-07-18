import "server-only";

import { cookies } from "next/headers";

import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS } from "@/features/security/cookie";
import { computeFingerprint } from "@/features/security/fingerprint";
import { prisma } from "@/lib/prisma";

/**
 * Tying an account to the device it signed in from.
 *
 * The one question this answers: has more than one account been used on this
 * device? The answer FLAGS the device for review; it never blocks a login. A
 * shared laptop is not fraud, and a system that locks a family out of their own
 * accounts to stop a cheat is a worse product than the cheat was a problem.
 * Enforcement is a human with the admin panel, given a flag and a reason.
 *
 * Everything here is best-effort and swallows its errors — anti-abuse bookkeeping
 * must never be the reason a genuine sign-in fails.
 */

export type DeviceLinkResult = {
  /** More than one account has now been seen on this device. */
  shared: boolean;
  /** Shared and not admin-trusted — worth a review. */
  flagged: boolean;
};

/**
 * The device's persistent id, minted into a cookie on first sight.
 *
 * Set here as a fallback; the proxy mints it earlier for anyone who merely
 * visits. Either way the value is stable across sign-ins, which is what lets a
 * second account on the same device be recognised as such.
 */
export async function ensureDeviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  try {
    store.set(DEVICE_COOKIE, id, DEVICE_COOKIE_OPTIONS);
  } catch {
    // A read-only cookie context (a plain server render). The proxy will set it.
  }
  return id;
}

export async function linkDevice(
  profileId: string,
  signals: {
    userAgent?: string | null;
    acceptLanguage?: string | null;
    timezone?: string | null;
    ip?: string | null;
  }
): Promise<DeviceLinkResult> {
  try {
    const cookieId = await ensureDeviceId();
    const fingerprint = computeFingerprint(
      signals.userAgent,
      signals.acceptLanguage,
      signals.timezone
    );

    const device = await prisma.device.upsert({
      where: { cookieId },
      update: { fingerprint, lastIp: signals.ip ?? undefined },
      create: { cookieId, fingerprint, lastIp: signals.ip ?? null },
      select: { id: true, trusted: true, flaggedAt: true },
    });

    // Record this account on this device. The composite key makes a repeat
    // sign-in from the same account a no-op rather than a new row.
    await prisma.deviceAccount.upsert({
      where: { deviceId_profileId: { deviceId: device.id, profileId } },
      update: {},
      create: { deviceId: device.id, profileId },
      select: { deviceId: true },
    });

    const accountCount = await prisma.deviceAccount.count({ where: { deviceId: device.id } });
    const shared = accountCount > 1;

    // Flag the moment it becomes shared, unless an admin has already blessed it.
    // Only stamp once, so the flag marks WHEN the sharing began.
    if (shared && !device.trusted && !device.flaggedAt) {
      await prisma.device.update({
        where: { id: device.id },
        data: { flaggedAt: new Date() },
      });
    }

    return { shared, flagged: shared && !device.trusted };
  } catch (error) {
    console.error("linkDevice failed (non-fatal)", error);
    return { shared: false, flagged: false };
  }
}
