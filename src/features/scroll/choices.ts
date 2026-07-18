/**
 * Turning a word and a pool of others into a multiple-choice question.
 *
 * Pure and rng-injected, so the gameplay can be random while the test is exact.
 * The rules that matter: the answer is always present, the distractors are
 * distinct from it and from each other (case-insensitively — "Ken" and "ken"
 * must not both appear), and the whole set is shuffled so the answer is not
 * always in the same seat.
 */

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * `size` choices at most: the answer plus up to `size - 1` distractors. Returns
 * fewer only when the pool cannot supply enough distinct wrong answers — the
 * caller decides whether a one-choice question is worth showing (it is not).
 */
export function buildChoices(
  answer: string,
  distractors: readonly string[],
  size = 4,
  rng: () => number = Math.random
): string[] {
  const seen = new Set([answer.trim().toLowerCase()]);
  const picked: string[] = [];

  for (const candidate of shuffle(distractors, rng)) {
    const key = candidate.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    picked.push(candidate);
    if (picked.length >= size - 1) break;
  }

  return shuffle([answer, ...picked], rng);
}
