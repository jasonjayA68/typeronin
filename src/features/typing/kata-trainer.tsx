"use client";

import { RotateCcwIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { rankForHonor } from "@/features/gamification/ranks";
import { DISCIPLINES, passagesFor } from "@/features/typing/passages";
import { LevelUpModal } from "@/features/gamification/level-up-modal";
import { saveSession, type SaveResult } from "@/features/typing/actions";
import { useKata, type CharState } from "@/features/typing/use-kata";
import { usePetals } from "@/shared/components/sakura/petal-context";
import { Button } from "@/shared/components/ui/button";

/**
 * Group characters into words so a line never breaks mid-word. Each word is an
 * inline-block, so wrapping happens between words while the per-character spans
 * inside stay exactly where the passage put them.
 */
function toWords(text: string) {
  const words: { key: number; chars: { ch: string; i: number }[] }[] = [];
  let current: { ch: string; i: number }[] = [];

  for (let i = 0; i < text.length; i++) {
    current.push({ ch: text[i], i });
    if (text[i] === " ") {
      words.push({ key: words.length, chars: current });
      current = [];
    }
  }
  if (current.length) words.push({ key: words.length, chars: current });
  return words;
}

type Words = ReturnType<typeof toWords>;

/**
 * Counts the engine does not keep, derived from the per-character states once
 * the run is over.
 *
 * A word counts as struck only if every one of its characters was attempted;
 * a run abandoned mid-word does not owe you a word. Streak counts consecutive
 * clean characters, combo consecutive clean words — combo is the harder of the
 * two, since one slip anywhere in a word breaks it.
 */
function summarise(words: Words, states: CharState[]) {
  let correctWords = 0;
  let incorrectWords = 0;
  let maxCombo = 0;
  let combo = 0;

  for (const word of words) {
    const attempted = word.chars.every(({ i }) => states[i] !== "pending");
    if (!attempted) continue;

    const clean = word.chars.every(({ i, ch }) => states[i] === "correct" || ch === " ");
    if (clean) {
      correctWords++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
    } else {
      incorrectWords++;
      combo = 0;
    }
  }

  let longestStreak = 0;
  let streak = 0;
  for (const state of states) {
    if (state === "correct") {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else if (state === "wrong") {
      streak = 0;
    }
  }

  return { correctWords, incorrectWords, maxCombo, longestStreak };
}

function Char({
  ch,
  state,
  isCursor,
}: {
  ch: string;
  state: CharState;
  isCursor: boolean;
}) {
  return (
    <span
      className={cn(
        "relative rounded-[3px] transition-colors duration-75",
        state === "pending" && "text-muted-foreground/45",
        state === "correct" && "text-foreground",
        // A missed cut stays visible for the rest of the run. That is the point.
        state === "wrong" &&
          "bg-destructive/15 text-destructive underline decoration-destructive/60 decoration-wavy underline-offset-4",
        isCursor && "bg-sakura/20"
      )}
    >
      {isCursor ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -left-px w-px animate-pulse bg-sakura"
        />
      ) : null}
      {ch}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-panel rounded-xl px-4 py-3">
      <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-2xl font-semibold",
          accent ? "text-sakura" : "text-foreground"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Today's standing against the daily limit, or null for a guest / no limit. */
export type TrainerPlayState = { remaining: number | null; cooldownLeft: number } | null;

/** The shape the game needs; the admin's Passage table narrowed to it. */
export type GamePassage = { id: string; title: string; text: string };

export function KataTrainer({
  passages,
  playState = null,
}: {
  passages: GamePassage[];
  playState?: TrainerPlayState;
}) {
  // KATA is one discipline now: the typing game. The choice of game — KATA or
  // SCROLL — is the toggle above this, so there is no sub-mode to pick here.
  const [passageIndex, setPassageIndex] = useState(0);

  // The admin's passages, or the built-in set if the table came back empty.
  const pool = useMemo<GamePassage[]>(
    () => (passages.length ? passages : passagesFor("kata")),
    [passages]
  );
  const passage = pool[passageIndex % pool.length];

  const { index, states, status, stats, refusals, handleKey, reset } = useKata(passage.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  // Games left today, kept in state so it falls as runs are saved. Null means no
  // limit (guest, or the feature is off).
  const [remaining, setRemaining] = useState<number | null>(playState?.remaining ?? null);
  // A rank-up celebration is shown once per promotion, until dismissed.
  const [rankDismissed, setRankDismissed] = useState(false);
  const { gust } = usePetals();

  const focus = useCallback(() => inputRef.current?.focus(), []);

  const words = useMemo(() => toWords(passage.text), [passage.text]);
  const finished = status === "finished";
  const seconds = (stats.elapsedMs / 1000).toFixed(1);

  /**
   * Identifies one completed run. The run is over before this is read, so the
   * inputs are settled — which is what makes it safe as a save guard.
   */
  const runKey = finished ? `${passage.id}:${stats.elapsedMs}:${stats.correct}` : null;
  const savedRun = useRef<string | null>(null);

  useEffect(() => {
    if (!runKey || savedRun.current === runKey) return;
    // Claim the run before awaiting: an effect that fires twice (Strict Mode,
    // or a re-render mid-flight) must not record the same cut twice.
    savedRun.current = runKey;

    const counts = summarise(words, states);
    void saveSession({
      mode: "PRACTICE",
      difficulty: "MEDIUM",
      categorySlug: null,
      targetSeconds: null,
      durationMs: Math.round(stats.elapsedMs),
      correctChars: stats.correct,
      incorrectChars: stats.wrong,
      ma: stats.ma,
      ...counts,
    }).then((result) => {
      setSaved(result);
      // A fresh result gets a fresh chance to celebrate.
      setRankDismissed(false);
      // Keep the remaining counter honest with what the server actually did.
      if (result.status === "saved") setRemaining(result.remaining);
      else if (result.status === "limit") setRemaining(0);
    });

    // A finished cut is worth a gust of blossom.
    gust(stats.wrong === 0 ? 1 : 0.5);
    // Only the completed run matters here; stats/words are settled by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  const nextPassage = () => {
    setPassageIndex((n) => (n + 1) % pool.length);
    setSaved(null);
    // useKata resets itself when the text changes.
  };

  const again = () => {
    reset();
    setSaved(null);
  };

  return (
    <div className="space-y-6">
      {/* Discipline blurb + games remaining */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground">{DISCIPLINES.kata.blurb}</p>
        {remaining !== null ? (
          <span className="ml-auto text-xs whitespace-nowrap" aria-live="polite">
            <span className="tabular text-sakura">{remaining}</span>{" "}
            <span className="text-muted-foreground">
              {remaining === 1 ? "game left" : "games left"} today
            </span>
          </span>
        ) : null}
      </div>

      {/* Live instrument panel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="WPM" value={String(stats.wpm)} hint={`raw ${stats.rawWpm}`} />
        <Stat label="Accuracy" value={`${stats.accuracy}%`} hint={`${stats.wrong} missed`} />
        <Stat label="Ma 間" value={String(stats.ma)} hint="rhythm evenness" accent />
        <Stat label="Time" value={`${seconds}s`} hint={passage.title} />
      </div>

      {/* The passage */}
      <div
        className="paper-texture relative cursor-text rounded-2xl border border-border/60 bg-card/40 p-6 sm:p-8"
        onClick={focus}
      >
        {/* Focus target. Kept transparent rather than hidden so it can still be
            reached by keyboard and so mobile raises a keyboard on tap. */}
        <input
          ref={inputRef}
          value=""
          onChange={() => {}}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 size-full cursor-text opacity-0"
          aria-label={`Type the passage: ${passage.title}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={finished}
        />

        <p
          className={cn(
            "font-mono text-lg leading-[2.1] tracking-wide transition-[filter] select-none sm:text-xl",
            !focused && !finished && "blur-[2px]"
          )}
        >
          {words.map((word) => (
            <span key={word.key} className="inline-block whitespace-pre">
              {word.chars.map(({ ch, i }) => (
                <Char key={i} ch={ch} state={states[i]} isCursor={i === index && !finished} />
              ))}
            </span>
          ))}
        </p>

        {!focused && !finished ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl bg-background/40">
            <p className="font-heading text-sm tracking-[0.2em] text-muted-foreground uppercase">
              Click to take your stance
            </p>
          </div>
        ) : null}
      </div>

      {/* The house rule, and the nudge when it is tested. */}
      <div className="flex min-h-6 items-center justify-between gap-4">
        <p
          aria-live="polite"
          className={cn(
            "text-sm transition-colors",
            refusals > 0 ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {refusals > 0
            ? "A cut once made cannot be unmade. Finish the passage."
            : "One cut. Backspace is disabled — strike deliberately."}
        </p>
        <Button variant="ghost" size="sm" onClick={again}>
          <RotateCcwIcon aria-hidden="true" />
          Reset
        </Button>
      </div>

      {/* Result */}
      {finished ? (
        <div className="gold-edge animate-in fade-in slide-in-from-bottom-2 rounded-2xl bg-card/60 p-6 duration-500 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-xs tracking-[0.22em] text-sakura uppercase">
                Cut complete
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {/* The server's figure once saved — it carries the daily multiplier
                    the client does not know about. */}
                <span className="tabular text-gradient-gold">
                  +{saved?.status === "saved" ? saved.honor : stats.honor}
                </span>{" "}
                Honor
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.wrong === 0
                  ? "Not a single stroke astray. This is the standard."
                  : `${stats.wrong} ${stats.wrong === 1 ? "stroke" : "strokes"} astray. Accuracy is weighted heaviest — clean the cut and the Honor follows.`}
              </p>
              {/* What actually became of the run. Never claim it was kept. */}
              <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
                {saved?.status === "saved" ? (
                  <>
                    Recorded.{" "}
                    {remaining === 0 ? (
                      <span className="text-foreground">That was today&apos;s last game. </span>
                    ) : null}
                    <Link href="/dashboard" className="text-sakura underline-offset-4 hover:underline">
                      See your standing
                    </Link>
                    .
                  </>
                ) : saved?.status === "limit" ? (
                  saved.message
                ) : saved?.status === "cooldown" ? (
                  `Too soon — wait ${saved.secondsLeft}s, and the next game will count.`
                ) : saved?.status === "error" ? (
                  saved.message
                ) : (
                  <>
                    At this pace you train as{" "}
                    <span className="text-foreground">{rankForHonor(stats.honor * 12).name}</span>.
                  </>
                )}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {remaining === 0 ? (
                // No games left today. Starting another would only be refused by
                // the server, so send them onward instead.
                <Button asChild variant="dojo">
                  <Link href="/dashboard">
                    See your standing
                    <ArrowRightIcon aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={again}>
                    <RotateCcwIcon aria-hidden="true" />
                    Again
                  </Button>
                  <Button variant="dojo" onClick={nextPassage}>
                    Next passage
                    <ArrowRightIcon aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {saved?.status === "saved" && saved.rankUp ? (
        <LevelUpModal
          rankUp={saved.rankUp}
          honor={saved.honor}
          open={!rankDismissed}
          onClose={() => setRankDismissed(true)}
        />
      ) : null}
    </div>
  );
}
