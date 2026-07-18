"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { RANKS, rankTier, rankUpBetween } from "@/features/gamification/ranks";
import {
  LIMIT_REACHED_MESSAGE,
  applyHonorMultiplier,
  cooldownLeftSeconds,
  gamesRemaining,
  isLimitReached,
} from "@/features/play/limits";
import { getPlayLimits, startOfUtcDay } from "@/features/play/service";
import { computeScrollHonor, validateScrollResult } from "@/features/scroll/scoring";
import { ensureProfile } from "@/features/profile/service";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";

import type { RankUp } from "@/features/typing/actions";

/**
 * Recording a finished SCROLL round.
 *
 * The twin of `saveSession` for the typing game, and it keeps the same promises:
 * Honor is recomputed here from the reported counts (never trusted as a number),
 * the daily cap and cooldown are enforced across BOTH games, and a run that
 * crosses a rank line still lights the celebration. The counts are checked for
 * arithmetic sanity first — a round claiming more correct answers than it had
 * questions is refused before it is scored.
 */

export type ScrollSaveResult =
  | {
      status: "saved";
      honor: number;
      correct: number;
      total: number;
      remaining: number | null;
      rankUp: RankUp | null;
    }
  | { status: "limit"; message: string }
  | { status: "cooldown"; secondsLeft: number }
  | { status: "error"; message: string };

const resultSchema = z.object({
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  categorySlug: z.string().min(1).max(64).nullable().default(null),
  questionCount: z.number().int().min(1).max(30),
  correctCount: z.number().int().min(0).max(30),
  wrongCount: z.number().int().min(0).max(30),
  maxCombo: z.number().int().min(0).max(30),
});

export async function saveScrollSession(input: unknown): Promise<ScrollSaveResult> {
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That round did not make sense." };

  const r = parsed.data;

  // Arithmetic floor: refuse the impossible before scoring the improbable.
  const sane = validateScrollResult(r);
  if (!sane.ok) return { status: "error", message: sane.reason };

  // Training requires an account — the dojo is gated, so this only guards a
  // direct call to a public endpoint.
  const user = await getUser();
  if (!user) return { status: "error", message: "Sign in to record your round." };

  const baseHonor = computeScrollHonor(r.correctCount, r.maxCombo, r.difficulty);
  const xp = r.correctCount * 2;

  try {
    const profile = await ensureProfile(user);
    const limits = await getPlayLimits();
    const honor = applyHonorMultiplier(baseHonor, limits);

    const category = r.categorySlug
      ? await prisma.category.findUnique({ where: { slug: r.categorySlug }, select: { id: true } })
      : null;

    const outcome = await prisma.$transaction(async (tx) => {
      const since = startOfUtcDay();
      const [typingToday, scrollToday, lastTyping, lastScroll] = await Promise.all([
        tx.typingSession.count({ where: { profileId: profile.id, playedAt: { gte: since } } }),
        tx.scrollSession.count({ where: { profileId: profile.id, playedAt: { gte: since } } }),
        tx.typingSession.findFirst({
          where: { profileId: profile.id },
          orderBy: { playedAt: "desc" },
          select: { playedAt: true },
        }),
        tx.scrollSession.findFirst({
          where: { profileId: profile.id },
          orderBy: { playedAt: "desc" },
          select: { playedAt: true },
        }),
      ]);
      const playedToday = typingToday + scrollToday;
      if (isLimitReached(playedToday, limits)) return { kind: "limit" as const };

      const lastMs = Math.max(
        lastTyping?.playedAt.getTime() ?? 0,
        lastScroll?.playedAt.getTime() ?? 0
      );
      const cooldown = cooldownLeftSeconds(lastMs > 0 ? lastMs : null, Date.now(), limits);
      if (cooldown > 0) return { kind: "cooldown" as const, secondsLeft: cooldown };

      const session = await tx.scrollSession.create({
        data: {
          profileId: profile.id,
          difficulty: r.difficulty,
          categoryId: category?.id ?? null,
          questionCount: r.questionCount,
          correctCount: r.correctCount,
          wrongCount: r.wrongCount,
          maxCombo: r.maxCombo,
          honorEarned: honor,
          xpEarned: xp,
        },
        select: { id: true },
      });

      const updated = await tx.profile.update({
        where: { id: profile.id },
        data: { honor: { increment: honor }, xp: { increment: xp }, lastPlayedOn: new Date() },
        select: { honor: true },
      });

      const promoted = rankUpBetween(updated.honor - honor, updated.honor);

      return {
        kind: "saved" as const,
        sessionId: session.id,
        remaining: gamesRemaining(playedToday + 1, limits),
        rankUp: promoted
          ? {
              name: promoted.name,
              kanji: promoted.kanji,
              creed: promoted.creed,
              tier: rankTier(promoted),
              total: RANKS.length,
            }
          : null,
      };
    });

    if (outcome.kind === "limit") return { status: "limit", message: LIMIT_REACHED_MESSAGE };
    if (outcome.kind === "cooldown") {
      return { status: "cooldown", secondsLeft: outcome.secondsLeft };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dojo");
    return {
      status: "saved",
      honor,
      correct: r.correctCount,
      total: r.questionCount,
      remaining: outcome.remaining,
      rankUp: outcome.rankUp,
    };
  } catch (error) {
    console.error("saveScrollSession failed", error);
    return { status: "error", message: "Your round could not be recorded." };
  }
}

/** Fetch a fresh round of questions for the SCROLL trainer. */
export async function loadScrollRound(input: unknown): Promise<
  | { ok: true; questions: { wordId: string; definition: string; answer: string; choices: string[] }[] }
  | { ok: false; message: string }
> {
  const schema = z.object({
    categorySlug: z.string().trim().max(64).optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    count: z.number().int().min(1).max(20).default(10),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Could not start a round." };

  // Imported lazily to keep the server-only question reader out of this action's
  // client-facing type surface.
  const { getScrollQuestions } = await import("@/features/scroll/queries");
  const questions = await getScrollQuestions({
    categorySlug: parsed.data.categorySlug,
    difficulty: parsed.data.difficulty,
    count: parsed.data.count,
  });

  if (questions.length === 0) {
    return { ok: false, message: "No vocabulary is ready yet. An admin adds meanings in Words." };
  }

  return {
    ok: true,
    questions: questions.map((q) => ({
      wordId: q.wordId,
      definition: q.definition,
      answer: q.answer,
      choices: q.choices,
    })),
  };
}
