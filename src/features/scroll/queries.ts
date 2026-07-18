import "server-only";

import { buildChoices, shuffle } from "@/features/scroll/choices";
import { prisma } from "@/lib/prisma";

import type { Difficulty } from "../../../generated/prisma/enums";

/**
 * A SCROLL round: some words that have a meaning, each dressed as a question.
 *
 * A question is a word with a definition; there is no separate table. The
 * distractors are other words from the SAME category, because a plausible wrong
 * answer is a near neighbour — offering "sunset" against three martial terms
 * gives the answer away. Distractors need no definition of their own; a wrong
 * answer only has to be a real, tempting word.
 *
 * Selection is a shuffled window rather than a true `ORDER BY random()` — honest
 * for a vocabulary corpus of realistic size, and it keeps this off raw SQL. The
 * gameplay layer (a later phase) consumes exactly this shape.
 */

export type ScrollQuestion = {
  wordId: string;
  answer: string;
  definition: string;
  difficulty: string;
  categoryName: string | null;
  /** The answer plus distractors, shuffled. */
  choices: string[];
};

const QUESTION_WINDOW = 200;
const POOL_WINDOW = 400;

export async function getScrollQuestions(opts: {
  categorySlug?: string;
  difficulty?: Difficulty;
  count?: number;
  choiceCount?: number;
}): Promise<ScrollQuestion[]> {
  const count = Math.min(Math.max(opts.count ?? 10, 1), 30);
  const choiceCount = Math.min(Math.max(opts.choiceCount ?? 4, 2), 6);

  const where = {
    definition: { not: null },
    isActive: true,
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
  };

  const eligible = await prisma.word.findMany({
    where,
    take: QUESTION_WINDOW,
    select: {
      id: true,
      text: true,
      definition: true,
      difficulty: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });
  if (eligible.length === 0) return [];

  const chosen = shuffle(eligible).slice(0, count);

  // Distractors come from the same categories — any active word, meaning or not.
  const categoryIds = [...new Set(chosen.map((w) => w.categoryId))];
  const pool = await prisma.word.findMany({
    where: { categoryId: { in: categoryIds }, isActive: true },
    take: POOL_WINDOW,
    select: { text: true, categoryId: true },
  });

  const poolByCategory = new Map<string, string[]>();
  for (const word of pool) {
    const list = poolByCategory.get(word.categoryId) ?? [];
    list.push(word.text);
    poolByCategory.set(word.categoryId, list);
  }

  return chosen
    .map((word): ScrollQuestion => {
      const choices = buildChoices(
        word.text,
        poolByCategory.get(word.categoryId) ?? [],
        choiceCount
      );
      return {
        wordId: word.id,
        answer: word.text,
        // `definition` is filtered non-null in the query; the assertion states that.
        definition: word.definition!,
        difficulty: word.difficulty,
        categoryName: word.category?.name ?? null,
        choices,
      };
    })
    // A question with no distractors is unplayable; drop it rather than show a
    // single-choice quiz.
    .filter((q) => q.choices.length >= 2);
}

/** How many SCROLL questions the corpus can currently offer. */
export async function countScrollQuestions(opts: {
  categorySlug?: string;
  difficulty?: Difficulty;
}): Promise<number> {
  return prisma.word.count({
    where: {
      definition: { not: null },
      isActive: true,
      ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
      ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
    },
  });
}
