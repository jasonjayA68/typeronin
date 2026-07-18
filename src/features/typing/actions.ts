"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  LIMIT_REACHED_MESSAGE,
  applyHonorMultiplier,
  cooldownLeftSeconds,
  gamesRemaining,
  isLimitReached,
} from "@/features/play/limits";
import { getPlayLimits } from "@/features/play/service";
import { ensureProfile } from "@/features/profile/service";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";

/**
 * A finished run, as reported by the browser.
 *
 * Raw counts only — never the score. Honor is recomputed here from these, so a
 * crafted request can inflate at most the inputs, and the formula the UI showed
 * is the one that actually pays out.
 */
const resultSchema = z.object({
  mode: z.enum(["PRACTICE", "TIMED"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  categorySlug: z.string().min(1).max(64).nullable().default(null),
  targetSeconds: z.number().int().min(1).max(3600).nullable().default(null),
  durationMs: z.number().int().min(500).max(3_600_000),
  correctChars: z.number().int().min(0).max(100_000),
  incorrectChars: z.number().int().min(0).max(100_000),
  correctWords: z.number().int().min(0).max(20_000),
  incorrectWords: z.number().int().min(0).max(20_000),
  longestStreak: z.number().int().min(0).max(100_000),
  maxCombo: z.number().int().min(0).max(100_000),
  ma: z.number().int().min(0).max(100).nullable().default(null),
});

export type SaveResult =
  | { status: "saved"; honor: number; sessionId: string; remaining: number | null }
  /** Played without an account. Not an error — the dojo is open. */
  | { status: "guest" }
  /** The day's games are used up. Carries the exact notice to show. */
  | { status: "limit"; message: string }
  /** Played again too soon; wait this many seconds. */
  | { status: "cooldown"; secondsLeft: number }
  | { status: "error"; message: string };

/** Midnight UTC today — the window a day's games are counted within. */
function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Mirrors the client formula: accuracy squared, nudged by Ma. */
function computeHonor(correctChars: number, accuracy: number, ma: number | null): number {
  const acc = accuracy / 100;
  return Math.max(0, Math.round(correctChars * acc * acc * (0.8 + (ma ?? 0) / 250)));
}

export async function saveSession(input: unknown): Promise<SaveResult> {
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That result did not make sense." };

  const user = await getUser();
  if (!user) return { status: "guest" };

  const r = parsed.data;

  // Derive rather than accept: speed and accuracy are functions of the counts.
  const typedChars = r.correctChars + r.incorrectChars;
  if (typedChars === 0) return { status: "error", message: "Nothing was typed." };

  const minutes = r.durationMs / 60_000;
  const accuracy = Math.round((r.correctChars / typedChars) * 1000) / 10;
  const wpm = Math.round(r.correctChars / 5 / minutes);
  const rawWpm = Math.round(typedChars / 5 / minutes);

  // No hand does this. Past it, the clock is wrong or it is not a hand at all;
  // either way it must not reach the Hall of Legends.
  if (wpm > 400) return { status: "error", message: "That result could not be verified." };

  const baseHonor = computeHonor(r.correctChars, accuracy, r.ma);
  const xp = Math.round(r.correctWords * 1.5);

  try {
    const profile = await ensureProfile(user);

    // The daily limits gate the record and scale the payout. Read once, applied
    // inside the transaction so the day's count and the write cannot diverge.
    const limits = await getPlayLimits();
    const honor = applyHonorMultiplier(baseHonor, limits);

    const category = r.categorySlug
      ? await prisma.category.findUnique({ where: { slug: r.categorySlug }, select: { id: true } })
      : null;

    /**
     * One transaction: the limit is checked, the session written and the balance
     * moved together. The count is read inside it so two runs finishing at once
     * cannot both slip past the last allowed game — the same reason the withdrawal
     * daily limit counts inside its transaction.
     */
    const outcome = await prisma.$transaction(async (tx) => {
      const playedToday = await tx.typingSession.count({
        where: { profileId: profile.id, playedAt: { gte: startOfUtcDay() } },
      });
      if (isLimitReached(playedToday, limits)) return { kind: "limit" as const };

      const last = await tx.typingSession.findFirst({
        where: { profileId: profile.id },
        orderBy: { playedAt: "desc" },
        select: { playedAt: true },
      });
      const cooldown = cooldownLeftSeconds(last?.playedAt.getTime() ?? null, Date.now(), limits);
      if (cooldown > 0) return { kind: "cooldown" as const, secondsLeft: cooldown };

      const session = await tx.typingSession.create({
        data: {
          profileId: profile.id,
          mode: r.mode,
          difficulty: r.difficulty,
          categoryId: category?.id ?? null,
          durationMs: r.durationMs,
          targetSeconds: r.targetSeconds,
          wpm,
          rawWpm,
          accuracy,
          correctWords: r.correctWords,
          incorrectWords: r.incorrectWords,
          correctChars: r.correctChars,
          incorrectChars: r.incorrectChars,
          longestStreak: r.longestStreak,
          maxCombo: r.maxCombo,
          ma: r.ma,
          honorEarned: honor,
          xpEarned: xp,
        },
        select: { id: true },
      });

      await tx.profile.update({
        where: { id: profile.id },
        data: {
          honor: { increment: honor },
          xp: { increment: xp },
          // Day-boundary streak logic belongs with daily rewards; for now just
          // record that they trained today.
          lastPlayedOn: new Date(),
        },
      });

      return {
        kind: "saved" as const,
        sessionId: session.id,
        remaining: gamesRemaining(playedToday + 1, limits),
      };
    });

    if (outcome.kind === "limit") return { status: "limit", message: LIMIT_REACHED_MESSAGE };
    if (outcome.kind === "cooldown") {
      return { status: "cooldown", secondsLeft: outcome.secondsLeft };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dojo");
    return { status: "saved", honor, sessionId: outcome.sessionId, remaining: outcome.remaining };
  } catch (error) {
    console.error("saveSession failed", error);
    return { status: "error", message: "Your run could not be recorded." };
  }
}
