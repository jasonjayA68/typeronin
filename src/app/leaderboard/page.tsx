import type { Metadata } from "next";

import { rankForHonor, rankLabel } from "@/features/gamification/ranks";
import { cn } from "@/lib/utils";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "The top players on TypeRonin, ranked by Honor points. See their typing speed, accuracy and rhythm.",
};

type Standing = {
  name: string;
  wpm: number;
  /** Percent, one decimal. */
  accuracy: number;
  /** Rhythm: how even the typing speed was, 0–100. The `ma` name is the stored
   *  field this sample data stands in for; the column reads "Rhythm". */
  ma: number;
  honor: number;
};

/**
 * Ordered by Honor; the level column is resolved from it rather than stored.
 *
 * The sample names are deliberately from many countries: anyone opening this page
 * should see that the game is played worldwide, whichever country they are in.
 */
const STANDINGS: readonly Standing[] = [
  { name: "Adaeze Okonkwo", wpm: 142, accuracy: 99.2, ma: 94, honor: 68_400 },
  { name: "Kaede Mori", wpm: 138, accuracy: 98.7, ma: 91, honor: 51_200 },
  { name: "Lucas Ferreira", wpm: 131, accuracy: 98.9, ma: 89, honor: 44_900 },
  { name: "Sofia Reyes", wpm: 127, accuracy: 97.9, ma: 86, honor: 33_750 },
  { name: "Amara Singh", wpm: 124, accuracy: 98.1, ma: 88, honor: 28_400 },
  { name: "Omar Haddad", wpm: 119, accuracy: 97.4, ma: 83, honor: 21_600 },
  { name: "Mei Kobayashi", wpm: 116, accuracy: 97.8, ma: 85, honor: 17_900 },
  { name: "Elena Novak", wpm: 108, accuracy: 96.9, ma: 79, honor: 11_250 },
  { name: "Daniel Osei", wpm: 104, accuracy: 96.2, ma: 77, honor: 8_640 },
  { name: "Marisol Cruz", wpm: 99, accuracy: 95.8, ma: 74, honor: 5_310 },
];

const PERIODS = ["This Week", "This Month", "All Time"] as const;

/**
 * Blossom, steel, bronze — the colours for the top three places.
 *
 * All three read from theme-aware tokens rather than fixed hues, so each keeps
 * its contrast on both warm white and plum. Gold is deliberately not among
 * them: a gold light enough to look gilt cannot carry text on warm white, which
 * is why it now survives only on the logo.
 */
const MEDALS = ["text-sakura", "text-[var(--brand-steel)]", "text-warning"] as const;

export default function LeaderboardPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Play · Learn · Earn"
          title="Leaderboard"
          lede="The top players, ranked by Honor — the points you earn by playing. Accuracy earns more Honor than speed, so speed alone will not put you at the top."
        />
        <Container className="py-12 sm:py-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Top ten players</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Speed is shown in words per minute (WPM). Every score here was earned in a game.
              </p>
            </div>

            {/* Presentational until sessions are recorded — there is no period to filter on yet. */}
            <div
              role="group"
              aria-label="Time period"
              className="inline-flex w-fit rounded-lg border border-border bg-card p-1"
            >
              {PERIODS.map((period, index) => (
                <button
                  key={period}
                  type="button"
                  aria-pressed={index === 0}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    index === 0
                      ? "bg-sakura text-[#f7f0e1]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full min-w-3xl border-collapse text-sm">
              <caption className="sr-only">
                Players ranked by Honor earned, with words per minute, accuracy and rhythm.
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                  <th scope="col" className="w-14 px-4 py-3 text-left font-medium">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Player
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Level
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    WPM
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Accuracy
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Rhythm
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Honor
                  </th>
                </tr>
              </thead>
              <tbody>
                {STANDINGS.map((player, index) => {
                  const rank = rankForHonor(player.honor);
                  const medal = MEDALS[index];

                  return (
                    <tr
                      key={player.name}
                      className={cn(
                        "border-b border-border/60 last:border-0",
                        medal && "bg-sakura/[0.04]"
                      )}
                    >
                      <td
                        className={cn(
                          "tabular px-4 py-4 text-base font-semibold",
                          medal ?? "text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </td>
                      <th scope="row" className="px-4 py-4 text-left font-medium">
                        {player.name}
                      </th>
                      {/* The level number leads, so the column is readable
                          without knowing what the level names mean. */}
                      <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                        {rankLabel(rank)}
                      </td>
                      <td className="tabular px-4 py-4 text-right">{player.wpm}</td>
                      <td className="tabular px-4 py-4 text-right">
                        {player.accuracy.toFixed(1)}%
                      </td>
                      <td className="tabular px-4 py-4 text-right text-sakura">{player.ma}</td>
                      <td className="tabular px-4 py-4 text-right font-semibold">
                        {player.honor.toLocaleString("en-US")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Backspace is turned off in every game. You cannot fix a mistake, so every score here was
            typed right the first time.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
