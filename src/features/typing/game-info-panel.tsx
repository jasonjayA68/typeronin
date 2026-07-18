import { cn } from "@/lib/utils";

/**
 * The dojo's house rules, as a notice card.
 *
 * Replaces the one-line reminder under the passage with something a first-time
 * student actually reads. Four of the five lines are fixed truths of the game;
 * the last two are wired to the LIVE settings — the daily cap and the payout
 * minimum are admin-editable, so hardcoding "one game a day" or "$5" here would
 * be a notice that quietly lies the moment an operator changes a value. When no
 * cap is set the line says so honestly rather than inventing one.
 *
 * Styled as a paper notice pinned to the wall of the hall — washi texture, an
 * ink-brush edge, a single seal kanji (掟, "okite", a house code).
 */
export function GameInfoPanel({
  minWithdrawalHonor,
  minPayoutCash,
  maxGamesPerDay,
  className,
}: {
  minWithdrawalHonor: number;
  minPayoutCash: string;
  /** 0 means no cap is set. */
  maxGamesPerDay: number;
  className?: string;
}) {
  const rules = [
    "Backspace is disabled — a struck character is final.",
    "Accuracy is weighted heaviest in the Honor you earn.",
    "Complete the entire passage; an abandoned run counts for nothing.",
    maxGamesPerDay > 0
      ? `Daily limit: ${maxGamesPerDay} ${maxGamesPerDay === 1 ? "game" : "games"} earn Honor each day.`
      : "Daily limits may apply — check your remaining games above.",
    `Honor is redeemable once your balance reaches ${minWithdrawalHonor.toLocaleString()} (${minPayoutCash}).`,
  ];

  return (
    <aside
      className={cn(
        "paper-texture gold-edge relative overflow-hidden rounded-2xl bg-card/50 p-6 sm:p-7",
        className
      )}
      aria-labelledby="dojo-rules-title"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-3 right-3 font-heading text-7xl text-sakura/10 select-none sm:text-8xl"
      >
        掟
      </span>

      <p className="font-heading text-[0.7rem] font-semibold tracking-[0.22em] text-sakura uppercase">
        The House Code
      </p>
      <h2 id="dojo-rules-title" className="mt-1 font-heading text-xl font-semibold tracking-wide">
        Discipline Before Reward
      </h2>

      <ul className="mt-4 space-y-2.5">
        {rules.map((rule, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-pretty">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-sakura/70" />
            <span className="text-muted-foreground">{rule}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
