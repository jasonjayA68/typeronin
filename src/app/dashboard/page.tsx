import { ArrowRightIcon, FlameIcon, Gamepad2Icon, GiftIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { formatCash, honorToCash } from "@/features/economy/config";
import { getEconomyConfig } from "@/features/economy/service";
import { getDailyPlayState } from "@/features/play/service";
import { getDashboard } from "@/features/profile/queries";
import { ensureProfile } from "@/features/profile/service";
import { nextRank, rankForHonor, rankProgress } from "@/features/gamification/ranks";
import { Empty, Panel, Stat, when } from "@/features/profile/dashboard-panels";
import { CancelWithdrawalButton } from "@/features/withdrawals/cancel-button";
import {
  PAYOUT_METHOD_INFO,
  STATUS_LABEL,
  STATUS_TONE,
  canUserCancel,
  type PayoutMethodValue,
  type WithdrawalStatusValue,
} from "@/features/withdrawals/model";
import { getWalletTotals, listUserWithdrawals } from "@/features/withdrawals/queries";
import { RequestWithdrawalButton } from "@/features/withdrawals/request-form";
import { getUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Honor, your rewards wallet, and your progress — all in one place.",
};

/** Initials for the avatar tile. */
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "TR"
  );
}

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(user);
  const data = await getDashboard(profile.id);
  if (!data) redirect("/login");

  const { referrals } = data;
  const held = rankForHonor(profile.honor);
  const next = nextRank(profile.honor);
  const progress = Math.round(rankProgress(profile.honor) * 100);

  const [economy, walletTotals, withdrawals, playState] = await Promise.all([
    getEconomyConfig(),
    getWalletTotals(profile.id),
    listUserWithdrawals(profile.id),
    getDailyPlayState(profile.id),
  ]);

  const canWithdraw = profile.honor >= economy.minWithdrawalHonor;
  const honorToThreshold = Math.max(0, economy.minWithdrawalHonor - profile.honor);
  const pctToThreshold =
    economy.minWithdrawalHonor > 0
      ? Math.min(100, Math.round((profile.honor / economy.minWithdrawalHonor) * 100))
      : 100;

  const gamesLabel =
    playState.remaining === null
      ? "Unlimited"
      : `${playState.remaining} / ${playState.limits.maxGamesPerDay}`;

  const date = (value: Date) =>
    value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow={held.name}
          title={`Welcome back, ${profile.displayName}`}
          lede="Track your rewards, your rank, and your daily games — all in one place."
          actions={
            <Button asChild variant="dojo" size="lg">
              <Link href="/dojo">
                Play now
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        <Container className="py-10 sm:py-14">
          {/* Quick standing */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel title="Honor Balance">
              <Stat
                label="Available"
                value={profile.honor.toLocaleString()}
                accent
                hint={honorToCash(profile.honor, economy)}
              />
            </Panel>
            <Panel title="Games Today">
              <div className="flex items-center gap-2">
                <Gamepad2Icon aria-hidden="true" className="size-5 text-sakura" />
                <Stat label="Remaining" value={gamesLabel} hint="Resets daily" />
              </div>
            </Panel>
            <Panel title="Day Streak">
              <div className="flex items-center gap-2">
                <FlameIcon
                  aria-hidden="true"
                  className={cn("size-5", profile.streakDays > 0 ? "text-sakura" : "text-muted-foreground")}
                />
                <Stat
                  label="In a row"
                  value={String(profile.streakDays)}
                  hint={profile.lastPlayedOn ? `Last: ${when(profile.lastPlayedOn)}` : "Not yet begun"}
                />
              </div>
            </Panel>
            <Panel title="Rank">
              <Stat
                label="Current"
                value={held.name}
                hint={next ? `Next: ${next.name}` : "Top rank reached"}
              />
            </Panel>
          </div>

          {/* Rewards wallet — merged in from the old separate page */}
          <Panel title="Rewards Wallet" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Honor Balance"
                value={profile.honor.toLocaleString()}
                accent
                hint={`≈ ${honorToCash(profile.honor, economy)}`}
              />
              <Stat
                label="Pending Earnings"
                value={formatCash(walletTotals.pendingCents)}
                hint={
                  walletTotals.pendingCount > 0
                    ? `${walletTotals.pendingCount} withdrawal${walletTotals.pendingCount === 1 ? "" : "s"} in progress`
                    : "Nothing pending"
                }
              />
              <Stat
                label="Available to Withdraw"
                value={canWithdraw ? honorToCash(profile.honor, economy) : formatCash(0)}
                hint={canWithdraw ? "Ready to cash out" : "Below the minimum"}
              />
            </div>

            {/* Payout call to action */}
            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                {canWithdraw ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      You have{" "}
                      <span className="tabular text-sakura">{profile.honor.toLocaleString()}</span>{" "}
                      Honor ready — about{" "}
                      <span className="tabular text-foreground">
                        {honorToCash(profile.honor, economy)}
                      </span>
                      .
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cash out by GCash, Maya, PayPal, Wise, or bank transfer.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      <span className="tabular text-sakura">
                        {honorToThreshold.toLocaleString()}
                      </span>{" "}
                      more Honor to unlock withdrawals.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Withdrawals open at{" "}
                      <span className="tabular text-foreground">
                        {economy.minWithdrawalHonor.toLocaleString()}
                      </span>{" "}
                      Honor ({honorToCash(economy.minWithdrawalHonor, economy)}).
                    </p>
                    <Progress value={pctToThreshold} className="mt-3" />
                  </>
                )}
              </div>
              <div className="shrink-0">
                <RequestWithdrawalButton balance={profile.honor} config={economy} />
              </div>
            </div>

            {/* Withdrawal history */}
            <div className="mt-6">
              <h3 className="font-heading text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
                Withdrawal History
              </h3>
              {withdrawals.length ? (
                <div className="-mx-5 mt-3 overflow-x-auto sm:-mx-6">
                  <div className="inline-block min-w-full px-5 align-middle sm:px-6">
                    <table className="w-full border-collapse text-sm">
                      <caption className="sr-only">Your withdrawals, newest first.</caption>
                      <thead>
                        <tr>
                          <Th>Method</Th>
                          <Th numeric>Honor</Th>
                          <Th numeric>You receive</Th>
                          <Th>Status</Th>
                          <Th>Date</Th>
                          <Th className="text-right">Action</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((w) => {
                          const status = w.status as WithdrawalStatusValue;
                          const tone = STATUS_TONE[status];
                          return (
                            <tr key={w.id} className="border-b border-border/50 last:border-0">
                              <Td>
                                <span className="font-medium">
                                  {PAYOUT_METHOD_INFO[w.method as PayoutMethodValue].label}
                                </span>
                                <span className="mt-0.5 block max-w-[12rem] truncate text-xs text-muted-foreground">
                                  {w.accountRef}
                                </span>
                              </Td>
                              <Td numeric>{w.honorAmount.toLocaleString()}</Td>
                              <Td numeric>{formatCash(w.netCents)}</Td>
                              <Td>
                                <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
                                  <span
                                    aria-hidden="true"
                                    className={cn(
                                      "size-1.5 rounded-full",
                                      tone === "on" && "bg-success",
                                      tone === "off" && "bg-muted-foreground/40",
                                      tone === "warn" && "bg-warning"
                                    )}
                                  />
                                  {STATUS_LABEL[status]}
                                </span>
                              </Td>
                              <Td className="whitespace-nowrap text-xs text-muted-foreground">
                                {date(w.createdAt)}
                              </Td>
                              <Td className="text-right">
                                {canUserCancel(status) ? <CancelWithdrawalButton id={w.id} /> : null}
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
                  No withdrawals yet. Once your balance reaches the minimum, request one above.
                </p>
              )}
            </div>
          </Panel>

          {/* Rank progress */}
          <Panel title="Your Rank" className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-heading tracking-wide text-foreground">{held.name}</span>
                {next ? (
                  <>
                    {" → "}
                    <span className="font-heading tracking-wide text-foreground">{next.name}</span>
                  </>
                ) : (
                  " — top rank"
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

          {/* Profile + Referrals */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="Profile">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-sakura/40 bg-sakura/10 font-heading text-lg text-sakura">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- user-supplied host; next/image would need each allow-listed.
                    <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    initials(profile.displayName)
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-heading text-lg tracking-wide text-foreground">
                    {profile.displayName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/50 pt-4 text-sm">
                <dt className="text-muted-foreground">Username</dt>
                <dd className="truncate text-right text-foreground">@{profile.handle}</dd>
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="tabular text-right text-foreground">{when(profile.createdAt)}</dd>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="dojo" size="sm">
                  <Link href="/settings">Edit profile</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/profile/${profile.handle}`}>View public profile</Link>
                </Button>
              </div>
            </Panel>

            <Panel title="Referrals">
              <div className="flex items-center gap-3">
                <UsersIcon aria-hidden="true" className="size-5 text-muted-foreground" />
                <Stat label="Friends invited" value={String(referrals.total)} />
              </div>
              <div className="mt-4 rounded-lg border border-border bg-background/50 px-3 py-2">
                <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Your invite code
                </p>
                <p className="tabular mt-1 text-sm text-sakura">{profile.referralCode}</p>
              </div>
              {referrals.qualified > 0 ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <GiftIcon aria-hidden="true" className="size-3.5 text-sakura" />
                  {referrals.qualified} reward{referrals.qualified === 1 ? "" : "s"} owed to you
                </p>
              ) : (
                <Empty>Share your code — invite friends and earn rewards together.</Empty>
              )}
            </Panel>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

function Th({
  children,
  numeric,
  className,
}: {
  children: React.ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border px-4 py-3 text-left text-xs font-medium tracking-[0.1em] whitespace-nowrap text-muted-foreground uppercase first:pl-0 last:pr-0",
        numeric && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  numeric,
  className,
}: {
  children: React.ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn("px-4 py-3 align-middle first:pl-0 last:pr-0", numeric && "tabular text-right", className)}
    >
      {children}
    </td>
  );
}
