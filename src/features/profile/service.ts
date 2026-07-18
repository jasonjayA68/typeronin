import "server-only";

import type { User } from "@supabase/supabase-js";

import { handleSuffix, mintReferralCode, slugifyHandle } from "@/features/profile/handles";
import { prisma } from "@/lib/prisma";

import type { Profile } from "../../../generated/prisma/client";

/** How many times to retry a mint that collides with an existing row. */
const MINT_ATTEMPTS = 5;

function seedHandle(user: User): string {
  const chosen =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  return (
    slugifyHandle(chosen ?? "") ??
    slugifyHandle(user.email?.split("@")[0] ?? "") ??
    "student"
  );
}

function displayNameFor(user: User): string {
  const chosen =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";
  return chosen || user.email?.split("@")[0] || "Student";
}

/**
 * The profile for an authenticated user, created on first sight.
 *
 * Lazy creation rather than a Postgres trigger on auth.users: the trigger would
 * live in a schema Prisma does not own, so it would sit outside migrations and
 * outside review. The cost is this function on the authenticated path, which is
 * a single indexed lookup once the row exists.
 */
export async function ensureProfile(user: User): Promise<Profile> {
  const existing = await prisma.profile.findUnique({ where: { id: user.id } });
  if (existing) return existing;

  const base = seedHandle(user);

  // handle and referralCode are both unique. Rather than read-then-write (which
  // races two concurrent first-requests from the same new user), just attempt
  // the insert and let the database reject collisions.
  for (let attempt = 0; attempt < MINT_ATTEMPTS; attempt++) {
    const handle = attempt === 0 ? base : `${base}-${handleSuffix()}`;

    try {
      return await prisma.profile.create({
        data: {
          id: user.id,
          handle,
          displayName: displayNameFor(user),
          referralCode: mintReferralCode(),
        },
      });
    } catch (error) {
      // A concurrent request won the race and made the profile; use theirs.
      const settled = await prisma.profile.findUnique({ where: { id: user.id } });
      if (settled) return settled;

      if (!isUniqueViolation(error)) throw error;
      // Otherwise the handle or code collided — mint again.
    }
  }

  throw new Error(`Could not mint a unique handle for ${user.id} after ${MINT_ATTEMPTS} attempts.`);
}

/** Prisma's unique-constraint error, without importing the whole error namespace. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
