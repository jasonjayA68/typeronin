import { ArrowRightIcon, FlameIcon, GiftIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatCash, honorToCash } from "@/features/economy/config";
import { getEconomyConfig } from "@/features/economy/service";
import { describeClient } from "@/features/auth/user-agent";
import { getLoginActivity } from "@/features/profile/activity";
import { getProgressCharts } from "@/features/profile/charts";
import { getWalletTotals, listUserWithdrawals } from "@/features/withdrawals/queries";
import {
  PAYOUT_METHOD_INFO,
  STATUS_LABEL,
  STATUS_TONE,
  type PayoutMethodValue,
  type WithdrawalStatusValue,
} from "@/features/withdrawals/model";
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
import { MiniBarChart, MiniLineChart } from "@/shared/components/charts/mini-charts";
import { cn } from "@/lib/utils";
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
  const [economy, walletTotals, charts, withdrawals, activity] = await Promise.all([
    getEconomyConfig(),
    getWalletTotals(profile.id),
    getProgressCharts(profile.id),
    listUserWithdrawals(profile.id),
    getLoginActivity(profile.id),
  ]);
  const recentWithdrawals = withdrawals.slice(0, 4);

  // Where the account stands against the payout threshold — drives the wallet's
  // call to action, so the student always knows whether they can cash out yet.
  const canWithdraw = profile.honor >= economy.minWithdrawalHonor;
  const honorToThreshold = Math.max(0, economy.minWithdrawalHonor - profile.honor);
  const pctToThreshold =
    economy.minWithdrawalHonor > 0
      ? Math.min(100, Math.round((profile.honor / economy.minWithdrawalHonor) * 100))
      : 100;

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
            {/* The payout call to action — where accumulated Honor becomes money.
                Prominent on purpose: this is the answer to "how do I get paid?" */}
            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                {canWithdraw ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      You have{" "}
                      <span className="tabular text-sakura">
                        {profile.honor.toLocaleString()}
                      </span>{" "}
                      Honor ready to cash out — about{" "}
                      <span className="tabular text-foreground">
                        {honorToCash(profile.honor, economy)}
                      </span>
                      .
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Get paid by GCash, Maya, PayPal, Wise, or bank transfer on the payout page.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      <span className="tabular text-sakura">
                        {honorToThreshold.toLocaleString()}
                      </span>{" "}
                      more Honor to unlock payouts.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Payouts open at{" "}
                      <span className="tabular text-foreground">
                        {economy.minWithdrawalHonor.toLocaleString()}
                      </span>{" "}
                      Honor ({honorToCash(economy.minWithdrawalHonor, economy)}). You have{" "}
                      <span className="tabular text-foreground">
                        {profile.honor.toLocaleString()}
                      </span>
                      .
                    </p>
                    <Progress value={pctToThreshold} className="mt-3" />
                  </>
                )}
              </div>
              <Button asChild variant="dojo" size="lg" className="shrink-0">
                <Link href="/withdrawals">
                  {canWithdraw ? "Process a payout" : "See payout options"}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
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

          {/* Progress — the shape of the training over time. */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel title="Daily Honor">
              {charts.empty ? (
                <Empty>Your first runs will start the chart.</Empty>
              ) : (
                <>
                  <MiniBarChart title="Honor earned per day, last 30 days" unit="Honor" data={charts.dailyHonor} />
                  <p className="mt-2 text-xs text-muted-foreground">Last 30 days.</p>
                </>
              )}
            </Panel>

            <Panel title="Weekly Speed">
              {charts.empty ? (
                <Empty>Speed trends appear once you have a couple of weeks in.</Empty>
              ) : (
                <>
                  <MiniLineChart title="Average WPM per week" unit="WPM" data={charts.weeklyWpm} />
                  <p className="mt-2 text-xs text-muted-foreground">Average WPM, last 10 weeks.</p>
                </>
              )}
            </Panel>

            <Panel title="Monthly Progress">
              {charts.empty ? (
                <Empty>The months fill in as you train.</Empty>
              ) : (
                <>
                  <MiniBarChart title="Honor earned per month, last 6 months" unit="Honor" data={charts.monthlyHonor} />
                  <p className="mt-2 text-xs text-muted-foreground">Honor per month, last 6 months.</p>
                </>
              )}
            </Panel>
          </div>

          {/* Withdrawal history */}
          <Panel
            title="Withdrawal History"
            className="mt-4"
            action={<PanelLink href="/withdrawals">Manage</PanelLink>}
          >
            {recentWithdrawals.length ? (
              <ul className="divide-y divide-border/50">
                {recentWithdrawals.map((w) => {
                  const status = w.status as WithdrawalStatusValue;
                  return (
                    <li key={w.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {PAYOUT_METHOD_INFO[w.method as PayoutMethodValue].label}
                          <span className="ml-2 text-xs text-muted-foreground">{when(w.createdAt)}</span>
                        </p>
                        <p className="tabular text-xs text-muted-foreground">
                          {w.honorAmount.toLocaleString()} Honor → {formatCash(w.netCents)}
                          {w.reference ? ` · ref ${w.reference}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-1.5 rounded-full",
                            STATUS_TONE[status] === "on" && "bg-success",
                            STATUS_TONE[status] === "off" && "bg-muted-foreground/40",
                            STATUS_TONE[status] === "warn" && "bg-warning"
                          )}
                        />
                        {STATUS_LABEL[status]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty
                cta={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/withdrawals">Open the wallet</Link>
                  </Button>
                }
              >
                No withdrawals yet. Once your balance clears the minimum, you can request a payout.
              </Empty>
            )}
          </Panel>

          {/* Account & security */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel title="Connected Device">
              {activity.latest ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{describeClient(activity.latest)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Last signed in {when(activity.latest.createdAt)}
                      {activity.latest.country ? ` · ${activity.latest.country}` : ""}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/50 pt-3 text-xs">
                    <dt className="text-muted-foreground">Timezone</dt>
                    <dd className="text-right text-foreground">{profile.timezone ?? "—"}</dd>
                    <dt className="text-muted-foreground">Member since</dt>
                    <dd className="tabular text-right text-foreground">{when(profile.createdAt)}</dd>
                    <dt className="text-muted-foreground">Signed up via</dt>
                    <dd className="text-right text-foreground">{profile.registrationSource ?? "—"}</dd>
                    {profile.lastLogoutAt ? (
                      <>
                        <dt className="text-muted-foreground">Last sign-out</dt>
                        <dd className="tabular text-right text-foreground">
                          {when(profile.lastLogoutAt)}
                        </dd>
                      </>
                    ) : null}
                  </dl>
                </div>
              ) : (
                <Empty>Your device details appear the next time you sign in.</Empty>
              )}
            </Panel>

            <Panel title="Login History" className="lg:col-span-2">
              {activity.recent.length ? (
                <ul className="divide-y divide-border/50">
                  {activity.recent.map((login, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{describeClient(login)}</p>
                        <p className="text-xs text-muted-foreground">
                          {login.device ?? "Unknown device"}
                          {login.country ? ` · ${login.country}` : ""}
                          {login.region ? `, ${login.region}` : ""}
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {when(login.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No sign-ins recorded yet — this one is your first from a tracked login.</Empty>
              )}
            </Panel>
          </div>

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
