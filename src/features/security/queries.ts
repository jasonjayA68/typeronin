import "server-only";

import { prisma } from "@/lib/prisma";

import type { Prisma } from "../../../generated/prisma/client";

/**
 * The device register, for admin review.
 *
 * This is the one place the IP is allowed to surface — an admin reviewing a
 * flagged device is exactly the fraud-monitoring purpose it was kept for. The
 * accounts on each device are shown by handle so a reviewer can see whether a
 * share looks like a family or a farm.
 */

const deviceSelect = {
  id: true,
  cookieId: true,
  fingerprint: true,
  trusted: true,
  flaggedAt: true,
  lastIp: true,
  firstSeenAt: true,
  lastSeenAt: true,
  accounts: {
    orderBy: { firstSeenAt: "asc" },
    select: {
      firstSeenAt: true,
      profile: { select: { handle: true, displayName: true } },
    },
  },
  _count: { select: { accounts: true } },
} satisfies Prisma.DeviceSelect;

export type DeviceRow = Prisma.DeviceGetPayload<{ select: typeof deviceSelect }>;

export async function listDevices(options: {
  onlyFlagged?: boolean;
  skip?: number;
  take?: number;
}): Promise<{ devices: DeviceRow[]; total: number; flaggedCount: number; sharedCount: number }> {
  const where: Prisma.DeviceWhereInput = options.onlyFlagged ? { flaggedAt: { not: null } } : {};

  const [devices, total, flaggedCount, sharedCount] = await Promise.all([
    prisma.device.findMany({
      where,
      orderBy: [{ flaggedAt: { sort: "desc", nulls: "last" } }, { lastSeenAt: "desc" }],
      skip: options.skip ?? 0,
      take: options.take ?? 30,
      select: deviceSelect,
    }),
    prisma.device.count({ where }),
    prisma.device.count({ where: { flaggedAt: { not: null } } }),
    // "Shared" is more than one account on a device — the raw signal, whether or
    // not it has been flagged or trusted.
    prisma.device
      .findMany({ where: { accounts: { some: {} } }, select: { _count: { select: { accounts: true } } } })
      .then((rows) => rows.filter((r) => r._count.accounts > 1).length),
  ]);

  return { devices, total, flaggedCount, sharedCount };
}
