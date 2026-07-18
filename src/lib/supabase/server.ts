import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getGrants } from "@/features/auth/permissions";
import type { Role } from "@/features/auth/roles";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/supabase/env";

/**
 * A server client, built fresh per request — never share one across requests.
 *
 * `getAll`/`setAll` rather than the deprecated `get`/`set`/`remove`: the docs
 * are blunt that the old trio misses edge cases and causes random logouts.
 */
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components may not write cookies. This is expected and safe:
          // the proxy refreshes the session on every navigation, so the write
          // that matters has already happened there.
        }
      },
    },
  });
}

/**
 * The authenticated user, or null.
 *
 * `getUser()` and not `getSession()` — getSession reads the cookie without
 * verifying it, so it must never be trusted for authorization on the server.
 *
 * Returns null rather than throwing when Supabase is unconfigured, so the app
 * still renders for anyone who has cloned the repo without secrets.
 */
export async function getUser() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export type Student = {
  /** Chosen at registration; falls back to the email's local part. */
  name: string;
  email: string;
  role: Role;
};

/**
 * The signed-in student, reduced to what the UI actually renders.
 *
 * The role is resolved the same way authorization resolves it — from the
 * database, with app_metadata as break glass. Reading it from app_metadata
 * alone was cheaper but wrong: a DB-granted admin saw "student" in their own
 * account menu while /admin let them in. A header that contradicts the guard is
 * worse than a query.
 */
export async function getStudent(): Promise<Student | null> {
  const user = await getUser();
  if (!user) return null;

  const name =
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ??
    user.email?.split("@")[0] ??
    "Student";

  const { isAdmin } = await getGrants(user);

  return { name, email: user.email ?? "", role: isAdmin ? "admin" : "student" };
}

/**
 * Guards a page that requires an account. Call it inside the page itself —
 * authorization belongs next to the thing it protects, not in the proxy, which
 * can only ever make an optimistic guess from a cookie.
 */
export async function requireStudent(): Promise<Student> {
  const student = await getStudent();
  if (!student) redirect("/login");
  return student;
}

/**
 * As above, for pages only an admin may see.
 *
 * Authority now comes from the database (a granted `admin` role), with Supabase
 * app_metadata kept as a break-glass path — see features/auth/permissions.ts for
 * why both exist and why neither is forgeable.
 */
export async function requireAdmin(): Promise<Student> {
  const user = await getUser();
  if (!user) redirect("/login");

  const { isAdmin } = await getGrants(user);
  // A student who reaches an admin route is not lost; they are trying a door.
  // Give them nothing to learn from — the route simply does not exist for them.
  if (!isAdmin) notFound();

  const student = await getStudent();
  if (!student) redirect("/login");
  return student;
}
