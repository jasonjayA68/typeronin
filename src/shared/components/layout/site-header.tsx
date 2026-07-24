import { getNavCategories } from "@/features/blog/queries";
import { getStudent } from "@/lib/supabase/server";
import { SiteHeaderNav } from "@/shared/components/layout/site-header-nav";

/**
 * Resolves the session and the content pillars on the server, and hands both to
 * the interactive nav.
 *
 * This is what makes every page carrying the header dynamic — a header that
 * greets you by name cannot also be prerendered at build time. Resolving it
 * here rather than in the browser avoids a flash of "Sign in" for a student who
 * is already signed in.
 *
 * The two reads are independent, so they go together rather than in series —
 * the header is on every page and does not need to pay for a waterfall.
 */
export async function SiteHeader() {
  const [student, categories] = await Promise.all([getStudent(), getNavCategories()]);
  return <SiteHeaderNav student={student} categories={categories} />;
}
