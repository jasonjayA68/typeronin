/**
 * Where a stored object is read from.
 *
 * `Media.path` is the only location the database keeps. A full URL in a column
 * would rot the day the project moves; a *signed* URL would rot within the hour.
 * So the URL is derived at render — here — from the path and whatever project
 * this deployment points at.
 *
 * The bucket is public, which is what makes this pure string building: no
 * client, no round trip, no signature. A Server Component and a browser
 * component can both call it, and a CDN can cache what it returns. The cost of
 * that choice is honest and worth stating: anyone holding the URL of a draft's
 * image can see the image. The post stays unreadable; its picture does not.
 */

/**
 * The one bucket. Declared in this client-safe module rather than beside the
 * service-role client so that browser code may name it without pulling a
 * server-only import into the bundle.
 */
export const MEDIA_BUCKET = "media";

// A full `process.env.NEXT_PUBLIC_*` literal on purpose: Next inlines these by
// textual substitution at build time, so a destructured or computed lookup would
// arrive in the browser as undefined.
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * The public URL for a stored path, or null when Supabase is unconfigured.
 *
 * Null rather than a broken string: the caller renders a placeholder, instead of
 * an `<img>` pointed at "undefined/storage/v1/..." that fails in the network tab
 * and nowhere else.
 */
export function mediaUrl(path: string): string | null {
  if (!projectUrl) return null;

  // Encode per segment. A slash is structure and must survive; everything else
  // is a name and must not be able to pose as structure.
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${projectUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`;
}
