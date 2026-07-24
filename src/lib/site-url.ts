/**
 * The site's canonical origin.
 *
 * Needed by three things that cannot work with a relative path: the sitemap and
 * robots files (a crawler is handed absolute URLs or nothing), and Open Graph
 * image resolution. Next warns about the last one and then guesses localhost,
 * which is how a production share card ends up pointing at a machine under
 * somebody's desk.
 *
 * Resolution order, most explicit first:
 *
 *   1. NEXT_PUBLIC_SITE_URL — what an operator set on purpose. Always wins,
 *      because a custom domain is invisible to the platform variables below.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the production deployment's own host, so
 *      a deploy that nobody has configured still emits correct absolute URLs.
 *   3. localhost, for development.
 *
 * Server-side only in practice. The Vercel variable carries no NEXT_PUBLIC_
 * prefix and is therefore absent in the browser bundle; everything that reads
 * this — metadata, sitemap, robots — runs on the server.
 */

function normalise(value: string | undefined): string | null {
  if (!value) return null;
  // The platform variables are bare hosts ("acme.vercel.app"); an operator is
  // as likely to paste a full URL, with or without a trailing slash.
  const candidate = /^https?:\/\//.test(value) ? value : `https://${value}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

export const SITE_URL =
  normalise(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalise(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  "http://localhost:3000";

/** An absolute URL for a path like "/blog/foo". */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
