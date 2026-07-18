import { createHash } from "node:crypto";

/**
 * A coarse device fingerprint.
 *
 * A hash of the three most stable request signals — user agent, preferred
 * language, timezone — and nothing more. It is deliberately weak: it exists only
 * as a second signal for the case where someone clears the device cookie to
 * evade, not to identify a person. Precise fingerprinting (canvas, fonts, audio)
 * is a surveillance technique, and building a fairness feature on one would be a
 * mistake dressed as diligence.
 *
 * Because it is coarse, collisions are expected and fine — thousands of people
 * run the same Chrome on the same Windows in the same timezone. A shared
 * fingerprint is a hint worth a look, never a verdict. The cookie is the primary
 * identity; this is the footnote.
 */
export function computeFingerprint(
  userAgent: string | null | undefined,
  acceptLanguage: string | null | undefined,
  timezone: string | null | undefined
): string {
  // Normalise each signal on its own — trim then lower-case — so surrounding
  // whitespace or case on any one of them cannot fork an otherwise-identical
  // device into two.
  const basis = [userAgent, acceptLanguage, timezone]
    .map((s) => (s ?? "").trim().toLowerCase())
    .join("|");

  // Truncated: 128 bits is plenty for a coarse hint, and a shorter column reads
  // better in the admin table.
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}
