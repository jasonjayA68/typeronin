import { CheckIcon, CircleDashedIcon } from "lucide-react";
import type { Metadata } from "next";

import { getProgressView } from "@/features/gamification/progress";
import { cn } from "@/lib/utils";
import { getUser } from "@/lib/supabase/server";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";

export const metadata: Metadata = {
  title: "Bushido Trials",
  description:
    "The seven virtues, each set as a trial of typing discipline. Earned slowly, and never by speed alone.",
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);

export default async function AchievementsPage() {
  const user = await getUser();
  const { trials } = await getProgressView(user?.id ?? null);

  const earned = trials.filter((t) => t.earned);
  const nextTrial = trials.find((t) => !t.earned) ?? null;
  const honorFromTrials = earned.reduce((sum, t) => sum + t.honor, 0);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Discipline · Precision · Mastery"
          kanji="武士道"
          title="Bushido Trials"
          lede="Seven virtues, each set as a trial of the hands. They are earned slowly, and never by speed alone."
        />
        <Container className="py-12 sm:py-16">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass-panel rounded-xl px-4 py-5">
              <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                Trials earned
              </dt>
              <dd className="tabular mt-2 text-2xl font-semibold text-sakura">
                {earned.length} of {trials.length}
              </dd>
            </div>
            <div className="glass-panel rounded-xl px-4 py-5">
              <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                Honor from trials
              </dt>
              <dd className="tabular mt-2 text-2xl font-semibold text-foreground">
                {honorFromTrials.toLocaleString("en-US")}
              </dd>
            </div>
            <div className="glass-panel rounded-xl px-4 py-5">
              <dt className="text-xs tracking-wide text-muted-foreground uppercase">Next trial</dt>
              <dd className="mt-2 text-2xl font-semibold text-foreground">
                {nextTrial ? (
                  <>
                    {nextTrial.name}{" "}
                    <span aria-hidden="true" className="text-foreground/40">
                      {nextTrial.kanji}
                    </span>
                  </>
                ) : (
                  "All held"
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-14 max-w-2xl">
            <h2 className="text-xl font-semibold">The Seven Virtues</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {user
                ? "A trial is not a score. It is a habit the dojo has watched you keep — earned by training the two disciplines, kata and scroll."
                : "A trial is not a score. Sign in and train the kata and the scroll, and the dojo will begin to keep count."}
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trials.map((trial) => (
              <Card
                key={trial.slug}
                className={cn(
                  "bg-card/60 backdrop-blur-sm",
                  trial.earned ? "gold-edge" : "bg-card/30"
                )}
              >
                <CardHeader>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mb-3 font-heading text-5xl leading-none select-none",
                      trial.earned ? "text-gradient-gold" : "text-foreground/25"
                    )}
                  >
                    {trial.kanji}
                  </span>
                  <CardTitle className="tracking-wide">
                    <h3 className={cn(!trial.earned && "text-muted-foreground")}>{trial.name}</h3>
                  </CardTitle>
                  <CardDescription className="text-pretty">{trial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!trial.earned && user ? (
                    <Progress
                      value={Math.round(trial.progress.ratio * 100)}
                      aria-label={`${trial.name} progress`}
                      className="mb-3"
                    />
                  ) : null}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        trial.earned ? "text-sakura" : "text-muted-foreground"
                      )}
                    >
                      {trial.earned ? (
                        <>
                          <CheckIcon className="size-3.5" aria-hidden="true" />
                          Earned{" "}
                          {trial.unlockedAt ? (
                            <span className="tabular">{formatDate(trial.unlockedAt)}</span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <CircleDashedIcon className="size-3.5" aria-hidden="true" />
                          {user ? trial.progress.label : "Not yet earned"}
                        </>
                      )}
                    </span>
                    <span
                      className={cn(
                        "tabular shrink-0 font-medium",
                        trial.earned ? "text-sakura" : "text-muted-foreground"
                      )}
                    >
                      +{trial.honor.toLocaleString("en-US")} Honor
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
