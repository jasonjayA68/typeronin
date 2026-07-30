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
      description="The last thirty days of play and sign-ups. Every number is counted from real records. What we cannot count is listed at the bottom."
    >
      <PanelGrid cols={4}>
        <Stat framed accent label="Games, 30 days" value={sessionTotal.toLocaleString()} />
        <Stat framed label="New users" value={signupTotal.toLocaleString()} />
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
          <Bars data={a.signups} label="New users" />
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
            <EmptyState title="No games yet">
              This counts how often each category is played.
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
            <EmptyState title="No games yet">
              Typing speeds appear here once people have played.
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
            <EmptyState title="No games yet" />
          )}
        </Panel>

        <Panel title="Where subscribers came from">
          {a.subscriberSources.length ? (
            <Distribution
              rows={a.subscriberSources.map((s) => ({ label: s.source, count: s.count }))}
            />
          ) : (
            <EmptyState title="No subscribers yet">
              The sign-up form records where each person came from.
            </EmptyState>
          )}
        </Panel>
      </PanelGrid>

      <Panel title="What we do not measure" className="border-dashed bg-transparent">
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p className="text-pretty">
            We do not count page views. So daily visitors, where traffic comes from, blog traffic and
            ad results are missing. The numbers above count games played, not visitors.
          </p>
          <p className="text-pretty">
            We do count how often each ad is shown and clicked. Those are our own counts, not the ad
            network&apos;s. Use the network&apos;s report for money.
          </p>
        </div>
      </Panel>
    </AdminPage>
  );
}
