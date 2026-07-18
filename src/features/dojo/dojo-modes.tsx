"use client";

import { useState } from "react";

import { ScrollTrainer } from "@/features/scroll/scroll-trainer";
import { KataTrainer, type GamePassage, type TrainerPlayState } from "@/features/typing/kata-trainer";
import { cn } from "@/lib/utils";

/**
 * The dojo's two disciplines, and the switch between them.
 *
 * KATA is the keyboard — a passage typed clean, no corrections. SCROLL is the
 * mind — a meaning matched to its word. They are the two ways to earn here, and
 * both answer to the same daily limit, so the switch changes what you do, not how
 * much you may do.
 */

const MODES = [
  { key: "kata" as const, name: "Kata", kanji: "形", blurb: "Type it clean" },
  { key: "scroll" as const, name: "Scroll", kanji: "巻", blurb: "Match the meaning" },
];

export function DojoModes({
  passages,
  playState,
}: {
  passages: GamePassage[];
  playState: TrainerPlayState;
}) {
  const [mode, setMode] = useState<"kata" | "scroll">("kata");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-center gap-3">
        {MODES.map((m) => {
          const active = m.key === mode;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              aria-pressed={active}
              className={cn(
                "min-w-36 rounded-xl border px-5 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-sakura/50 bg-sakura/10"
                  : "border-border/60 hover:border-border hover:bg-card/40"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("font-heading text-lg", active ? "text-sakura" : "text-muted-foreground")}
                >
                  {m.kanji}
                </span>
                <span className={cn("font-heading tracking-wide", active ? "text-foreground" : "text-muted-foreground")}>
                  {m.name}
                </span>
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{m.blurb}</span>
            </button>
          );
        })}
      </div>

      {mode === "kata" ? (
        <KataTrainer passages={passages} playState={playState} />
      ) : (
        <ScrollTrainer playState={playState} />
      )}
    </div>
  );
}
