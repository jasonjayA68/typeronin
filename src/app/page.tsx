import {
  ArrowRightIcon,
  GaugeIcon,
  GlobeIcon,
  KeyboardIcon,
  TrophyIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";

import { AdSlot } from "@/features/ads/ad-slot";
import { RANKS } from "@/features/gamification/ranks";
import { cn } from "@/lib/utils";
import { InkDivider } from "@/shared/components/ink-divider";
import { Container } from "@/shared/components/layout/container";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import { getUser } from "@/lib/supabase/server";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

/**
 * What the platform is, in three cards. Each answers a question a new visitor
 * asks in their first seconds: what do I do, what do I get better at, what's in
 * it for me. Short, plain, and readable by anyone.
 */
const pillars = [
  {
    icon: KeyboardIcon,
    tag: "Play",
    title: "Fast, focused typing games",
    description:
      "Type real phrases and match English words to their meaning. Every round is scored on speed and accuracy.",
  },
  {
    icon: GaugeIcon,
    tag: "Learn",
    title: "Build speed and English",
    description:
      "Grow your typing speed and your English vocabulary at the same time. You improve a little every day.",
  },
  {
    icon: WalletIcon,
    tag: "Earn",
    title: "Turn skill into rewards",
    description:
      "Accurate play earns Honor — the points you earn by playing. Honor moves you up the levels. You can turn it into real rewards and withdraw them.",
  },
] as const;

/** The live-feel stats in the hero. Illustrative, not a claim about any user. */
const stats = [
  { label: "Words per minute (WPM)", value: "128" },
  { label: "Accuracy", value: "98.4%" },
  { label: "Rhythm", value: "91" },
] as const;

/** "How it works" — three steps, so the loop is obvious before anyone scrolls far. */
const steps = [
  {
    n: "1",
    title: "Play a game",
    body: "Pick Typing Phrases or Find the Word. No setup, no downloads — start in one click.",
  },
  {
    n: "2",
    title: "Earn Honor",
    body: "Accurate, steady play scores highest. Missions and achievements pay extra Honor.",
  },
  {
    n: "3",
    title: "Level up and cash out",
    body: "Move up through nine levels. Turn your Honor into real rewards you can withdraw.",
  },
] as const;

/** Short FAQ. Plain answers, no jargon. */
const faqs = [
  {
    q: "What is TypeRonin?",
    a: "A free typing game site. You play quick games, build real typing and English skill, and earn rewards you can withdraw.",
  },
  {
    q: "How do I earn rewards?",
    a: "Every accurate game earns Honor points. Honor moves you up the levels and turns into real cash rewards. The fewer mistakes you make, the more you earn.",
  },
  {
    q: "Do I need to pay anything?",
    a: "No. TypeRonin is completely free. There is no paid tier and no card required — it is funded by ads on the page.",
  },
  {
    q: "Can I play from any country?",
    a: "Yes. The whole platform is in English and open worldwide. Compete on the global leaderboard wherever you are.",
  },
  {
    q: "Why can I not use backspace?",
    a: "It teaches real accuracy. When you cannot fix a mistake, you learn to hit the right key the first time. Your speed then grows and stays.",
  },
] as const;

export default async function Home() {
  const user = await getUser();
  const playHref = user ? "/dojo" : "/register";
  const playLabel = user ? "Play now" : "Start playing free";

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------- Hero: the whole pitch, above the fold ---------------- */}
        <section className="paper-texture relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-10%,color-mix(in_oklab,var(--color-sakura)_22%,transparent),transparent_70%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
          />

          <Container className="py-16 text-center sm:py-24">
            <Badge variant="outline" className="mb-6 border-sakura/40 text-sakura">
              Play · Learn · Earn
            </Badge>

            <h1 className="mx-auto max-w-3xl text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl">
              Type faster. Learn English.{" "}
              <span className="text-gradient-gold">Earn real rewards.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              Free typing games that build your speed and your English — and pay you in rewards you
              can withdraw. Compete with players worldwide.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="dojo" size="xl">
                <Link href={playHref}>
                  {playLabel}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Free forever · No card required · Play in your browser
            </p>

            <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
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

        {/* ---------------- What is this: Play / Learn / Earn ---------------- */}
        <section id="what" className="scroll-mt-20 py-20">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-balance sm:text-4xl">
                One site, three things you get
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Play a quick game, get better every day, and earn as you go.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {pillars.map((pillar) => (
                <Card key={pillar.title} className="gold-edge bg-card backdrop-blur-sm">
                  <CardHeader>
                    <span className="mb-3 grid size-11 place-items-center rounded-xl border border-sakura/30 bg-sakura/10 text-sakura">
                      <pillar.icon className="size-5" aria-hidden="true" />
                    </span>
                    <p className="font-heading text-xs font-semibold tracking-[0.18em] text-sakura uppercase">
                      {pillar.tag}
                    </p>
                    <CardTitle className="mt-1 font-heading tracking-wide">{pillar.title}</CardTitle>
                    <CardDescription className="text-pretty">{pillar.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* ---------------- How it works: three steps ---------------- */}
        <section
          id="how-it-works"
          className="paper-texture scroll-mt-20 border-y border-border/60 py-20"
        >
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-heading text-xs font-semibold tracking-[0.18em] text-sakura uppercase">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
                From first game to first reward
              </h2>
            </div>

            <ol className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <li
                  key={step.n}
                  className="rounded-2xl border border-border/60 bg-card p-6 text-center"
                >
                  <span className="mx-auto grid size-10 place-items-center rounded-full border border-sakura/40 bg-sakura/10 font-heading text-base font-semibold text-sakura">
                    {step.n}
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold tracking-wide">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 text-center">
              <Button asChild variant="dojo" size="lg">
                <Link href={playHref}>
                  {playLabel}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Container>
        </section>

        {/* The spacing lives on the slot, not on this Container: AdSlot renders
            null when the placement is off or unbooked, and padding the wrapper
            would hold open a gap around an advert that is not there. A top
            margin only — the section below already opens with pt-20, so the
            80px underneath is already paid for. */}
        <Container>
          <AdSlot placement="between-sections" className="mt-20" />
        </Container>

        {/* ---------------- Why stay: levels + global play ---------------- */}
        <section id="ranks" className="scroll-mt-20 py-20">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-balance sm:text-4xl">
                Nine levels to climb
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                You reach every level by playing well. You cannot buy one. Your progress is yours to
                keep.
              </p>
            </div>

            <ol className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-2">
              {RANKS.map((rank, i) => (
                <li key={rank.slug} className="flex items-center gap-2">
                  {/* The number leads, the name follows: a visitor who has never
                      seen the names still reads the ladder at a glance. */}
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium",
                      i === RANKS.length - 1
                        ? "border-sakura/60 bg-sakura/10 text-sakura"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <span className="tabular font-semibold">Level {i + 1}</span>
                    <span className="ml-1.5 opacity-70">{rank.name}</span>
                  </span>
                  {i < RANKS.length - 1 ? (
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="size-3.5 text-muted-foreground/40"
                    />
                  ) : null}
                </li>
              ))}
            </ol>

            <div className="mx-auto mt-12 flex max-w-2xl items-start gap-4 rounded-2xl border border-border/60 bg-card p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-sakura/30 bg-sakura/10 text-sakura">
                <GlobeIcon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-heading text-lg font-semibold tracking-wide">Compete worldwide</h3>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">
                  Everything is in English and open to every country. Climb the global leaderboard
                  and see where you stand.
                </p>
                <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-sakura">
                  <Link href="/leaderboard">
                    View the leaderboard
                    <ArrowRightIcon aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </Container>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" className="paper-texture scroll-mt-20 border-t border-border/60 py-20">
          <Container width="narrow">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-balance sm:text-4xl">Common questions</h2>
            </div>

            {/* <details> = accessible disclosure with zero JavaScript. */}
            <div className="mt-10 divide-y divide-border/60 border-y border-border/60">
              {faqs.map((faq) => (
                <details key={faq.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <h3 className="font-heading text-base font-medium tracking-wide text-foreground">
                      {faq.q}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    >
                      <PlusMark />
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground">Your first reward is a few games away.</p>
              <Button asChild variant="dojo" size="xl" className="mt-5">
                <Link href={playHref}>
                  {playLabel}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Container>
        </section>

        <Container>
          <InkDivider />
        </Container>

        {/* Trophy row: a quiet reassurance strip, kept short.
            Padded on both sides: InkDivider carries no margin of its own, so a
            bottom-only padding left the icon sitting on the rule with 64px of
            empty space below it. */}
        <Container className="py-16">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center">
            <TrophyIcon aria-hidden="true" className="size-6 text-sakura" />
            <p className="text-sm text-muted-foreground">
              Free to play · Rewards you can withdraw · Players in every country
            </p>
          </div>
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}

/** A geometrically-centred plus (a text "+" sits off-centre on the font's axis). */
function PlusMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
