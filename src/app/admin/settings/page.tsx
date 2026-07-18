import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { AdminPage, EmptyState, Panel } from "@/features/admin/ui";
import { prisma } from "@/lib/prisma";
import { when } from "@/features/profile/dashboard-panels";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  await requirePermission("settings:write");

  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });

  return (
    <AdminPage
      title="Settings"
      description="Reward values, game knobs and feature flags. Stored one row per key with a JSON value, so a new setting needs no migration."
    >
      {settings.length ? (
        <div className="space-y-3">
          {settings.map((setting) => (
            <section
              key={setting.key}
              className="min-w-0 rounded-xl border border-border bg-card/60 p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <code className="text-sm font-medium text-foreground">{setting.key}</code>
                <span className="text-xs text-muted-foreground">
                  updated {when(setting.updatedAt)}
                </span>
              </div>
              {setting.description ? (
                <p className="mt-1 text-xs text-muted-foreground">{setting.description}</p>
              ) : null}
              <pre className="mt-4 overflow-x-auto rounded-lg border border-border/60 bg-background/60 p-4 text-xs">
                <code>{JSON.stringify(setting.value, null, 2)}</code>
              </pre>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No settings yet">Run the seed to populate them.</EmptyState>
      )}

      <Panel title="Read-only for now" className="border-dashed bg-transparent">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          These are shown, not editable. Editing arbitrary JSON safely needs per-key schemas and
          validation — a free-text box that can write a malformed reward table into production is
          not a feature. Change them with SQL until the typed editors exist.
        </p>
      </Panel>
    </AdminPage>
  );
}
