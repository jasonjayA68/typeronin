import { getStudent } from "@/lib/supabase/server";
import { SiteHeaderNav } from "@/shared/components/layout/site-header-nav";

/**
 * Resolves the session on the server and hands it to the interactive nav.
 *
 * This is what makes every page carrying the header dynamic — a header that
 * greets you by name cannot also be prerendered at build time. Resolving it
 * here rather than in the browser avoids a flash of "Sign in" for a student who
 * is already signed in.
 */
export async function SiteHeader() {
  const student = await getStudent();
  return <SiteHeaderNav student={student} />;
}
