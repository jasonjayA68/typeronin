import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requirePermission } from "@/features/admin/guard";
import { closeSeason, createSeason, deleteSeason } from "@/features/admin/play-actions";
import {
  AdminPage,
  DataTable,
  EmptyState,
  Panel,
  PanelGrid,
  PanelLink,
  Stat,
  StatusDot,
  Td,
  Th,
  Tr,
} from "@/features/admin/ui";
import { prisma } from "@/lib/prisma";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export const metadata: Metadata = {
  title: "Leaderboards",
  robots: { index: false, follow: false },
};

/** Matches Input, so a native select sits at the same height and radius. */
const CONTROL =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const SCOPES = [
  ["GLOBAL", "Everyone — all time"],
  ["WEEKLY", "Weekly"],
  ["MONTHLY", "Monthly"],
  ["COUNTRY", "By country"],
] as const;

// Server-rendered only, and fixed to UTC: a season boundary that reads
// differently to two admins in two timezones is a support ticket.
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function day(date: Date): string {
  return DAY.format(date);
}

async function getSeasons() {
  return prisma.leaderboardSeason.findMany({
    orderBy: [{ startsAt: "desc" }, { scope: "asc" }],
    select: {
      id: true,
      scope: true,
      label: true,
      startsAt: true,
      endsAt: true,
      closedAt: true,
      _count: { select: { entries: true } },
    },
  });
}

/* ------------------------------------------------------- form → action */

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function back(notice: { error?: string; ok?: string }): string {
  const query = new URLSearchParams();
  if (notice.error) query.set("error", notice.error);
  if (notice.ok) query.set("ok", notice.ok);
  return `/admin/leaderboards${query.size ? `?${query}` : ""}`;
}

/**
 * The form's entry point. Every rule — the ordering of the dates, the one season
 * per scope and start — is enforced by the action, not here.
 */
async function openSeason(formData: FormData) {
  "use server";

  const result = await createSeason({
    scope: text(formData.get("scope")),
    label: text(formData.get("label")),
    startsAt: text(formData.get("startsAt")),
    endsAt: text(formData.get("endsAt")),
  });

  redirect(result.ok ? back({ ok: "Season opened." }) : back({ error: result.message }));
}

async function freezeSeason(formData: FormData) {
  "use server";

  const result = await closeSeason(text(formData.get("id")));
  redirect(result.ok ? back({ ok: "Season closed." }) : back({ error: result.message }));
}

async function removeSeason(formData: FormData) {
  "use server";

  if (formData.get("confirm") !== "on") {
    redirect(back({ error: "Tick the box to confirm before deleting a season." }));
  }

  const result = await deleteSeason(text(formData.get("id")));
  redirect(result.ok ? back({ ok: "Season deleted." }) : back({ error: result.message }));
}

/* ------------------------------------------------------------------- ui */

function Field({
  name,
  label,
  hint,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={name} className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </Label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function LeaderboardsPage(props: PageProps<"/admin/leaderboards">) {
  await requirePermission("settings:write");

  // A page's searchParams is a promise in this version.
  const [seasons, params] = await Promise.all([getSeasons(), props.searchParams]);

  const error = typeof params.error === "string" ? params.error : undefined;
  const ok = typeof params.ok === "string" ? params.ok : undefined;

  const open = seasons.filter((s) => !s.closedAt).length;
  const cached = seasons.reduce((total, s) => total + s._count.entries, 0);

  return (
    <AdminPage
      title="Leaderboards"
      description="A season is a named period of time, such as July 2026. Only games played inside that period count towards its ranking. When you close a season, its ranking stops changing."
    >
      {error ? (
        <p
          role="status"
          className="rounded-lg border border-sakura/30 bg-sakura/10 px-4 py-3 text-sm text-sakura"
        >
          {error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
          {ok}
        </p>
      ) : null}

      {seasons.length ? (
        <PanelGrid cols={3}>
          <Stat framed label="Seasons" value={String(seasons.length)} />
          <Stat framed accent label="Open" value={String(open)} hint="Still counting games." />
          <Stat
            framed
            label="Saved rankings"
            value={cached.toLocaleString("en-US")}
            hint="This will read zero until the ranking job is built."
          />
        </PanelGrid>
      ) : null}

      <Panel title="Seasons">
        {seasons.length ? (
          <DataTable>
            <caption className="sr-only">
              Every leaderboard season, with its type, dates, saved rankings and whether it is
              closed.
            </caption>
            <thead>
              <tr>
                <Th>Season</Th>
                <Th>Type</Th>
                <Th>Starts</Th>
                <Th>Ends</Th>
                <Th numeric>Rankings</Th>
                <Th>State</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <Tr key={season.id}>
                  <Td className="font-medium">{season.label}</Td>
                  <Td className="whitespace-nowrap capitalize">{season.scope.toLowerCase()}</Td>
                  <Td className="tabular whitespace-nowrap">{day(season.startsAt)}</Td>
                  <Td className="tabular whitespace-nowrap">{day(season.endsAt)}</Td>
                  <Td numeric>{season._count.entries.toLocaleString("en-US")}</Td>
                  <Td>
                    <StatusDot tone={season.closedAt ? "off" : "on"}>
                      {season.closedAt ? `Closed ${day(season.closedAt)}` : "Open"}
                    </StatusDot>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      {season.closedAt ? null : (
                        <form action={freezeSeason}>
                          <input type="hidden" name="id" value={season.id} />
                          <Button type="submit" size="xs" variant="outline">
                            Close
                          </Button>
                        </form>
                      )}
                      <form action={removeSeason} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={season.id} />
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <input type="checkbox" name="confirm" className="size-3.5 accent-sakura" />
                          <span className="sr-only">Confirm deleting {season.label}</span>
                          I am sure
                        </label>
                        <Button type="submit" size="xs" variant="destructive">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            title="No seasons yet"
            action={<PanelLink href="#open-season">Open the first one below</PanelLink>}
          >
            No season has been opened yet. Nothing has failed. Open one below to start counting.
          </EmptyState>
        )}
      </Panel>

      <Panel title="Open a season">
        <form action={openSeason} className="grid scroll-mt-8 gap-4 sm:grid-cols-2" id="open-season">
          <Field name="label" label="Name" hint="What players will see, for example July 2026.">
            <Input id="label" name="label" required maxLength={60} placeholder="July 2026" />
          </Field>

          <Field name="scope" label="Type" hint="Two seasons of the same type cannot start at the same time.">
            <select id="scope" name="scope" defaultValue="MONTHLY" className={CONTROL}>
              {SCOPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field name="startsAt" label="Starts">
            <Input id="startsAt" name="startsAt" type="datetime-local" required className="tabular" />
          </Field>

          <Field name="endsAt" label="Ends" hint="Must be later than the start.">
            <Input id="endsAt" name="endsAt" type="datetime-local" required className="tabular" />
          </Field>

          <div className="sm:col-span-2">
            <Button type="submit" variant="dojo" size="sm">
              Open season
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Where rankings come from" className="border-dashed bg-transparent">
        <div className="space-y-4 text-sm leading-relaxed text-pretty text-muted-foreground">
          <p>
            Rankings are worked out from the games people have played. Those records are the real
            source, and a ranking can always be worked out again from them.
          </p>
          <p>
            <span className="text-foreground">
              The job that works out and saves rankings is not built yet.
            </span>{" "}
            A season you open here is real, but it will show zero rankings until that job exists.
            Nothing on this page makes up a number.
          </p>
          <p>
            Deleting a season also deletes its saved rankings. Nothing is lost for good: the games
            themselves are kept, and the rankings can be worked out again.
          </p>
        </div>
      </Panel>
    </AdminPage>
  );
}
