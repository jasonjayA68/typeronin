/**
 * The nine ranks. Progression is gated on Honor, which is only earned by
 * accurate cuts — speed alone never advances a student.
 *
 * Kept as one ordered list so the ladder renders, the badge resolves, and the
 * "next rank" maths all read from the same source.
 */

export type Rank = {
  slug: string;
  /** English name, used as the primary label. */
  name: string;
  /** Kanji, shown as a quiet secondary mark. */
  kanji: string;
  /** Honor required to hold this rank. */
  honor: number;
  /** One line of flavour, written as a sensei would say it. */
  creed: string;
};

export const RANKS: readonly Rank[] = [
  {
    slug: "heimin",
    name: "Heimin",
    kanji: "平民",
    honor: 0,
    creed: "You arrive with nothing but willingness. It is enough to begin.",
  },
  {
    slug: "ashigaru",
    name: "Ashigaru",
    kanji: "足軽",
    honor: 500,
    creed: "You hold the line. Your hands are learning where they live.",
  },
  {
    slug: "bushi",
    name: "Bushi",
    kanji: "武士",
    honor: 1_500,
    creed: "The keys no longer surprise you. Now the work truly starts.",
  },
  {
    slug: "samurai",
    name: "Samurai",
    kanji: "侍",
    honor: 4_000,
    creed: "You serve the sentence, not your own haste.",
  },
  {
    slug: "ronin",
    name: "Ronin",
    kanji: "浪人",
    honor: 8_000,
    creed: "No master, no excuses. Your discipline is now your own.",
  },
  {
    slug: "hatamoto",
    name: "Hatamoto",
    kanji: "旗本",
    honor: 15_000,
    creed: "Others watch your hands to learn the way of them.",
  },
  {
    slug: "karo",
    name: "Karō",
    kanji: "家老",
    honor: 26_000,
    creed: "You correct by example. Rarely by word.",
  },
  {
    slug: "daimyo",
    name: "Daimyō",
    kanji: "大名",
    honor: 42_000,
    creed: "Precision has become ordinary to you. That is the rarest thing.",
  },
  {
    slug: "shogun",
    name: "Shōgun",
    kanji: "将軍",
    honor: 65_000,
    creed: "There is no summit. There is only the next stroke, made well.",
  },
] as const;

/** The highest rank whose Honor threshold has been met. */
export function rankForHonor(honor: number): Rank {
  let held = RANKS[0];
  for (const rank of RANKS) {
    if (honor >= rank.honor) held = rank;
  }
  return held;
}

/** The rank above the one currently held, or null at the summit. */
export function nextRank(honor: number): Rank | null {
  return RANKS.find((rank) => rank.honor > honor) ?? null;
}

/** Progress toward the next rank, 0–1. Returns 1 at the summit. */
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
