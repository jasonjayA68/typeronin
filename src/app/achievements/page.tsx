import { CheckIcon, CircleDashedIcon } from "lucide-react";
import type { Metadata } from "next";

import { cn } from "@/lib/utils";
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

export const metadata: Metadata = {
  title: "Bushido Trials",
  description:
    "The seven virtues, each set as a trial of typing discipline. Earned slowly, and never by speed alone.",
};

type Trial = {
  virtue: string;
  romaji: string;
  kanji: string;
  description: string;
  honor: number;
  /** Display date, already formatted. Null until the trial is passed. */
  earned: string | null;
};

const TRIALS: readonly Trial[] = [
  {
    virtue: "Rectitude",
    romaji: "Gi",
    kanji: "義",
    description: "Type what is written. No paraphrase, no shortcut, no silent correction.",
    honor: 800,
    earned: "4 March 2026",
  },
  {
    virtue: "Courage",
    romaji: "Yū",
    kanji: "勇",
    description: "Take a scroll two ranks above your standing, and finish what you began.",
    honor: 1_200,
    earned: "19 April 2026",
  },
  {
    virtue: "Benevolence",
    romaji: "Jin",
    kanji: "仁",
    description: "Forgive your own slow morning. Return the next day and train it again.",
    honor: 600,
    earned: null,
  },
  {
    virtue: "Respect",
    romaji: "Rei",
    kanji: "礼",
    description: "Begin and end at rest. The dojo is not entered at a run.",
    honor: 500,
    earned: "27 May 2026",
  },
  {
    virtue: "Honesty",
    romaji: "Makoto",
    kanji: "誠",
    description: "Keep every session on the record, including the ones you would rather delete.",
    honor: 1_000,
    earned: null,
  },
  {
    virtue: "Honour",
    romaji: "Meiyo",
    kanji: "名誉",
    description: "Reach Hatamoto without abandoning a single kata along the way.",
    honor: 2_000,
    earned: null,
  },
  {
    virtue: "Loyalty",
    romaji: "Chūgi",
    kanji: "忠義",
    description: "Train thirty days without breaking the line. The blade is kept, not collected.",
    honor: 1_500,
    earned: null,
  },
];

const EARNED = TRIALS.filter((trial) => trial.earned !== null);
const NEXT_TRIAL = TRIALS.find((trial) => trial.earned === null);

export default function AchievementsPage() {
  const honorFromTrials = EARNED.reduce((sum, trial) => sum + trial.honor, 0);

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
                {EARNED.length} of {TRIALS.length}
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
                {NEXT_TRIAL ? (
                  <>
                    {NEXT_TRIAL.virtue}{" "}
                    <span aria-hidden="true" className="text-foreground/40">
                      {NEXT_TRIAL.kanji}
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
              A trial is not a score. It is a habit the dojo has watched you keep.
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TRIALS.map((trial) => {
              const earned = trial.earned !== null;

              return (
                <Card
                  key={trial.virtue}
                  className={cn(
                    "bg-card/60 backdrop-blur-sm",
                    earned ? "gold-edge" : "bg-card/30"
                  )}
                >
                  <CardHeader>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mb-3 font-heading text-5xl leading-none select-none",
                        earned ? "text-gradient-gold" : "text-foreground/25"
                      )}
                    >
                      {trial.kanji}
                    </span>
                    <CardTitle className="tracking-wide">
                      <h3 className={cn(!earned && "text-muted-foreground")}>
                        {trial.virtue}{" "}
                        <span className="ml-1 text-xs font-normal tracking-[0.18em] text-muted-foreground uppercase">
                          {trial.romaji}
                        </span>
                      </h3>
                    </CardTitle>
                    <CardDescription className="text-pretty">{trial.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          earned ? "text-sakura" : "text-muted-foreground"
                        )}
                      >
                        {earned ? (
                          <>
                            <CheckIcon className="size-3.5" aria-hidden="true" />
                            Earned <span className="tabular">{trial.earned}</span>
                          </>
                        ) : (
                          <>
                            <CircleDashedIcon className="size-3.5" aria-hidden="true" />
                            Not yet earned
                          </>
                        )}
                      </span>
                      <span
                        className={cn(
                          "tabular shrink-0 font-medium",
                          earned ? "text-sakura" : "text-muted-foreground"
                        )}
                      >
                        +{trial.honor.toLocaleString("en-US")} Honor
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
