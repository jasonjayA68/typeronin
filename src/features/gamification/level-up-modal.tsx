"use client";

import { useEffect } from "react";

import type { RankUp } from "@/features/typing/actions";
import { usePetals } from "@/shared/components/sakura/petal-context";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/**
 * The level-up celebration.
 *
 * Built on the shared Dialog so it inherits a focus trap, Escape-to-close and a
 * backdrop for free — a celebration is still a modal, and reinventing that is how
 * one ends up not keyboard-reachable. The theatre is layered on top: a glow, a
 * single bright sweep across the panel once, the new level number rising into
 * place, and a gust of petals summoned through the field already on the page.
 *
 * The number is the hero rather than the level's kanji: a player in any country
 * can read "5 of 9" and know exactly how far they have come, which is the whole
 * point of the moment. The name follows underneath as flavour.
 *
 * Every animation is defined in globals.css and is switched off wholesale by the
 * reduced-motion rule there — so for a reader who asked for stillness this simply
 * appears, says what happened, and waits.
 *
 * On the "Honor multiplier" the brief asked for: levels in this game do not carry
 * one — a multiplier is a property of a game mode and the daily rules, not a
 * level. So the badge shows the level reached instead, which is the true thing a
 * level confers.
 */
export function LevelUpModal({
  rankUp,
  honor,
  open,
  onClose,
}: {
  rankUp: RankUp;
  honor: number;
  open: boolean;
  onClose: () => void;
}) {
  const { gust } = usePetals();

  useEffect(() => {
    // Thicken the blossom for the length of the moment, then let it settle.
    if (open) gust(1.5, 3400);
  }, [open, gust]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="overflow-hidden border-sakura/30 text-center sm:max-w-md">
        {/* Glow behind everything. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_28%,color-mix(in_oklab,var(--color-sakura)_22%,transparent),transparent_72%)]"
        />
        {/* The sweep of light. */}
        <span aria-hidden="true" className="katana-slash" />

        <DialogTitle className="sr-only">
          Level up. You are now Level {rankUp.tier}, {rankUp.name}.
        </DialogTitle>

        <div className="rank-rise flex flex-col items-center gap-1 py-3">
          <p className="font-heading text-[0.7rem] font-semibold tracking-[0.3em] text-sakura uppercase">
            Level Up
          </p>

          <div className="relative my-3 grid place-items-center">
            <span
              aria-hidden="true"
              className="rank-halo absolute size-28 rounded-full bg-sakura/25 blur-2xl"
            />
            <span
              aria-hidden="true"
              className="text-gradient-gold tabular relative font-heading text-6xl leading-none"
            >
              {rankUp.tier}
            </span>
          </div>

          <p className="font-heading text-2xl font-semibold tracking-wide">
            Level {rankUp.tier} · {rankUp.name}
          </p>
          <p className="tabular text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
            Level {rankUp.tier} of {rankUp.total}
          </p>

          <DialogDescription className="mt-3 max-w-xs text-pretty text-muted-foreground">
            {rankUp.creed}
          </DialogDescription>

          <p className="mt-4 text-sm text-muted-foreground">
            <span className="text-gradient-gold tabular text-lg font-semibold">
              +{honor.toLocaleString()}
            </span>{" "}
            Honor from this game
          </p>
        </div>

        <Button variant="dojo" className="mt-2 w-full" onClick={onClose} autoFocus>
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
