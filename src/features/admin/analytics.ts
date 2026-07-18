import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Analytics, from the tables we own.
 *
 * There is no page-view pipeline, so traffic sources, daily *visitors* and advert
 * performance genuinely cannot be computed. They are omitted rather than
 * approximated from sessions — "daily active players" and "daily users" are not
 * the same number, and quietly showing one labelled as the other is how a
 * dashboard starts lying.
 *
 * Day bucketing is raw SQL: Prisma's groupBy cannot date_trunc.
 */

export type DayPoint = { day: string; count: number };

/** Sessions per day. `days` back from today, zero-filled so gaps are visible. */
async function sessionsPerDay(days: number): Promise<DayPoint[]> {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    select date_trunc('day', "playedAt") as day, count(*) as count
      from "TypingSession"
     where "playedAt" >= now() - make_interval(days => ${days})
     group by 1
     order by 1
  `;
  return zeroFill(rows, days);
}

async function signupsPerDay(days: number): Promise<DayPoint[]> {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    select date_trunc('day', "createdAt") as day, count(*) as count
      from "Profile"
     where "createdAt" >= now() - make_interval(days => ${days})
     group by 1
     order by 1
  `;
  return zeroFill(rows, days);
}

/**
 * A day with no rows returns no row. Without filling, a quiet Tuesday simply
 * vanishes and the chart silently misrepresents the shape of the week.
 */
function zeroFill(rows: { day: Date; count: bigint }[], days: number): DayPoint[] {
  const byDay = new Map(
    rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)])
  );
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

export async function getAnalytics(days = 30) {
  const [sessions, signups, speedBuckets, categories, referrals, subscribers, modes] =
    await Promise.all([
      sessionsPerDay(days),
      signupsPerDay(days),

      // WPM distribution in 20-wpm bands — the shape of who actually plays.
      prisma.$queryRaw<{ band: number; count: bigint }[]>`
        select (wpm / 20) * 20 as band, count(*) as count
          from "TypingSession"
         group by 1
         order by 1
      `,

      prisma.$queryRaw<{ name: string | null; count: bigint; avg_wpm: number | null }[]>`
        select c.name, count(s.id) as count, avg(s.wpm)::float as avg_wpm
          from "TypingSession" s
          left join "Category" c on c.id = s."categoryId"
         group by c.name
         order by count(s.id) desc
         limit 8
      `,

      // The closest thing to a traffic source we honestly have.
      prisma.referral.groupBy({ by: ["status"], _count: { _all: true } }),

      prisma.$queryRaw<{ source: string | null; count: bigint }[]>`
        select source, count(*) as count
          from "NewsletterSubscriber"
         group by source
         order by count(*) desc
         limit 5
      `,

      prisma.$queryRaw<{ mode: string; count: bigint }[]>`
        select mode::text as mode, count(*) as count
          from "TypingSession"
         group by 1
         order by 2 desc
      `,
    ]);

  return {
    days,
    sessions,
    signups,
    speedBands: speedBuckets.map((b) => ({ band: Number(b.band), count: Number(b.count) })),
    categories: categories.map((c) => ({
      name: c.name ?? "Free practice",
      count: Number(c.count),
      avgWpm: Math.round(c.avg_wpm ?? 0),
    })),
    referrals: Object.fromEntries(referrals.map((r) => [r.status, r._count._all])),
    subscriberSources: subscribers.map((s) => ({
      source: s.source ?? "Unknown",
      count: Number(s.count),
    })),
    modes: modes.map((m) => ({ mode: m.mode, count: Number(m.count) })),
  };
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;
