/**
 * What a SCROLL round is worth, and whether a reported result is even possible.
 *
 * Pure, and the server's source of truth for Honor: the client reports how many
 * it got right and how long its best run was, and this recomputes the payout
 * from those — never trusting a number the client calls "honor". That is the same
 * posture the typing game takes (see features/typing/actions.ts), and a proper
 * anti-cheat pass belongs to both modes at once, not this one alone.
 *
 * `validateScrollResult` is the gate before any of it counts: the counts have to
 * be internally consistent, because a run with more correct answers than
 * questions, or a combo longer than the answers it is built from, did not happen.
 */

export type ScrollDifficulty = "EASY" | "MEDIUM" | "HARD";

/** Honor per correct answer, by difficulty. Harder words, more Honor. */
const BASE_PER_CORRECT: Record<ScrollDifficulty, number> = {
  EASY: 8,
  MEDIUM: 12,
  HARD: 18,
};

/** A round is a handful of questions; more than this is not a legitimate report. */
export const MAX_SCROLL_QUESTIONS = 30;

export function computeScrollHonor(
  correctCount: number,
  maxCombo: number,
  difficulty: ScrollDifficulty
): number {
  if (correctCount <= 0) return 0;

  const earned = correctCount * BASE_PER_CORRECT[difficulty];

  // A steady run is rewarded: 10% for every five-in-a-row, capped at +50% so a
  // lucky streak cannot dwarf the work of answering.
  const comboBonus = Math.min(0.5, Math.floor(Math.max(0, maxCombo) / 5) * 0.1);

  return Math.round(earned * (1 + comboBonus));
}

export type ScrollResult = {
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  maxCombo: number;
};

/**
 * Whether a reported result could actually have occurred. Not anti-cheat on its
 * own — it is the arithmetic floor beneath it, rejecting the impossible before
 * the merely improbable is even scored.
 */
export function validateScrollResult(r: ScrollResult): { ok: true } | { ok: false; reason: string } {
  const nums = [r.questionCount, r.correctCount, r.wrongCount, r.maxCombo];
  if (!nums.every((n) => Number.isInteger(n) && n >= 0)) {
    return { ok: false, reason: "Counts must be whole and non-negative." };
  }
  if (r.questionCount < 1 || r.questionCount > MAX_SCROLL_QUESTIONS) {
    return { ok: false, reason: "That is not a round length this game plays." };
  }
  if (r.correctCount + r.wrongCount > r.questionCount) {
    return { ok: false, reason: "More answers than there were questions." };
  }
  if (r.maxCombo > r.correctCount) {
    return { ok: false, reason: "A combo longer than the answers it is made of." };
  }
  return { ok: true };
}
