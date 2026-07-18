/**
 * Advertising configuration.
 *
 * The AdSense publisher id is the ONE piece that lives in the environment rather
 * than the database: it is per-deployment, it is needed to build the script URL
 * before any query runs, and a staging build must never serve production ad
 * units. Ad *slots* are database rows, so an operator adds a unit without a
 * deploy — nothing here is hardcoded per page.
 *
 * Referenced as a full literal so Next inlines it into the client bundle.
 */
const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

/** e.g. "ca-pub-1234567890123456". Absent on any deployment without an account. */
export const ADSENSE_CLIENT_ID = publisherId ?? null;

export const isAdSenseConfigured = Boolean(publisherId);

/**
 * The script AdSense wants on the page. Loaded once, and only when a real
 * AdSense unit is actually going to render — a site with no live ads should not
 * pull a third-party script, and doing so would also cost us Lighthouse.
 */
export function adSenseScriptSrc(): string | null {
  if (!publisherId) return null;
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
}
