/**
 * Handle and referral-code minting.
 *
 * Kept pure and dependency-free so it can be unit tested and reused by seeds.
 */

/** Unambiguous alphabet: no 0/O, 1/I/L — referral codes get read aloud and retyped. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * A referral code. Random rather than derived from the user id: a code that
 * encodes the account it belongs to leaks that account's identity to anyone
 * holding a link.
 */
export function mintReferralCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) {
    // Modulo bias is irrelevant here: this is a namespace, not a secret.
    out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Turn arbitrary text into a URL-safe handle.
 * Returns null when nothing usable survives, so callers must decide a fallback
 * rather than silently shipping an empty handle.
 */
export function slugifyHandle(input: string): string | null {
  const slug = input
    .normalize("NFKD")
    // Strip diacritics so "Ryū" becomes "ryu" rather than vanishing.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return slug.length >= 2 ? slug : null;
}

/** A short random suffix used to break handle collisions. */
export function handleSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 4);
}
