"use client";

import { BookOpenIcon, KeyboardIcon } from "lucide-react";
import { useState } from "react";

import { ScrollTrainer } from "@/features/scroll/scroll-trainer";
import { KataTrainer, type GamePassage, type TrainerPlayState } from "@/features/typing/kata-trainer";
import { cn } from "@/lib/utils";

/**
 * The two games, and the switch between them.
 *
 * Typing Phrases is the keyboard: a phrase typed exactly, with no corrections.
 * Find the Word is vocabulary: a meaning matched to the word it belongs to. They
 * are the two ways to earn Honor, and both answer to the same daily limit, so the
 * switch changes what you do, not how much you may do.
 *
 * The `key` values stay "kata" and "scroll" — they are internal identifiers the
 * save actions and the session tables use. Only the labels changed.
 */

const MODES = [
  {
    key: "kata" as const,
    name: "Typing Phrases",
    icon: KeyboardIcon,
    blurb: "Type the phrase you see",
  },
  {
    key: "scroll" as const,
    name: "Find the Word",
    icon: BookOpenIcon,
    blurb: "Pick the word that matches",
  },
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
                  : "border-border/60 hover:border-border hover:bg-card"
              )}
            >
              <span className="flex items-center gap-2">
                <m.icon
                  aria-hidden="true"
                  className={cn("size-5", active ? "text-sakura" : "text-muted-foreground")}
                />
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
