import "server-only";

import { DEFAULT_SOCIAL, parseSocialLinks, type SocialLinks } from "@/features/social/config";
import { prisma } from "@/lib/prisma";

/** The one `Setting` key the social links live under. */
export const SOCIAL_KEY = "social";

/**
 * The live social links.
 *
 * Read on every footer, so resilient like the other config readers: a missing
 * row, a malformed one, or an unreachable database all fall back to the empty
 * default — which renders no social row at all, rather than an error page. A
 * footer is the last thing that should be allowed to take a page down.
 */
export async function getSocialLinks(): Promise<SocialLinks> {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: SOCIAL_KEY },
      select: { value: true },
    });
    if (!row) return DEFAULT_SOCIAL;
    const parsed = parseSocialLinks(row.value);
    if (!parsed) {
      console.error("social setting present but invalid; using defaults");
      return DEFAULT_SOCIAL;
    }
    return parsed;
  } catch (error) {
    console.error("getSocialLinks failed", error);
    return DEFAULT_SOCIAL;
  }
}
