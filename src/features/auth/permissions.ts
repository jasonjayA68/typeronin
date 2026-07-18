import "server-only";

import type { User } from "@supabase/supabase-js";

import { isAdmin as hasBreakGlassAdmin } from "@/features/auth/roles";
import { prisma } from "@/lib/prisma";

/**
 * Authorization, resolved from the database.
 *
 * Two paths grant admin, deliberately:
 *
 *  1. A `admin` role row in ProfileRole — the normal path, editable from the
 *     panel without a deploy.
 *  2. Supabase `app_metadata.role === "admin"` — break glass. If the tables were
 *     the only path, one bad grant could lock every admin out of the very panel
 *     that fixes grants.
 *
 * Neither is forgeable by an account holder: (1) needs server-side database
 * access, (2) needs the service key. `user_metadata` grants nothing, ever —
 * the account holder can write it themselves.
 */

export type Grants = {
  isAdmin: boolean;
  permissions: ReadonlySet<string>;
};

const NONE: Grants = { isAdmin: false, permissions: new Set() };

export async function getGrants(user: User | null | undefined): Promise<Grants> {
  if (!user) return NONE;

  const breakGlass = hasBreakGlassAdmin(user);

  try {
    const rows = await prisma.profileRole.findMany({
      where: { profileId: user.id },
      select: {
        role: {
          select: {
            slug: true,
            permissions: { select: { permission: { select: { slug: true } } } },
          },
        },
      },
    });

    const permissions = new Set<string>();
    let isAdmin = breakGlass;

    for (const { role } of rows) {
      if (role.slug === "admin") isAdmin = true;
      for (const { permission } of role.permissions) permissions.add(permission.slug);
    }

    // Break-glass admin implies everything, including permissions no role granted.
    if (isAdmin && permissions.size === 0) {
      const all = await prisma.permission.findMany({ select: { slug: true } });
      for (const p of all) permissions.add(p.slug);
    }

    return { isAdmin, permissions };
  } catch (error) {
    // The database is unreachable. This runs inside the site header, on every
    // page, for every signed-in visitor — so an unhandled throw here does not
    // fail one query, it 500s the entire site the moment the database blips. The
    // ad path already made this call (see features/ads/queries.ts): a dependency
    // being down is never worth taking the page down with it.
    //
    // Authorization fails CLOSED: a permission we cannot confirm is not granted.
    // Break-glass admin is the one thing kept, because it is deliberately
    // independent of these tables — it is read from the verified session, needs
    // the service key to set, and exists precisely for when the tables cannot be
    // reached. An admin holds every permission implicitly, so an empty set here
    // still lets them through `holds`/`requirePermission`.
    console.error("getGrants: authorization could not be read from the database", error);
    return { isAdmin: breakGlass, permissions: new Set() };
  }
}

/** Does this user hold a capability? Admins hold all of them. */
export async function can(user: User | null | undefined, permission: string): Promise<boolean> {
  const grants = await getGrants(user);
  return grants.isAdmin || grants.permissions.has(permission);
}
