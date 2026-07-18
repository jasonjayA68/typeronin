import type { Metadata } from "next";

import { getAnalytics, type DayPoint } from "@/features/admin/analytics";
import { requirePermission } from "@/features/admin/guard";
import { AdminPage, EmptyState, Panel, PanelGrid, Stat } from "@/features/admin/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

/**
 * A bar chart in CSS.
 *
 * No chart library: this is one series of small integers, and a charting
 * dependency would cost more kilobytes than the whole page. Scaled to the
 * series maximum, with a floor so a day with one session is still visible
 * rather than a hairline that reads as zero.
 */
function Bars({ data, label }: { data: DayPoint[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((n, d) => n + d.count, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
        <p className="tabular text-sm text-foreground">{total.toLocaleString()}</p>
      </div>

      <div
        role="img"
        aria-label={`${label}: ${total} over ${data.length} days`}
        className="mt-4 flex h-24 items-end gap-px"
      >
        {data.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.count}`}
            style={{ height: `${Math.max(d.count === 0 ? 2 : 8, (d.count / max) * 100)}%` }}
            className={cn(
              "min-w-0 flex-1 rounded-t-[2px] transition-colors",
              d.count > 0 ? "bg-sakura/70 hover:bg-sakura" : "bg-border"
            )}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[0.65rem] text-muted-foreground">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

function Distribution({
  rows,
}: {
  rows: { label: string; count: number; hint?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="tabular shrink-0 text-muted-foreground">
              {row.hint ? <span className="mr-3 text-xs">{row.hint}</span> : null}
              {row.count.toLocaleString()}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-sakura/70"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage() {
  await requirePermission("analytics:read");
  const a = await getAnalytics(30);

  const sessionTotal = a.sessions.reduce((n, d) => n + d.count, 0);
  const signupTotal = a.signups.reduce((n, d) => n + d.count, 0);
  const referralTotal = Object.values(a.referrals).reduce((n: number, v) => n + (v as number), 0);

  return (
    <AdminPage
      title="Analytics"
      description="Thirty days, computed from the tables that own the data. What cannot be computed honestly is named at the bottom rather than estimated."
    >
      <PanelGrid cols={4}>
        <Stat framed accent label="Games, 30 days" value={sessionTotal.toLocaleString()} />
        <Stat framed label="New students" value={signupTotal.toLocaleString()} />
        <Stat framed label="Referrals" value={String(referralTotal)} hint="All time" />
        <Stat
          framed
          label="Busiest day"
          value={String(Math.max(0, ...a.sessions.map((d) => d.count)))}
          hint="Games in a single day"
        />
      </PanelGrid>

      <PanelGrid cols={2}>
        <Panel title="Activity">
          <Bars data={a.sessions} label="Games played" />
        </Panel>
        <Panel title="Growth">
          <Bars data={a.signups} label="New students" />
        </Panel>
      </PanelGrid>

      <PanelGrid cols={2}>
        <Panel title="Popular categories">
          {a.categories.length ? (
            <Distribution
              rows={a.categories.map((c) => ({
                label: c.name,
                count: c.count,
                hint: `${c.avgWpm} wpm`,
              }))}
            />
          ) : (
            <EmptyState title="No sessions yet">
              Category popularity is counted from games played.
            </EmptyState>
          )}
        </Panel>

        <Panel title="Speed distribution">
          {a.speedBands.length ? (
            <Distribution
              rows={a.speedBands.map((b) => ({
                label: `${b.band}–${b.band + 19} wpm`,
                count: b.count,
              }))}
            />
          ) : (
            <EmptyState title="No sessions yet">
              The shape of who plays appears once there are games to measure.
            </EmptyState>
          )}
        </Panel>
      </PanelGrid>

      <PanelGrid cols={2}>
        <Panel title="Game modes">
          {a.modes.length ? (
            <Distribution
              rows={a.modes.map((m) => ({ label: m.mode.toLowerCase(), count: m.count }))}
            />
          ) : (
            <EmptyState title="No sessions yet" />
          )}
        </Panel>

        <Panel title="Newsletter sources">
          {a.subscriberSources.length ? (
            <Distribution
              rows={a.subscriberSources.map((s) => ({ label: s.source, count: s.count }))}
            />
          ) : (
            <EmptyState title="No subscribers yet">
              Sources are recorded on the signup form.
            </EmptyState>
          )}
        </Panel>
      </PanelGrid>

      <Panel title="Not measured" className="border-dashed bg-transparent">
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p className="text-pretty">
            Daily <em>users</em>, traffic sources, blog traffic and advert performance need a
            page-view pipeline, and there is not one. Sessions are games played, not visitors —
            showing one labelled as the other is how a dashboard starts lying, so those figures are
            absent.
          </p>
          <p className="text-pretty">
            Advert impressions and clicks are counted on the Advertisement rows, but internal
            counters measure what we rendered, not what a network billed. They will never be the
            source of truth for revenue, and they are not shown here as though they were.
          </p>
        </div>
      </Panel>
    </AdminPage>
  );
}
