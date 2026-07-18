/**
 * Name to slug. Deliberately local: a dependency for thirty characters of
 * regex is a supply-chain risk with no upside.
 *
 * NFKD splits accented letters into base + combining mark, so the marks can be
 * dropped and "Kanji Grundlagen" survives as "kanji-grundlagen". Scripts with
 * no ASCII fallback (kana, Han) reduce to nothing — the caller must catch the
 * empty result rather than write a row with an empty slug.
 *
 * Shared by blog categories and posts. It lives here rather than beside either
 * because two copies of a slug rule is two answers to "what is this thing's URL",
 * and they would diverge the first time one of them was fixed.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}
