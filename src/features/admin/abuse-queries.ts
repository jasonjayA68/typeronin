import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Multi-account detection for the admin abuse checks.
 *
 * Two questions, both "which accounts share one thing they should not":
 *
 *   - one IP address used by several accounts (from the login log), and
 *   - one payout number used by several accounts (from saved methods and past
 *     withdrawals), normalised so "0917 123 4567" and "09171234567" group as one.
 *
 * Each returns groups of accounts, so an admin can flag or ban the whole cluster
 * at once. These are SIGNALS, not proof — a family shares a home connection, a
 * shop shares a counter phone — so the tool surfaces and lets a human decide; it
 * never acts on its own.
 */

export type AbuseAccount = {
  id: string;
  handle: string;
  displayName: string;
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  isFlagged: boolean;
};

export type AbuseGroup = {
  /** The shared value — the IP, or the normalised payout number. */
  key: string;
  accounts: AbuseAccount[];
};

/** How many clusters to surface at once. A queue, not an export. */
const GROUP_LIMIT = 50;

/** Fetch the accounts for a set of ids, as the display shape, keyed by id. */
async function accountsById(ids: string[]): Promise<Map<string, AbuseAccount>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.profile.findMany({
    where: { id: { in: ids } },
    select: { id: true, handle: true, displayName: true, status: true, isFlagged: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

/** Turn raw {key, ids[]} groups into groups of resolved accounts. */
async function resolve(raw: { key: string; ids: string[] }[]): Promise<AbuseGroup[]> {
  const all = [...new Set(raw.flatMap((g) => g.ids))];
  const byId = await accountsById(all);
  return raw
    .map((g) => ({
      key: g.key,
      accounts: g.ids.map((id) => byId.get(id)).filter((a): a is AbuseAccount => Boolean(a)),
    }))
    .filter((g) => g.accounts.length > 1);
}

/** IPs seen for more than one account in the login log. */
export async function findSharedIps(): Promise<AbuseGroup[]> {
  try {
    const rows = await prisma.$queryRaw<{ ip: string; ids: string[] }[]>`
      SELECT ip, array_agg(DISTINCT "profileId"::text) AS ids
        FROM "LoginEvent"
       WHERE ip IS NOT NULL AND ip <> ''
       GROUP BY ip
      HAVING count(DISTINCT "profileId") > 1
       ORDER BY count(DISTINCT "profileId") DESC
       LIMIT ${GROUP_LIMIT}
    `;
    return resolve(rows.map((r) => ({ key: r.ip, ids: r.ids })));
  } catch (error) {
    console.error("findSharedIps failed", error);
    return [];
  }
}

/**
 * Payout numbers used by more than one account, across saved methods and past
 * withdrawals. Grouped on a normalised form (lowercased, non-alphanumerics
 * stripped) so spacing and punctuation do not hide a match.
 */
export async function findSharedNumbers(): Promise<AbuseGroup[]> {
  try {
    const rows = await prisma.$queryRaw<{ key: string; ids: string[] }[]>`
      SELECT norm AS key, array_agg(DISTINCT id::text) AS ids
        FROM (
          SELECT regexp_replace(lower("accountRef"), '[^a-z0-9]', '', 'g') AS norm,
                 "profileId" AS id
            FROM "SavedPayoutMethod"
           WHERE "accountRef" <> ''
          UNION
          SELECT regexp_replace(lower("accountRef"), '[^a-z0-9]', '', 'g') AS norm,
                 "profileId" AS id
            FROM "Withdrawal"
           WHERE "accountRef" <> ''
        ) t
       WHERE norm <> ''
       GROUP BY norm
      HAVING count(DISTINCT id) > 1
       ORDER BY count(DISTINCT id) DESC
       LIMIT ${GROUP_LIMIT}
    `;
    return resolve(rows.map((r) => ({ key: r.key, ids: r.ids })));
  } catch (error) {
    console.error("findSharedNumbers failed", error);
    return [];
  }
}
