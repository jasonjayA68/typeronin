import { ArrowRightIcon, FlameIcon, GiftIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatCash, honorToCash } from "@/features/economy/config";
import { getEconomyConfig } from "@/features/economy/service";
import { getWalletTotals } from "@/features/withdrawals/queries";
import { nextRank, rankForHonor, rankProgress } from "@/features/gamification/ranks";
import {
  BattleRow,
  Empty,
  Panel,
  PanelLink,
  Stat,
  when,
} from "@/features/profile/dashboard-panels";
import { getDashboard } from "@/features/profile/queries";
import { ensureProfile } from "@/features/profile/service";
import { getUser } from "@/lib/supabase/server";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Honor, your rank, and every cut you have made.",
};

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  // First authenticated sight of this account mints the profile.
  const profile = await ensureProfile(user);
  const data = await getDashboard(profile.id);
  if (!data) redirect("/login");

  const { stats, recent, achievements, referrals, notifications } = data;
  const held = rankForHonor(profile.honor);
  const next = nextRank(profile.honor);
  const progress = Math.round(rankProgress(profile.honor) * 100);

  // The wallet reads the live rate and the real payout totals. Both readers fall
  // back safely (defaults / zeroes) if the database hiccups, so neither blocks
  // the dashboard.
  const [economy, walletTotals] = await Promise.all([
    getEconomyConfig(),
    getWalletTotals(profile.id),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow={`${held.name} · ${held.kanji}`}
          kanji="道場"
          title={`Welcome back, ${profile.displayName}`}
          lede={held.creed}
          actions={
            <Button asChild variant="dojo" size="lg">
              <Link href="/dojo">
                Take your stance
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        <Container className="py-10 sm:py-14">
          {/* Standing */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel title="Honor">
              <Stat label="Earned" value={profile.honor.toLocaleString()} accent hint={held.name} />
            </Panel>
            <Panel title="Ki Energy">
              <Stat label="Available" value={String(profile.ki)} hint="Spent on challenges" />
            </Panel>
            <Panel title="Streak">
              <div className="flex items-center gap-2">
                <FlameIcon
                  aria-hidden="true"
                  className={profile.streakDays > 0 ? "size-5 text-sakura" : "size-5 text-muted-foreground"}
                />
                <Stat
                  label="Days running"
                  value={String(profile.streakDays)}
                  hint={profile.lastPlayedOn ? `Last: ${when(profile.lastPlayedOn)}` : "Not yet begun"}
                />
              </div>
            </Panel>
            <Panel title="Experience">
              <Stat label="XP" value={profile.xp.toLocaleString()} />
            </Panel>
          </div>

          {/* Honor wallet */}
          <Panel
            title="Honor Wallet"
            className="mt-4"
            action={<PanelLink href="/withdrawals">Withdraw</PanelLink>}
          >
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Stat
                label="Honor Balance"
                value={profile.honor.toLocaleString()}
                accent
                hint="Spendable now"
              />
              <Stat
                label="Cash Equivalent"
                value={honorToCash(profile.honor, economy)}
                hint={`${economy.honorPerDollar.toLocaleString()} Honor = $1`}
              />
              <Stat
                label="Lifetime Honors"
                value={stats.honorFromSessions.toLocaleString()}
                hint="Earned across every run"
              />
              <Stat
                label="Total Withdrawn"
                value={formatCash(walletTotals.totalWithdrawnCents)}
                hint="Paid out to you"
              />
              <Stat
                label="Pending"
                value={formatCash(walletTotals.pendingCents)}
                hint={
                  walletTotals.pendingCount > 0
                    ? `${walletTotals.pendingCount} in flight`
                    : "Awaiting approval"
                }
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Honors become redeemable once your balance reaches the minimum payout of{" "}
              <span className="tabular text-foreground">
                {economy.minWithdrawalHonor.toLocaleString()}
              </span>{" "}
              Honor ({honorToCash(economy.minWithdrawalHonor, economy)}).{" "}
              <Link href="/withdrawals" className="text-sakura underline-offset-4 hover:underline">
                Manage withdrawals
              </Link>
              .
            </p>
          </Panel>

          {/* Rank progress */}
          <Panel title="The Path" className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-heading tracking-wide text-foreground">{held.name}</span>
                {next ? (
                  <>
                    {" → "}
                    <span className="font-heading tracking-wide text-foreground">{next.name}</span>
                  </>
                ) : (
                  " — the summit"
                )}
              </p>
              <p className="tabular text-sm text-sakura">
                {next
                  ? `${(next.honor - profile.honor).toLocaleString()} Honor to go`
                  : "Nothing left to climb"}
              </p>
            </div>
            <Progress value={progress} className="mt-3" />
          </Panel>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Recent battles */}
            <Panel
              title="Recent Battles"
              className="lg:col-span-2"
              action={<PanelLink href="/dojo">Train again</PanelLink>}
            >
              {recent.length ? (
                <ul>
                  {recent.map((session) => (
                    <BattleRow key={session.id} session={session} />
                  ))}
                </ul>
              ) : (
                <Empty
                  cta={
                    <Button asChild variant="dojo" size="sm">
                      <Link href="/dojo">Take your first stance</Link>
                    </Button>
                  }
                >
                  No cuts recorded yet. Every run you make from here is kept.
                </Empty>
              )}
            </Panel>

            {/* Statistics */}
            <Panel title="Statistics">
              {stats.sessions ? (
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Best WPM" value={String(stats.best?.wpm ?? 0)} accent />
                  <Stat label="Avg WPM" value={String(stats.avgWpm)} />
                  <Stat label="Accuracy" value={`${stats.avgAccuracy}%`} />
                  <Stat label="Ma 間" value={String(stats.avgMa)} />
                  <Stat label="Sessions" value={String(stats.sessions)} />
                  <Stat label="Words cut" value={stats.wordsCut.toLocaleString()} />
                </div>
              ) : (
                <Empty>Statistics appear once you have cut your first passage.</Empty>
              )}
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Achievements */}
            <Panel
              title="Bushido Trials"
              action={<PanelLink href="/achievements">All trials</PanelLink>}
            >
              <p className="tabular text-sm text-muted-foreground">
                <span className="text-sakura">{achievements.earned}</span> of {achievements.total} earned
              </p>
              {achievements.recent.length ? (
                <ul className="mt-3 space-y-2">
                  {achievements.recent.map((a) => (
                    <li key={a.achievement.slug} className="flex items-center gap-3">
                      <span aria-hidden="true" className="font-heading text-lg text-sakura">
                        {a.achievement.kanji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{a.achievement.name}</span>
                      <span className="text-xs text-muted-foreground">{when(a.unlockedAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No trials passed yet. They are earned slowly.</Empty>
              )}
            </Panel>

            {/* Referrals */}
            <Panel title="Referrals" action={<PanelLink href="/dashboard">Details</PanelLink>}>
              <div className="flex items-center gap-3">
                <UsersIcon aria-hidden="true" className="size-5 text-muted-foreground" />
                <Stat label="Students brought" value={String(referrals.total)} />
              </div>
              <div className="mt-4 rounded-lg border border-border bg-background/50 px-3 py-2">
                <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Your code
                </p>
                <p className="tabular mt-1 text-sm text-sakura">{profile.referralCode}</p>
              </div>
              {referrals.qualified > 0 ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <GiftIcon aria-hidden="true" className="size-3.5 text-sakura" />
                  {referrals.qualified} reward{referrals.qualified === 1 ? "" : "s"} owed to you
                </p>
              ) : null}
            </Panel>

            {/* Notifications */}
            <Panel title="Notices">
              {notifications.length ? (
                <ul className="space-y-3">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <p className="text-sm text-foreground">{n.title}</p>
                      {n.body ? (
                        <p className="text-xs text-pretty text-muted-foreground">{n.body}</p>
                      ) : null}
                      <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                        {when(n.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Nothing needs your attention.</Empty>
              )}
            </Panel>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Your public profile:{" "}
            <Link
              href={`/profile/${profile.handle}`}
              className="text-sakura underline-offset-4 hover:underline"
            >
              /profile/{profile.handle}
            </Link>
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
