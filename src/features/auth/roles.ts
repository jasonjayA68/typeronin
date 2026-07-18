import type { User } from "@supabase/supabase-js";

export const ROLES = ["student", "admin"] as const;
export type Role = (typeof ROLES)[number];

/**
 * The role, read from `app_metadata`.
 *
 * `app_metadata` and NOT `user_metadata`. This distinction is the whole security
 * of the thing:
 *
 *   - `user_metadata` is writable by the account holder — any signed-in student
 *     can call `supabase.auth.updateUser({ data: { role: "admin" } })` and set
 *     it themselves. A role kept there is a privilege-escalation hole, not a
 *     permission.
 *   - `app_metadata` can only be written with the service key or by SQL, so the
 *     student cannot forge it. The name lives in `user_metadata` precisely
 *     because it is decoration and nothing is gated on it.
 *
 * Anything unrecognised is a student. Roles fail closed.
 */
export function readRole(user: User | null | undefined): Role {
  return user?.app_metadata?.role === "admin" ? "admin" : "student";
}

export function isAdmin(user: User | null | undefined): boolean {
  return readRole(user) === "admin";
}
