import "server-only";

import { prisma } from "@/lib/prisma";

export type SavedPayoutMethod = {
  id: string;
  method: string;
  accountName: string;
  accountRef: string;
  details: string | null;
  qrUrl: string | null;
  isDefault: boolean;
};

/**
 * A user's saved payout methods, default first.
 *
 * Resilient like the other wallet reads: a database hiccup returns an empty list
 * rather than failing the dashboard it renders inside.
 */
export async function listPayoutMethods(profileId: string): Promise<SavedPayoutMethod[]> {
  try {
    return await prisma.savedPayoutMethod.findMany({
      where: { profileId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        method: true,
        accountName: true,
        accountRef: true,
        details: true,
        qrUrl: true,
        isDefault: true,
      },
    });
  } catch (error) {
    console.error("listPayoutMethods failed", error);
    return [];
  }
}
