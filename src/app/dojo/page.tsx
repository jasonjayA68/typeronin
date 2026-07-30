import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdSlot } from "@/features/ads/ad-slot";
import { LIMIT_REACHED_MESSAGE } from "@/features/play/limits";
import { getDailyPlayState } from "@/features/play/service";
import { getKataPassages } from "@/features/passages/queries";
import { DojoModes } from "@/features/dojo/dojo-modes";
import { getUser } from "@/lib/supabase/server";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "The Dojo",
  description:
    "Play two free typing games: Typing Phrases and Find the Word. Every game is scored on speed and accuracy, and earns Honor points.",
};

export default async function DojoPage() {
  // Playing requires an account — this is where Honor is earned. Authorization
  // lives here, next to the page, not in the proxy.
  const user = await getUser();
  if (!user) redirect("/login");

  const [playState, passages] = await Promise.all([
    getDailyPlayState(user.id),
    getKataPassages(),
  ]);

  // The games-left counter. `remaining` is null only if an admin has set the cap
  // to unlimited; normally it is a number out of the daily maximum.
  const cap = playState.limits.maxGamesPerDay;
  const remaining = playState.remaining;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Play · Learn · Earn"
          title="The Dojo"
          lede="Pick a game and play. Typing Phrases builds your typing speed. Find the Word builds your English. Both earn Honor — the points you earn by playing."
        />
        <Container className="py-12 sm:py-16">
          {/* Daily games remaining — the one meter that matters while you play. */}
          <div className="mx-auto mb-8 flex max-w-md items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4">
            <div>
              <p className="font-heading text-[0.7rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Games Left Today
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">You get new games every day</p>
            </div>
            <p className="tabular text-2xl font-semibold text-sakura">
              {remaining === null ? (
                "Unlimited"
              ) : (
                <>
                  {remaining} <span className="text-lg text-muted-foreground">/ {cap}</span>
                </>
              )}
            </p>
          </div>

          {playState?.limitReached ? (
            <div className="gold-edge mx-auto max-w-xl rounded-2xl bg-card p-8 text-center sm:p-10">
              <p className="font-heading text-xs tracking-[0.22em] text-sakura uppercase">
                That is all for today
              </p>
              <p className="mt-3 text-lg text-pretty">{LIMIT_REACHED_MESSAGE}</p>
              <p className="tabular mt-4 text-sm text-muted-foreground">
                {playState.playedToday} {playState.playedToday === 1 ? "game" : "games"} played
                today.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button asChild variant="dojo" size="sm">
                  <Link href="/dashboard">Go to your dashboard</Link>
                </Button>
              </div>
            </div>
          ) : (
            <DojoModes
              passages={passages}
              playState={{ remaining: playState.remaining, cooldownLeft: playState.cooldownLeft }}
            />
          )}

          <AdSlot placement="game-result" className="mt-10" />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
