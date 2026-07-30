"use client";

import { ArrowRightIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { celebrateBonus } from "@/features/gamification/celebrate-bonus";
import { LevelUpModal } from "@/features/gamification/level-up-modal";
import { loadScrollRound, saveScrollSession, type ScrollSaveResult } from "@/features/scroll/actions";
import { playSlash } from "@/features/scroll/slash-sound";
import type { TrainerPlayState } from "@/features/typing/kata-trainer";
import { usePetals } from "@/shared/components/sakura/petal-context";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

/**
 * Find the Word — the vocabulary game. ("Scroll" is the internal name, kept in
 * every identifier, action and table; only the label the player reads changed.)
 *
 * A meaning is shown; the player picks the word it belongs to from a handful of
 * choices, and the answer is revealed with a slash animation across the card they
 * chose: one stroke for a right answer, two crossing strokes and a red flash for
 * a wrong one — the heavier mark for the heavier moment. The right answer's mark
 * fades, the wrong answer's holds as an X so the result is still readable a
 * second later. The timing is what sells it and it lives in globals.css (.cut-*).
 *
 * The run of correct answers is the streak, and the whole round's Honor is settled
 * by the server, which recomputes it from the counts rather than trusting them.
 */

type Question = { wordId: string; definition: string; answer: string; choices: string[] };

/** The round plays a single difficulty so its Honor is scored at one rate. */
const ROUND_DIFFICULTY = "MEDIUM" as const;
const ROUND_SIZE = 10;

/* The shape of a slash.
   -----------------------------------------------------------------------
   Each stroke is a crescent: an arc that bows across the card and closes to
   a point at either end, thickest in the middle. Both paths below are the
   same arc drawn at two weights — a wide one for the stroke in flight, a
   fine one for the mark it leaves behind.

   They are drawn with preserveAspectRatio="none" so the crescent stretches
   to the width of whatever card it lands on. That does flatten the arc on a
   wide card, which is the right trade: a slash reads by its curve, and a
   curve held to a fixed aspect would either overshoot a wide card or fail to
   cross a narrow one. */
const BLADE_BODY = "M4 32 Q100 -16 196 32 Q100 2 4 32 Z";
const BLADE_CORE = "M16 31 Q100 -13 184 31 Q100 -4 16 31 Z";
const SCAR_ARC = "M10 31.5 Q100 -12.5 190 31.5 Q100 -6.5 10 31.5 Z";

/** The stroke mid-swing: the tone's crescent with a white one riding its edge. */
function CutBlade() {
  return (
    <svg className="cut-blade" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <path className="cut-blade-body" d={BLADE_BODY} />
      <path className="cut-blade-core" d={BLADE_CORE} />
    </svg>
  );
}

/** The mark left behind, on the same arc the stroke travelled. */
function CutScar({ className }: { className: string }) {
  return (
    <svg
      className={cn("cut-scar", className)}
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={SCAR_ARC} />
    </svg>
  );
}

export function ScrollTrainer({ playState = null }: { playState?: TrainerPlayState }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [slash, setSlash] = useState<{ key: number; wrong: boolean } | null>(null);
  const [saved, setSaved] = useState<ScrollSaveResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(playState?.remaining ?? null);
  const [rankDismissed, setRankDismissed] = useState(false);
  const { gust } = usePetals();
  const savingRef = useRef(false);

  // The async fetch only — its state is set in the callback, never synchronously
  // in an effect body. Safe to run on mount.
  const fetchRound = useCallback(() => {
    void loadScrollRound({ difficulty: ROUND_DIFFICULTY, count: ROUND_SIZE }).then((result) => {
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setQuestions(result.questions);
    });
  }, []);

  // Reset everything for a fresh round. Called from the button — an event
  // handler, where synchronous state resets belong.
  const restart = useCallback(() => {
    setQuestions(null);
    setLoadError(null);
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setWrong(0);
    setCombo(0);
    setMaxCombo(0);
    setSlash(null);
    setSaved(null);
    savingRef.current = false;
    fetchRound();
  }, [fetchRound]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  const question = questions?.[index];
  const finished = Boolean(questions && index >= questions.length);

  // When the round ends, settle it with the server exactly once.
  useEffect(() => {
    if (!questions || !finished || savingRef.current) return;
    savingRef.current = true;

    void saveScrollSession({
      difficulty: ROUND_DIFFICULTY,
      categorySlug: null,
      questionCount: questions.length,
      correctCount: correct,
      wrongCount: wrong,
      maxCombo,
    }).then((result) => {
      setSaved(result);
      setRankDismissed(false);
      if (result.status === "saved") {
        setRemaining(result.remaining);
        // Extra Honor from any achievement or mission this round completed.
        if (result.bonus) celebrateBonus(result.bonus.unlocked);
      } else if (result.status === "limit") setRemaining(0);
      gust(correct >= wrong ? 1 : 0.5);
    });
    // Only the transition into "finished" matters; the counts are settled by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const pick = (choice: string) => {
    if (picked || !question) return;
    const right = choice === question.answer;

    setPicked(choice);
    setSlash({ key: index, wrong: !right });
    // A sound on the slash — a bright ring for right, a duller knock for wrong.
    // Synthesised (no audio file), and skipped under reduced-motion.
    playSlash(right ? "clean" : "wrong");
    if (right) {
      setCorrect((c) => c + 1);
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
    } else {
      setWrong((w) => w + 1);
      setCombo(0);
    }

    // A beat to read the result, then the next question.
    window.setTimeout(() => {
      setPicked(null);
      setIndex((i) => i + 1);
    }, 950);
  };

  /* ---------------------------------------------------------------- loading */

  if (loadError) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-heading text-sm tracking-wide">Find the Word is not ready</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-pretty text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  if (!questions) {
    return <div className="min-h-72 animate-pulse rounded-2xl border border-border/60 bg-card" />;
  }

  /* ----------------------------------------------------------------- result */

  if (finished) {
    const dayDone = remaining === 0;
    return (
      <>
        <div className="gold-edge animate-in fade-in slide-in-from-bottom-2 rounded-2xl bg-card p-8 text-center duration-500">
          <p className="font-heading text-xs tracking-[0.22em] text-sakura uppercase">Round complete</p>
          <p className="mt-3 text-3xl font-semibold">
            <span className="tabular text-gradient-gold">{correct}</span>
            <span className="text-muted-foreground"> / {questions.length}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Longest streak: <span className="tabular text-foreground">{maxCombo}</span> correct in a
            row.
          </p>

          <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
            {saved?.status === "saved" ? (
              <>
                <span className="tabular text-gradient-gold text-base font-semibold">
                  +{saved.honor}
                </span>{" "}
                Honor recorded.
                {remaining === 0 ? (
                  <span className="text-foreground"> That was today&apos;s last game.</span>
                ) : null}
              </>
            ) : saved?.status === "limit" ? (
              saved.message
            ) : saved?.status === "cooldown" ? (
              `Please wait ${saved.secondsLeft} seconds. Your next round will then count.`
            ) : saved?.status === "error" ? (
              saved.message
            ) : (
              "Saving your score…"
            )}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            {dayDone ? (
              <Button asChild variant="dojo">
                <Link href="/dashboard">
                  See your progress
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button variant="dojo" onClick={restart} disabled={saved === null}>
                <RotateCcwIcon aria-hidden="true" />
                Another round
              </Button>
            )}
          </div>
        </div>

        {saved?.status === "saved" && saved.rankUp ? (
          <LevelUpModal
            rankUp={saved.rankUp}
            honor={saved.honor}
            open={!rankDismissed}
            onClose={() => setRankDismissed(true)}
          />
        ) : null}
      </>
    );
  }

  /* ------------------------------------------------------------------- play */

  const revealed = picked !== null;

  return (
    <div className="space-y-6">
      {/* What to do, how it is scored, and what it pays. */}
      <p className="text-xs text-muted-foreground">
        Read the meaning, then pick the word that matches it. Every correct answer earns Honor.
      </p>

      {/* Progress + streak */}
      <div className="flex items-center justify-between gap-4 text-sm">
        <p className="text-muted-foreground">
          Question <span className="tabular text-foreground">{index + 1}</span> of{" "}
          <span className="tabular">{questions.length}</span>
        </p>
        <div className="flex items-center gap-4">
          {combo >= 2 ? (
            <span className="font-heading text-xs tracking-[0.16em] text-sakura uppercase">
              {combo} in a row
            </span>
          ) : null}
          {remaining !== null ? (
            <span className="text-xs text-muted-foreground">
              <span className="tabular text-sakura">{remaining}</span> games left today
            </span>
          ) : null}
        </div>
      </div>

      {/* The prompt */}
      <div className="paper-texture rounded-2xl border border-border/60 bg-card p-8 text-center sm:p-10">
        <p className="font-heading text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
          Which word means this
        </p>
        <p className="mt-3 text-lg text-pretty sm:text-xl">{question!.definition}</p>
      </div>

      {/* Choices — the slash lands here, on the answer you chose. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {question!.choices.map((choice) => {
          const isAnswer = choice === question!.answer;
          const isPicked = choice === picked;
          return (
            <button
              key={choice}
              type="button"
              disabled={revealed}
              onClick={() => pick(choice)}
              className={cn(
                // No overflow-hidden: the slash is meant to sweep BEYOND the
                // button's edges. The picked card lifts above its neighbours so
                // the overflowing cut draws over them, not under.
                "relative rounded-xl border px-4 py-3.5 text-left font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isPicked && slash && "z-20",
                !revealed && "border-border/60 hover:border-sakura/50 hover:bg-sakura/5",
                revealed && isAnswer && "border-success/60 bg-success/10 text-success",
                // The card reacts: a nudge for a right answer, a knock for a
                // wrong one. Only ever on the card the player actually chose.
                revealed && isPicked && isAnswer && "cut-recoil",
                revealed &&
                  isPicked &&
                  !isAnswer &&
                  "cut-shake border-destructive/60 bg-destructive/10 text-destructive",
                revealed && !isAnswer && !isPicked && "border-border/40 opacity-50"
              )}
            >
              {choice}
              {isPicked && slash ? (
                /* The slash. Each stroke is a crescent and the mark it leaves —
                   see the .cut-* rules in globals.css. The wrapper carries the
                   tone, so the same parts draw both the right answer and the
                   wrong one. */
                <span
                  key={slash.key}
                  aria-hidden="true"
                  className={slash.wrong ? "cut-wrong" : "cut-clean"}
                >
                  {slash.wrong ? (
                    <>
                      {/* Two strokes, the second a beat later, crossing into an
                          X that holds once the strokes have gone. */}
                      <CutBlade />
                      <CutScar className="cut-scar-hold" />
                      <span className="cut-cross">
                        <CutBlade />
                        <CutScar className="cut-scar-hold" />
                      </span>
                      <span className="impact-flash" />
                    </>
                  ) : (
                    <>
                      <CutBlade />
                      <CutScar className="cut-scar-fade" />
                    </>
                  )}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="min-h-5 text-center text-sm text-muted-foreground" aria-live="polite">
        {revealed
          ? picked === question!.answer
            ? "Correct."
            : `The right word was “${question!.answer}”.`
          : "Choose the word."}
      </p>
    </div>
  );
}
