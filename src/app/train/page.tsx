import {
  CheckIcon,
  CircleDashedIcon,
  FlameIcon,
  MountainIcon,
  SunriseIcon,
  SwordsIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

import { getProgressView } from "@/features/gamification/progress";
import { getUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";

export const metadata: Metadata = {
  title: "Train",
  description:
    "How you level up on TypeRonin. Complete missions and earn achievements to gain Honor points, move up the nine levels, and unlock real rewards.",
};

/** Mission icons, mapped from the catalog's icon key. */
const MISSION_ICONS: Record<string, LucideIcon> = {
  swords: SwordsIcon,
  sunrise: SunriseIcon,
  waves: WavesIcon,
  flame: FlameIcon,
  mountain: MountainIcon,
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(date);

/** The three-step explainer that makes progression legible at a glance. */
const STEPS = [
  {
    n: "1",
    title: "Play",
    body: "Type phrases, or match words to their meaning. Every finished game is scored on speed and accuracy.",
  },
  {
    n: "2",
    title: "Earn Honor",
    body: "Accurate play earns Honor. Missions and achievements pay extra Honor on top.",
  },
  {
    n: "3",
    title: "Level up and cash out",
    body: "Honor moves you up through nine levels. You can turn it into real rewards and withdraw them.",
  },
] as const;

export default async function TrainPage() {
  const user = await getUser();
  const { missions, trials } = await getProgressView(user?.id ?? null);

  const earnedTrials = trials.filter((t) => t.earned).length;
  const doneMissions = missions.filter((m) => m.complete).length;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Play · Learn · Earn"
          title="Train"
          lede="Complete missions and earn achievements to gain Honor — the points you earn by playing. Honor moves you up the levels and unlocks real rewards."
        />

        <Container className="py-12 sm:py-16">
          {/* How progression works — answered in three plain steps. */}
          <section aria-labelledby="how" className="mx-auto max-w-4xl">
            <h2 id="how" className="text-center text-xl font-semibold sm:text-2xl">
              How you make progress
            </h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="rounded-2xl border border-border/60 bg-card p-5 text-center"
                >
                  <span className="mx-auto grid size-9 place-items-center rounded-full border border-sakura/40 bg-sakura/10 font-heading text-sm font-semibold text-sakura">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-heading text-base font-semibold tracking-wide">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Missions */}
          <section aria-labelledby="missions" className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <h2 id="missions" className="text-xl font-semibold sm:text-2xl">
                  Missions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ongoing goals across both games. When you reach one, its extra Honor is paid after
                  your next finished game.
                </p>
              </div>
              {user ? (
                <span className="tabular text-sm text-muted-foreground">
                  {doneMissions} of {missions.length} complete
                </span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {missions.map((mission) => {
                const Icon = MISSION_ICONS[mission.icon] ?? SwordsIcon;
                const percent = Math.round(mission.progress.ratio * 100);
                return (
                  <Card
                    key={mission.key}
                    className={cn("bg-card backdrop-blur-sm", mission.complete && "gold-edge")}
                  >
                    <CardHeader>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            "grid size-10 place-items-center rounded-lg border",
                            mission.complete
                              ? "border-sakura/30 bg-sakura/10 text-sakura"
                              : "border-border bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            mission.complete ? "border-sakura/40 text-sakura" : "text-muted-foreground"
                          )}
                        >
                          {mission.complete ? (
                            <>
                              <CheckIcon aria-hidden="true" />
                              Complete
                            </>
                          ) : (
                            "In progress"
                          )}
                        </Badge>
                      </div>
                      <CardTitle className="tracking-wide">
                        <h3>{mission.title}</h3>
                      </CardTitle>
                      <CardDescription className="text-pretty">
                        {mission.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Progress
                        value={mission.complete ? 100 : percent}
                        aria-label={`${mission.title} progress`}
                        className={cn(
                          mission.complete && "[&_[data-slot=progress-indicator]]:bg-sakura"
                        )}
                      />
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {user ? mission.progress.label : "Sign in to begin"}
                        </span>
                        <span
                          className={cn(
                            "tabular shrink-0 font-medium",
                            mission.complete ? "text-sakura" : "text-muted-foreground"
                          )}
                        >
                          +{mission.honor.toLocaleString("en-US")} Honor
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Achievements. "Trial" is still the internal name in the code and the
              database; players only ever read "achievement". */}
          <section aria-labelledby="achievements" className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <h2 id="achievements" className="text-xl font-semibold sm:text-2xl">
                  Achievements
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  One-time goals for good habits: regular practice, high accuracy, and playing day
                  after day. Each one pays a larger Honor reward, one time only.
                </p>
              </div>
              {user ? (
                <span className="tabular text-sm text-muted-foreground">
                  {earnedTrials} of {trials.length} earned
                </span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {trials.map((trial) => (
                <Card
                  key={trial.slug}
                  className={cn(
                    "bg-card backdrop-blur-sm",
                    trial.earned ? "gold-edge" : "bg-card/30"
                  )}
                >
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "grid size-10 place-items-center rounded-lg border",
                          trial.earned
                            ? "border-sakura/30 bg-sakura/10 text-sakura"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {trial.earned ? (
                          <CheckIcon className="size-5" aria-hidden="true" />
                        ) : (
                          <CircleDashedIcon className="size-5" aria-hidden="true" />
                        )}
                      </span>
                      {trial.earned && trial.unlockedAt ? (
                        <span className="tabular text-xs text-muted-foreground">
                          {formatDate(trial.unlockedAt)}
                        </span>
                      ) : null}
                    </div>
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
                      <span className={cn(trial.earned ? "text-sakura" : "text-muted-foreground")}>
                        {trial.earned ? "Earned" : user ? trial.progress.label : "Not yet earned"}
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
          </section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
