import { ArrowRightIcon, GaugeIcon, ScrollTextIcon, SwordIcon } from "lucide-react";
import Link from "next/link";

import { AdSlot } from "@/features/ads/ad-slot";
import { RANKS } from "@/features/gamification/ranks";
import { cn } from "@/lib/utils";
import { InkDivider } from "@/shared/components/ink-divider";
import { Container } from "@/shared/components/layout/container";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

const pillars = [
  {
    icon: SwordIcon,
    kanji: "一刀",
    title: "One Cut, No Corrections",
    description:
      "Backspace is disabled. A struck character is final, and a missed one stands in red until the passage ends. You stop hammering the delete key and start choosing each stroke.",
  },
  {
    icon: GaugeIcon,
    kanji: "間",
    title: "Rhythm Is the Measure",
    description:
      "Ma scores the evenness of your intervals, not your pace. A steady slow hand outscores a fast erratic one — because tempo, not haste, is what survives pressure.",
  },
  {
    icon: ScrollTextIcon,
    kanji: "名誉",
    title: "Honor Is Earned, Not Clocked",
    description:
      "Accuracy is weighted squarely in the Honor you earn, so a sloppy sprint can never out-earn a clean pass. Rank follows Honor. Nothing else advances you.",
  },
] as const;

const stats = [
  { label: "Words per minute", value: "128" },
  { label: "Accuracy", value: "98.4%" },
  { label: "Ma 間", value: "91" },
] as const;


const scrolls = [
  {
    q: "Why can I not use backspace?",
    a: "Because correction is a crutch that hides the flaw. When every stroke is final you slow down by a fraction, you look before you cut, and the accuracy you build is real rather than repaired. Most students find their honest speed drops for a week and then passes where it was.",
  },
  {
    q: "What is Ma?",
    a: "Ma (間) is the interval between strikes. We measure how evenly spaced your keystrokes are relative to your own tempo, which makes the score independent of speed — a steady slow student can score higher than a fast erratic one. It is the difference between playing the notes and keeping the time.",
  },
  {
    q: "Is this just another typing test?",
    a: "A typing test measures you. A dojo trains you. The passages are prose rather than random word lists, corrections are refused, rhythm is scored beside speed, and rank is earned through accuracy over months rather than a number posted after sixty seconds.",
  },
  {
    q: "How is Honor calculated?",
    a: "Honor rises with the characters you cut cleanly, is multiplied by the square of your accuracy, and is nudged by your Ma. Squaring accuracy is deliberate: it means a fast, sloppy run cannot out-earn a slower clean one, no matter how many words you push through.",
  },
  {
    q: "Do I need an account?",
    a: "No. The dojo is open and you may train this minute without one. An account only exists so your Honor accrues, your rhythm can be compared against your past self, and your rank is remembered between visits.",
  },
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="paper-texture relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-10%,color-mix(in_oklab,var(--color-sakura)_28%,transparent),transparent_70%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
          />

          <Container className="py-24 text-center sm:py-32">
            <Badge variant="outline" className="mb-6 border-sakura/40 text-sakura">
              道 · Discipline · Precision · Mastery
            </Badge>

            <h1 className="mx-auto max-w-4xl text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl">
              Master Your Keyboard Like a Samurai{" "}
              <span className="text-gradient-gold">Masters the Sword</span>.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              A typing dojo with one rule: no corrections. Every stroke is final, your rhythm is
              measured beside your speed, and rank is earned one clean cut at a time.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="dojo" size="xl">
                <Link href="/dojo">
                  Take your stance
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="#the-way">See the Way</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No account needed to begin.
            </p>

            <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="glass-panel rounded-xl px-4 py-5">
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    {stat.label}
                  </dt>
                  <dd className="tabular mt-2 text-2xl font-semibold text-foreground">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Container>
        </section>

        <Container>
          <InkDivider crest />
        </Container>

        {/* ---------------- The Way ---------------- */}
        <section id="the-way" className="scroll-mt-20 py-24">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-heading text-xs font-semibold tracking-[0.22em] text-sakura uppercase">
                The Way
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
                Three Pillars of the Dojo
              </h2>
              <p className="mt-4 text-pretty text-muted-foreground">
                Bushido applied to the keyboard. Discipline first, glory after.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {pillars.map((pillar) => (
                <Card key={pillar.title} className="gold-edge relative overflow-hidden bg-card/60 backdrop-blur-sm">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-2 right-3 font-heading text-5xl text-foreground/[0.05] select-none"
                  >
                    {pillar.kanji}
                  </span>
                  <CardHeader>
                    <span className="mb-3 grid size-10 place-items-center rounded-lg border border-sakura/30 bg-sakura/10 text-sakura">
                      <pillar.icon className="size-5" aria-hidden="true" />
                    </span>
                    <CardTitle className="font-heading tracking-wide">{pillar.title}</CardTitle>
                    <CardDescription className="text-pretty">{pillar.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <Container>
          <AdSlot placement="between-sections" />
        </Container>

        {/* ---------------- The Nine Ranks ---------------- */}
        <section id="ranks" className="paper-texture scroll-mt-20 border-y border-border/60 py-24">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-heading text-xs font-semibold tracking-[0.22em] text-sakura uppercase">
                Progression
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
                Nine Ranks Stand Between You and Legend
              </h2>
              <p className="mt-4 text-pretty text-muted-foreground">
                Honor is the only currency that advances you, and Honor is weighted toward accuracy.
                There is no way to buy the distance, and no way to sprint it.
              </p>
            </div>

            <ol className="mx-auto mt-14 max-w-3xl">
              {RANKS.map((rank, i) => (
                <li
                  key={rank.slug}
                  className="relative flex gap-5 pb-8 last:pb-0"
                >
                  {/* The path: a line joining each rank to the next. */}
                  {i < RANKS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-11 bottom-0 left-[1.4rem] w-px bg-gradient-to-b from-gold/40 to-border"
                    />
                  ) : null}

                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-10 grid size-11 shrink-0 place-items-center rounded-full border font-heading text-sm",
                      i === RANKS.length - 1
                        ? "border-sakura/60 bg-sakura/10 text-sakura"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {rank.kanji.slice(0, 1)}
                  </span>

                  <div className="min-w-0 flex-1 pt-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-heading text-lg font-semibold tracking-wide">
                        {rank.name}
                      </h3>
                      <span className="text-sm text-muted-foreground">{rank.kanji}</span>
                      <span className="tabular ml-auto text-sm text-sakura">
                        {rank.honor.toLocaleString()} Honor
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-pretty text-muted-foreground">{rank.creed}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Container>
        </section>


        {/* ---------------- Scrolls ---------------- */}
        <section
          id="scrolls"
          className="paper-texture scroll-mt-20 border-t border-border/60 py-24"
        >
          <Container width="narrow">
            <div className="text-center">
              <p className="font-heading text-xs font-semibold tracking-[0.22em] text-sakura uppercase">
                Scrolls
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
                Questions Put to the Master
              </h2>
            </div>

            {/* <details> gives us accessible disclosure without shipping a byte of JS. */}
            <div className="mt-12 divide-y divide-border/60 border-y border-border/60">
              {scrolls.map((scroll) => (
                <details key={scroll.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <h3 className="font-heading text-base font-medium tracking-wide text-foreground">
                      {scroll.q}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">
                    {scroll.a}
                  </p>
                </details>
              ))}
            </div>

            <div className="mt-14 text-center">
              <p className="text-muted-foreground">The dojo is open. The only cost is attention.</p>
              <Button asChild variant="dojo" size="xl" className="mt-6">
                <Link href="/dojo">
                  Take your stance
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
