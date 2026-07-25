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
      description="How much a player may earn in a day, how quickly, and at what rate. Left at their defaults these do nothing — a cap of zero is no cap — so the games play exactly as before until you set a real value."
    >
      <Panel title="Games, cooldown & multiplier">
        <PlayLimitsEditor initial={limits} />
      </Panel>

      <Panel title="How this works" className="border-dashed bg-transparent">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          Stored as one <code className="text-xs">Setting</code> row under{" "}
          <code className="text-xs">play</code>, validated before it is written. The limit is
          enforced where runs are recorded, not in the browser, so it holds against a scripted
          client — a game past the cap is simply not saved and earns nothing. The day resets at
          midnight UTC.
        </p>
      </Panel>
    </AdminPage>
  );
}
