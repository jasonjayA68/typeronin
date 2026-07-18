"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CharState = "pending" | "correct" | "wrong";
export type KataStatus = "idle" | "running" | "finished";

export type KataStats = {
  /** Net speed: correct characters only. */
  wpm: number;
  /** Gross speed, mistakes included. The gap between the two is the lesson. */
  rawWpm: number;
  /** Percentage of struck characters that landed. */
  accuracy: number;
  /** Ma (間) — rhythm evenness, 0–100. See `computeMa`. */
  ma: number;
  honor: number;
  elapsedMs: number;
  correct: number;
  wrong: number;
  typed: number;
};

const EMPTY: KataStats = {
  wpm: 0,
  rawWpm: 0,
  accuracy: 100,
  ma: 0,
  honor: 0,
  elapsedMs: 0,
  correct: 0,
  wrong: 0,
  typed: 0,
};

/**
 * Ma (間) — the interval between strikes.
 *
 * Speed says how fast you went; Ma says whether you went at one pace. We take
 * the spread of the gaps between keystrokes relative to their own middle, which
 * makes the score independent of how fast you type — a steady slow student can
 * outscore a fast erratic one, which is the entire point.
 *
 * Median and MAD rather than mean and standard deviation: one long pause to
 * think shouldn't erase an otherwise even passage.
 */
function computeMa(intervals: number[]): number {
  if (intervals.length < 8) return 0; // too short to have a rhythm worth naming

  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median <= 0) return 0;

  const deviations = intervals.map((i) => Math.abs(i - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)];

  // Dispersion relative to the student's own tempo.
  const spread = mad / median;

  // spread 0 -> 100, spread >= 0.9 -> 0. The ceiling is deliberately reachable:
  // a metric nobody can max is a metric nobody trains.
  return Math.round(Math.max(0, 1 - spread / 0.9) * 100);
}

/**
 * Honor is the only currency that advances rank, so it is weighted hard toward
 * accuracy: squaring it means a sloppy fast run cannot out-earn a clean one.
 * Ma is a modest multiplier — it rewards composure without dominating.
 */
function computeHonor(correct: number, accuracy: number, ma: number): number {
  const acc = accuracy / 100;
  return Math.round(correct * acc * acc * (0.8 + ma / 250));
}

const freshStates = (length: number): CharState[] => Array(length).fill("pending");

export function useKata(text: string) {
  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<CharState[]>(() => freshStates(text.length));
  const [status, setStatus] = useState<KataStatus>("idle");
  const [now, setNow] = useState(0);
  /** Bumped whenever a correction is refused, so the UI can nudge. */
  const [refusals, setRefusals] = useState(0);

  // Timing lives in state, not refs: the stats below are derived during render,
  // and a ref mutation would not tell React to recompute them.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stamps, setStamps] = useState<number[]>([]);

  const reset = useCallback(() => {
    setIndex(0);
    setStates(freshStates(text.length));
    setStatus("idle");
    setRefusals(0);
    setNow(0);
    setStartedAt(null);
    setStamps([]);
  }, [text]);

  // A new passage is a new kata. Adjusting state during render rather than in an
  // effect avoids rendering one frame of the old kata against the new text.
  const [renderedText, setRenderedText] = useState(text);
  if (renderedText !== text) {
    setRenderedText(text);
    setIndex(0);
    setStates(freshStates(text.length));
    setStatus("idle");
    setRefusals(0);
    setNow(0);
    setStartedAt(null);
    setStamps([]);
  }

  // Drive the live clock only while running.
  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [status]);

  const handleKey = useCallback(
    (event: React.KeyboardEvent) => {
      if (status === "finished") return;

      // The rule of the house: a cut once made cannot be unmade.
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        setRefusals((n) => n + 1);
        return;
      }

      // Ignore modifiers, arrows, tabs — anything that isn't a strike.
      if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;

      event.preventDefault();

      const t = performance.now();
      if (startedAt === null) {
        setStartedAt(t);
        setStatus("running");
      }
      setStamps((prev) => [...prev, t]);
      setNow(t);

      const landed = event.key === text[index];

      setStates((prev) => {
        const next = [...prev];
        next[index] = landed ? "correct" : "wrong";
        return next;
      });

      const nextIndex = index + 1;
      setIndex(nextIndex);
      if (nextIndex >= text.length) setStatus("finished");
    },
    [index, startedAt, status, text]
  );

  const stats = useMemo<KataStats>(() => {
    if (startedAt === null || stamps.length === 0) return EMPTY;

    const correct = states.reduce((n, s) => (s === "correct" ? n + 1 : n), 0);
    const wrong = states.reduce((n, s) => (s === "wrong" ? n + 1 : n), 0);
    const typed = correct + wrong;
    if (typed === 0) return EMPTY;

    const last = stamps[stamps.length - 1];
    const elapsedMs = Math.max(1, (status === "finished" ? last : now) - startedAt);
    const minutes = elapsedMs / 60_000;

    const intervals: number[] = [];
    for (let i = 1; i < stamps.length; i++) {
      intervals.push(stamps[i] - stamps[i - 1]);
    }

    const accuracy = (correct / typed) * 100;
    const ma = computeMa(intervals);

    return {
      wpm: Math.round(correct / 5 / minutes) || 0,
      rawWpm: Math.round(typed / 5 / minutes) || 0,
      accuracy: Math.round(accuracy * 10) / 10,
      ma,
      honor: status === "finished" ? computeHonor(correct, accuracy, ma) : 0,
      elapsedMs,
      correct,
      wrong,
      typed,
    };
  }, [states, status, now, stamps, startedAt]);

  return { index, states, status, stats, refusals, handleKey, reset };
}
