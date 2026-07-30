import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { AdminPage, Panel } from "@/features/admin/ui";
import { PlayLimitsEditor } from "@/features/play/limits-editor";
import { getPlayLimits } from "@/features/play/service";

export const metadata: Metadata = {
  title: "Daily limits",
  robots: { index: false, follow: false },
};

export default async function PlayLimitsPage() {
  await requirePermission("settings:write");

  const limits = await getPlayLimits();

  return (
    <AdminPage
      title="Daily limits"
      description="Set how many games a player can earn from each day, how long they must wait between games, and how much Honor a game pays. Honor is the points players earn. A limit of 0 means no limit."
    >
      <Panel title="Games, waiting time and payout">
        <PlayLimitsEditor initial={limits} />
      </Panel>

      <Panel title="Good to know" className="border-dashed bg-transparent">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          These limits are applied on our servers, not in the player&apos;s browser, so they cannot be
          worked around. A game played past the daily limit is not saved and earns nothing. The day
          starts again at midnight UTC.
        </p>
      </Panel>
    </AdminPage>
  );
}
