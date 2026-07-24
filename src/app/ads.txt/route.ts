import { ADSENSE_CLIENT_ID } from "@/features/ads/config";

/**
 * ads.txt — who is authorised to sell this site's inventory.
 *
 * Google checks for this file and, when it is missing, marks the account
 * "Earnings at risk" and will eventually stop buying: an unauthorised-seller
 * signal is how ad fraud is detected, and a site that publishes no list is
 * treated as one that cannot vouch for anybody. It is a one-line file and it is
 * the single most common reason a new AdSense site under-earns.
 *
 * Generated rather than checked in, for the same reason the publisher id lives
 * in the environment: a staging deployment must not claim production inventory,
 * and a fork of this repo must not ship somebody else's publisher id. With no id
 * configured there is nothing true to say, so the route 404s rather than serving
 * an empty or placeholder file — a malformed ads.txt is worse than none, because
 * it is read as an authoritative statement that nobody may sell.
 *
 * Format is fixed by the IAB spec: <domain>, <publisher id>, <relationship>,
 * <certification authority id>. f08c47fec0942fa0 is Google's TAG id and is the
 * same for every publisher.
 */

/** Google's own TAG certification id. Identical for all AdSense publishers. */
const GOOGLE_TAG_ID = "f08c47fec0942fa0";

export const dynamic = "force-static";

export function GET(): Response {
  if (!ADSENSE_CLIENT_ID) {
    return new Response("Not found", { status: 404 });
  }

  // AdSense shows the id as "ca-pub-…" in the dashboard, but ads.txt wants the
  // bare "pub-…". Pasting the dashboard value verbatim is the usual mistake and
  // the file silently fails validation, so strip it here rather than ask an
  // operator to remember.
  const publisherId = ADSENSE_CLIENT_ID.replace(/^ca-/, "");

  return new Response(`google.com, ${publisherId}, DIRECT, ${GOOGLE_TAG_ID}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Crawled rarely and changed almost never, but a stale copy after a
      // publisher change is a real outage — a day is the usual compromise.
      "cache-control": "public, max-age=86400",
    },
  });
}
