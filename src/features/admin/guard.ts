import "server-only";

import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";

import { getGrants } from "@/features/auth/permissions";
import { getUser } from "@/lib/supabase/server";

/**
 * The gate for every admin route AND every admin mutation.
 *
 * Server Actions are public HTTP endpoints. Rendering a page behind a guard does
 * nothing to protect the actions that page imports — anyone can invoke those
 * directly. So each action re-checks, and this is the single place that decides.
 */
export type AdminContext = {
  user: User;
  isAdmin: boolean;
  permissions: ReadonlySet<string>;
};

export async function requirePermission(permission: string): Promise<AdminContext> {
  const user = await getUser();
  if (!user) redirect("/login");

  const { isAdmin, permissions } = await getGrants(user);

  // 404 rather than 403: someone probing admin routes learns nothing about what
  // exists. Admins hold every permission implicitly.
  if (!isAdmin && !permissions.has(permission)) notFound();

  return { user, isAdmin, permissions };
}

/** For layouts and nav: any admin capability at all. */
export async function requireAnyAdmin(): Promise<AdminContext> {
  const user = await getUser();
  if (!user) redirect("/login");

  const { isAdmin, permissions } = await getGrants(user);
  if (!isAdmin && permissions.size === 0) notFound();

  return { user, isAdmin, permissions };
}

export function holds(context: AdminContext, permission: string): boolean {
  return context.isAdmin || context.permissions.has(permission);
}
