import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * A profile's recent sign-ins, for the account's own view.
 *
 * The IP is deliberately not selected — it exists for fraud monitoring and never
 * leaves the server toward the account holder. Everything here is theirs to see:
 * which device, which browser, roughly where, and when.
 */

export type LoginRow = {
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  createdAt: Date;
};

export type LoginActivity = {
  recent: LoginRow[];
  /** The most recent sign-in, or null if none is recorded. */
  latest: LoginRow | null;
};

export async function getLoginActivity(profileId: string): Promise<LoginActivity> {
  try {
    const recent = await prisma.loginEvent.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        device: true,
        browser: true,
        os: true,
        country: true,
        region: true,
        createdAt: true,
      },
    });
    return { recent, latest: recent[0] ?? null };
  } catch (error) {
    console.error("getLoginActivity failed", error);
    return { recent: [], latest: null };
  }
}
