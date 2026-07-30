/**
 * The nine levels. Moving up is gated on Honor, which is only earned by
 * accurate play — speed alone never moves a player up.
 *
 * Kept as one ordered list so the ladder renders, the badge resolves, and the
 * "next level" maths all read from the same source.
 *
 * Each level keeps a short name as flavour, but the name is never shown on its
 * own: {@link rankLabel} pairs it with the plain level number, so the ladder is
 * legible to a player who has never seen the names before.
 */

export type Rank = {
  slug: string;
  /** Short name, shown beside the level number. */
  name: string;
  /** Kanji. Decorative only, and never the sole label for a level. */
  kanji: string;
  /** Honor required to hold this level. */
  honor: number;
  /** One plain line about what the player has shown at this level. */
  creed: string;
};

export const RANKS: readonly Rank[] = [
  {
    slug: "heimin",
    name: "Heimin",
    kanji: "平民",
    honor: 0,
    creed: "You have started. That is all it takes to begin.",
  },
  {
    slug: "ashigaru",
    name: "Ashigaru",
    kanji: "足軽",
    honor: 500,
    creed: "You are playing often. Your hands are learning the keys.",
  },
  {
    slug: "bushi",
    name: "Bushi",
    kanji: "武士",
    honor: 1_500,
    creed: "You know where the keys are. Now you can build speed.",
  },
  {
    slug: "samurai",
    name: "Samurai",
    kanji: "侍",
    honor: 4_000,
    creed: "You type the words correctly instead of rushing them.",
  },
  {
    slug: "ronin",
    name: "Ronin",
    kanji: "浪人",
    honor: 8_000,
    creed: "You practise without being told. The habit is yours now.",
  },
  {
    slug: "hatamoto",
    name: "Hatamoto",
    kanji: "旗本",
    honor: 15_000,
    creed: "You are faster than most players here.",
  },
  {
    slug: "karo",
    name: "Karō",
    kanji: "家老",
    honor: 26_000,
    creed: "You make very few mistakes, even at high speed.",
  },
  {
    slug: "daimyo",
    name: "Daimyō",
    kanji: "大名",
    honor: 42_000,
    creed: "Accurate typing is normal for you now. Very few players reach this.",
  },
  {
    slug: "shogun",
    name: "Shōgun",
    kanji: "将軍",
    honor: 65_000,
    creed: "This is the highest level. Keep playing to hold your place.",
  },
] as const;

/**
 * How a level is written wherever a player can see it: the number first, then
 * the name. Use this instead of `rank.name` on its own — the number is the part
 * that needs no explanation and no translation.
 */
export function rankLabel(rank: Rank): string {
  return `Level ${rankTier(rank)} · ${rank.name}`;
}

/** The highest rank whose Honor threshold has been met. */
export function rankForHonor(honor: number): Rank {
  let held = RANKS[0];
  for (const rank of RANKS) {
    if (honor >= rank.honor) held = rank;
  }
  return held;
}

/** The rank above the one currently held, or null at the top level. */
export function nextRank(honor: number): Rank | null {
  return RANKS.find((rank) => rank.honor > honor) ?? null;
}

/** Progress toward the next rank, 0–1. Returns 1 at the top level. */
export function rankProgress(honor: number): number {
  const held = rankForHonor(honor);
  const next = nextRank(honor);
  if (!next) return 1;
  const span = next.honor - held.honor;
  return span <= 0 ? 1 : (honor - held.honor) / span;
}

/** Which tier a rank is, 1-based, out of {@link RANKS}.length. */
export function rankTier(rank: Rank): number {
  return RANKS.findIndex((r) => r.slug === rank.slug) + 1;
}

/**
 * The rank just reached, if a balance crossing from `before` to `after` earned a
 * promotion — otherwise null.
 *
 * Only ever upward: it compares tiers, so a balance that somehow fell (a refund,
 * a correction) never fires a celebration for going down.
 */
export function rankUpBetween(before: number, after: number): Rank | null {
  const from = rankForHonor(before);
  const to = rankForHonor(after);
  return rankTier(to) > rankTier(from) ? to : null;
}
