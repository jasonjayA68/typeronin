import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The dashboard's time-series.
 *
 * Three questions, three shapes: how much Honor each day lately (magnitude over
 * days), whether speed is trending (a rate over weeks), and the month-by-month
 * climb (magnitude over months). The buckets are cut in the database with
 * `date_trunc` — the right place to aggregate — and then the gaps are filled in
 * here, because a day with no play is a real zero the chart must show, not a
 * missing point that would let the axis lie about the passage of time.
 *
 * Buckets are UTC, matching the daily-limit reset. A player near a date line sees
 * a run land in the UTC day, which is the same rule everywhere else in the app.
 */

export type Point = { label: string; value: number };

type DayRow = { day: Date; honor: bigint | number };
type WeekRow = { week: Date; wpm: number };
type MonthRow = { month: Date; honor: bigint | number };

const DAYS = 30;
const WEEKS = 10;
const MONTHS = 6;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (d: Date) => d.toISOString().slice(0, 7);

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type ProgressCharts = {
  dailyHonor: Point[];
  weeklyWpm: Point[];
  monthlyHonor: Point[];
  /** True when there is nothing to plot at all — a fresh account. */
  empty: boolean;
};

export async function getProgressCharts(profileId: string): Promise<ProgressCharts> {
  try {
    const [dayRows, weekRows, monthRows] = await Promise.all([
      prisma.$queryRaw<DayRow[]>`
        SELECT date_trunc('day', "playedAt") AS day, SUM("honorEarned")::int AS honor
        FROM "TypingSession"
        WHERE "profileId" = ${profileId}::uuid
          AND "playedAt" >= date_trunc('day', now()) - make_interval(days => ${DAYS - 1})
        GROUP BY day
      `,
      prisma.$queryRaw<WeekRow[]>`
        SELECT date_trunc('week', "playedAt") AS week, AVG("wpm")::int AS wpm
        FROM "TypingSession"
        WHERE "profileId" = ${profileId}::uuid
          AND "playedAt" >= date_trunc('week', now()) - make_interval(weeks => ${WEEKS - 1})
        GROUP BY week
      `,
      prisma.$queryRaw<MonthRow[]>`
        SELECT date_trunc('month', "playedAt") AS month, SUM("honorEarned")::int AS honor
        FROM "TypingSession"
        WHERE "profileId" = ${profileId}::uuid
          AND "playedAt" >= date_trunc('month', now()) - make_interval(months => ${MONTHS - 1})
        GROUP BY month
      `,
    ]);

    // Daily: one bar per day for the whole window, zero where nothing was played.
    const honorByDay = new Map(dayRows.map((r) => [dayKey(new Date(r.day)), Number(r.honor)]));
    const today = utcToday();
    const dailyHonor: Point[] = Array.from({ length: DAYS }, (_, i) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - (DAYS - 1 - i));
      return {
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        value: honorByDay.get(dayKey(date)) ?? 0,
      };
    });

    // Weekly WPM: only the weeks that were played. A zero here would read as "typed
    // at 0 wpm", which is a lie — a gap is an absence, so absent weeks are dropped
    // and the line simply spans what exists.
    const weeklyWpm: Point[] = weekRows
      .map((r) => ({ date: new Date(r.week), value: Number(r.wpm) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((r) => ({
        label: r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        value: r.value,
      }));

    // Monthly: one bar per month, zero where nothing was played.
    const honorByMonth = new Map(monthRows.map((r) => [monthKey(new Date(r.month)), Number(r.honor)]));
    const monthAnchor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const monthlyHonor: Point[] = Array.from({ length: MONTHS }, (_, i) => {
      const date = new Date(monthAnchor);
      date.setUTCMonth(date.getUTCMonth() - (MONTHS - 1 - i));
      return {
        label: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        value: honorByMonth.get(monthKey(date)) ?? 0,
      };
    });

    const empty =
      dailyHonor.every((p) => p.value === 0) &&
      weeklyWpm.length === 0 &&
      monthlyHonor.every((p) => p.value === 0);

    return { dailyHonor, weeklyWpm, monthlyHonor, empty };
  } catch (error) {
    // A chart is never worth a 500. An empty set renders the "not enough yet"
    // state, the same as a brand-new account.
    console.error("getProgressCharts failed", error);
    return { dailyHonor: [], weeklyWpm: [], monthlyHonor: [], empty: true };
  }
}
