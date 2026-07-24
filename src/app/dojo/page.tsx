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
    "Train a kata. One cut, no corrections — speed, accuracy, and Ma measured on every passage.",
};

export default async function DojoPage() {
  // Training requires an account. The dojo is where Honor is earned, and Honor is
  // an account's — there is no guest play. Authorization lives here, next to the
  // page, not in the proxy, which can only guess from a cookie.
  const user = await getUser();
  if (!user) redirect("/login");

  // The economy and the play limits used to be read here too, for the house-code
  // notice that sat under the trainer. That notice is gone, and so are its two
  // queries — getDailyPlayState reads the limits it needs on its own.
  const [playState, passages] = await Promise.all([
    getDailyPlayState(user.id),
    getKataPassages(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Discipline · Precision · Mastery"
          kanji="道場"
          title="The Dojo"
          lede="Choose a discipline and take your stance. Backspace is disabled: what you strike is what stands."
        />
        <Container className="py-12 sm:py-16">
          {playState?.limitReached ? (
            <div className="gold-edge mx-auto max-w-xl rounded-2xl bg-card/60 p-8 text-center sm:p-10">
              <p className="font-heading text-xs tracking-[0.22em] text-sakura uppercase">
                Today&apos;s training is done
              </p>
              <p className="mt-3 text-lg text-pretty">{LIMIT_REACHED_MESSAGE}</p>
              <p className="tabular mt-4 text-sm text-muted-foreground">
                {playState.playedToday} {playState.playedToday === 1 ? "game" : "games"} played
                today.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard">Your standing</Link>
                </Button>
                <Button asChild variant="dojo" size="sm">
                  <Link href="/withdrawals">Honor wallet</Link>
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
