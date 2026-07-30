import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/features/admin/guard";
import { getAdminOverview } from "@/features/admin/queries";
import {
  AdminPage,
  EmptyState,
  Panel,
  PanelGrid,
  PanelLink,
  Stat,
} from "@/features/admin/ui";
import { when } from "@/features/profile/dashboard-panels";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

export default async function OverviewPage() {
  await requirePermission("analytics:read");
  const o = await getAdminOverview();

  return (
    <AdminPage
      title="Overview"
      description="A quick look at how the site is doing. Every number is counted live, not estimated. Honor is the points players earn."
    >
      {/* Top-level figures are the only stats that carry a surface. */}
      <PanelGrid cols={4}>
        <Stat
          framed
          accent
          label="Users"
          value={o.students.toLocaleString()}
          hint={`${o.newStudents} joined in 30 days`}
        />
        <Stat
          framed
          label="Games played"
          value={o.sessions.toLocaleString()}
          hint={`${o.sessions7} in the last 7 days`}
        />
        <Stat framed label="Average WPM" value={String(o.avgWpm)} hint={`${o.avgAccuracy}% accuracy`} />
        <Stat framed label="Average rhythm" value={String(o.avgMa)} hint="How even the typing is" />
      </PanelGrid>

      <PanelGrid cols={2}>
        <Panel title="Top users" action={<PanelLink href="/admin/users">All users</PanelLink>}>
          {o.topPlayers.length ? (
            <ol className="space-y-3">
              {o.topPlayers.map((p, i) => (
                <li key={p.handle} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="tabular w-4 shrink-0 text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <Link
                      href={`/profile/${p.handle}`}
                      className="truncate underline-offset-4 hover:underline"
                    >
                      {p.displayName}
                    </Link>
                  </span>
                  <span className="tabular shrink-0 text-sakura">
                    {p.honor.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No users yet">
              Users appear here once people sign up and play.
            </EmptyState>
          )}
        </Panel>

        <Panel title="Popular categories" action={<PanelLink href="/admin/words">Words</PanelLink>}>
          {o.popularCategories.length ? (
            <ul className="space-y-3">
              {o.popularCategories.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="tabular shrink-0 text-muted-foreground">{c.plays}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing played yet">
              This counts how often each category is played.
            </EmptyState>
          )}
        </Panel>
      </PanelGrid>

      <PanelGrid cols={3}>
        <Panel
          title="Ads"
          action={<PanelLink href="/admin/advertisements">Manage</PanelLink>}
        >
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Ad positions on" value={String(o.activePlacements)} />
            <Stat label="Booked" value={String(o.liveAds)} />
          </div>
          {o.activePlacements === 0 ? (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Ads are off everywhere. No outside code is loaded.
            </p>
          ) : null}
        </Panel>

        <Panel title="Content" action={<PanelLink href="/admin/posts">Posts</PanelLink>}>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Live" value={String(o.posts.published)} />
            <Stat label="Draft" value={String(o.posts.draft)} />
            <Stat label="Queued" value={String(o.posts.scheduled)} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {o.pendingComments} waiting for review · {o.subscribers} subscribers
          </p>
        </Panel>

        <Panel title="Recent actions" action={<PanelLink href="/admin/audit">Activity log</PanelLink>}>
          {o.recentAudit.length ? (
            <ul className="space-y-3">
              {o.recentAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-foreground">{a.action}</span>
                  </span>
                  <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                    {when(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing yet">Admin actions appear here.</EmptyState>
          )}
        </Panel>
      </PanelGrid>
    </AdminPage>
  );
}
