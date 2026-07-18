import {
  CheckIcon,
  FlameIcon,
  LockIcon,
  MountainIcon,
  SunriseIcon,
  SwordsIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

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
  title: "Missions",
  description:
    "Standing orders for the student. Each one asks for a discipline you do not yet have, and pays in Honor when you find it.",
};

type Mission = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Percent complete. Sealed missions sit at zero until their rank is reached. */
  progress: number;
  progressLabel: string;
  honor: number;
  state: "active" | "complete" | "locked";
};

const MISSIONS: readonly Mission[] = [
  {
    title: "The Unbroken Line",
    description: "Finish a kata with not one stroke astray. Backspace will not save you.",
    icon: SwordsIcon,
    progress: 100,
    progressLabel: "Cut clean on Still Water",
    honor: 250,
    state: "complete",
  },
  {
    title: "Dawn Practice",
    description: "Train five days running. The grey mornings are the ones that count.",
    icon: SunriseIcon,
    progress: 60,
    progressLabel: "3 of 5 days",
    honor: 400,
    state: "active",
  },
  {
    title: "Still Water",
    description: "Hold Ma above 80 for a full scroll. Your rhythm will drift; notice it.",
    icon: WavesIcon,
    progress: 45,
    progressLabel: "Best hold: 62 of 100 lines",
    honor: 350,
    state: "active",
  },
  {
    title: "One Hundred Draws",
    description: "Complete one hundred iai draws. Each one finished in a single breath.",
    icon: FlameIcon,
    progress: 72,
    progressLabel: "72 of 100 draws",
    honor: 300,
    state: "active",
  },
  {
    title: "The Long Road",
    description: "Carry both scrolls end to end above 95% accuracy, without abandoning either.",
    icon: MountainIcon,
    progress: 0,
    progressLabel: "Unsealed at Ronin",
    honor: 600,
    state: "locked",
  },
  {
    title: "No Second Chance",
    description: "Three iai draws in a row, drawn and finished without a single stroke astray.",
    icon: SwordsIcon,
    progress: 0,
    progressLabel: "Unsealed at Hatamoto",
    honor: 500,
    state: "locked",
  },
];

function MissionBadge({ state }: { state: Mission["state"] }) {
  if (state === "complete") {
    return (
      <Badge variant="outline" className="border-sakura/40 text-sakura">
        <CheckIcon aria-hidden="true" />
        Complete
      </Badge>
    );
  }

  if (state === "locked") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <LockIcon aria-hidden="true" />
        Sealed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      Active
    </Badge>
  );
}

export default function MissionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Discipline · Precision · Mastery"
          kanji="任務"
          title="Missions"
          lede="Standing orders. Each asks for a discipline you do not yet hold, and pays in Honor on the day you find it."
        />
        <Container className="py-12 sm:py-16">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold">Standing Orders</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sealed orders open with rank. Do not hurry them.
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MISSIONS.map((mission) => {
              const complete = mission.state === "complete";
              const locked = mission.state === "locked";

              return (
                <Card
                  key={mission.title}
                  className={cn(
                    "bg-card/60 backdrop-blur-sm",
                    complete && "gold-edge",
                    locked && "opacity-60"
                  )}
                >
                  <CardHeader>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "grid size-10 place-items-center rounded-lg border",
                          complete
                            ? "border-sakura/30 bg-sakura/10 text-sakura"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        <mission.icon className="size-5" aria-hidden="true" />
                      </span>
                      <MissionBadge state={mission.state} />
                    </div>
                    <CardTitle className="tracking-wide">
                      <h3>{mission.title}</h3>
                    </CardTitle>
                    <CardDescription className="text-pretty">{mission.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress
                      value={mission.progress}
                      aria-label={`${mission.title} progress`}
                      className={cn(
                        complete && "[&_[data-slot=progress-indicator]]:bg-sakura"
                      )}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">{mission.progressLabel}</span>
                      <span
                        className={cn(
                          "tabular shrink-0 font-medium",
                          complete ? "text-sakura" : "text-muted-foreground"
                        )}
                      >
                        +{mission.honor} Honor
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Progress is measured on cuts that stood. One cut. No corrections.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
