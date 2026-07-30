import { toast } from "sonner";

/**
 * Announce the extra Honor a run just earned from achievements and missions.
 *
 * Called from the trainers with a save result's `bonus.unlocked`. The level-up is
 * its own modal (see LevelUpModal) — this is the quieter, more frequent reward,
 * so it is a toast: one per achievement or mission the run completed, naming it
 * and the Honor it paid. `kind: "trial"` is the internal name for an achievement
 * and stays as it is; only the label the player reads changed. The Honor is
 * already banked server-side; this only tells the player it happened.
 *
 * The parameter is typed structurally rather than importing ProgressReward, which
 * lives behind `server-only` — nothing here needs the server module.
 */
export type UnlockedToast = {
  kind: "trial" | "mission";
  title: string;
  honor: number;
};

export function celebrateBonus(unlocked: readonly UnlockedToast[]): void {
  for (const u of unlocked) {
    toast.success(u.kind === "trial" ? `Achievement earned: ${u.title}` : `Mission complete: ${u.title}`, {
      description: `+${u.honor.toLocaleString("en-US")} Honor`,
    });
  }
}
