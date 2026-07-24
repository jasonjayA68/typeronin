import {
  CheckIcon,
  FlameIcon,
  MountainIcon,
  SunriseIcon,
  SwordsIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

import { getProgressView, type MissionView } from "@/features/gamification/progress";
import { cn } from "@/lib/utils";
import { getUser } from "@/lib/supabase/server";
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

const ICONS: Record<string, LucideIcon> = {
  swords: SwordsIcon,
  sunrise: SunriseIcon,
  waves: WavesIcon,
  flame: FlameIcon,
  mountain: MountainIcon,
};

function MissionBadge({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <Badge variant="outline" className="border-sakura/40 text-sakura">
        <CheckIcon aria-hidden="true" />
        Complete
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Active
    </Badge>
  );
}

export default async function MissionsPage() {
  const user = await getUser();
  const { missions } = await getProgressView(user?.id ?? null);

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
              {user
                ? "Progress is drawn from your kata and scroll runs. Finish an order and its Honor is paid on your next run."
                : "Sign in and train the kata and the scroll — every run moves these orders forward."}
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission: MissionView) => {
              const Icon = ICONS[mission.icon] ?? SwordsIcon;
              const percent = Math.round(mission.progress.ratio * 100);

              return (
                <Card
                  key={mission.key}
                  className={cn("bg-card/60 backdrop-blur-sm", mission.complete && "gold-edge")}
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
                      <MissionBadge complete={mission.complete} />
                    </div>
                    <CardTitle className="tracking-wide">
                      <h3>{mission.title}</h3>
                    </CardTitle>
                    <CardDescription className="text-pretty">{mission.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress
                      value={mission.complete ? 100 : percent}
                      aria-label={`${mission.title} progress`}
                      className={cn(mission.complete && "[&_[data-slot=progress-indicator]]:bg-sakura")}
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
