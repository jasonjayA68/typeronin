import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { formatCash, honorToCash } from "@/features/economy/config";
import { getEconomyConfig } from "@/features/economy/service";
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
import { ensureProfile } from "@/features/profile/service";
import { getUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

export const metadata: Metadata = {
  title: "Withdrawals",
  description: "Turn Honor into cash, and track every payout.",
  robots: { index: false, follow: false },
};

function StatusDot({ status }: { status: WithdrawalStatusValue }) {
  const tone = STATUS_TONE[status];
  return (
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
  );
}

export default async function WithdrawalsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(user);
  const [config, totals, history] = await Promise.all([
    getEconomyConfig(),
    getWalletTotals(profile.id),
    listUserWithdrawals(profile.id),
  ]);

  const date = (value: Date) =>
    value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Honor Wallet"
          kanji="金"
          title="Withdrawals"
          lede="Convert the Honor you have earned into cash. A request holds the Honor until it is paid or refused."
          actions={<RequestWithdrawalButton balance={profile.honor} config={config} />}
        />

        <Container className="py-10 sm:py-14">
          {/* Wallet summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card/60 p-5">
              <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                Balance
              </p>
              <p className="tabular mt-1 text-2xl font-semibold text-sakura">
                {profile.honor.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{honorToCash(profile.honor, config)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-5">
              <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                Pending
              </p>
              <p className="tabular mt-1 text-2xl font-semibold text-foreground">
                {formatCash(totals.pendingCents)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totals.pendingHonor.toLocaleString()} Honor held
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-5">
              <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                Total withdrawn
              </p>
              <p className="tabular mt-1 text-2xl font-semibold text-foreground">
                {formatCash(totals.totalWithdrawnCents)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Paid out to you</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-5">
              <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                Rate
              </p>
              <p className="tabular mt-1 text-2xl font-semibold text-foreground">
                {config.honorPerDollar.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Honor = $1</p>
            </div>
          </div>

          {profile.honor < config.minWithdrawalHonor ? (
            <p className="mt-4 rounded-lg border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
              You need at least{" "}
              <span className="tabular text-foreground">
                {config.minWithdrawalHonor.toLocaleString()}
              </span>{" "}
              Honor ({honorToCash(config.minWithdrawalHonor, config)}) to make a withdrawal. Keep
              training in{" "}
              <Link href="/dojo" className="text-sakura underline-offset-4 hover:underline">
                the dojo
              </Link>
              .
            </p>
          ) : null}

          {/* History */}
          <section className="mt-8 min-w-0 rounded-xl border border-border bg-card/60 p-5 sm:p-6">
            <h2 className="font-heading text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
              Your withdrawals
            </h2>

            {history.length ? (
              <div className="-mx-5 mt-4 overflow-x-auto sm:-mx-6">
                <div className="inline-block min-w-full px-5 align-middle sm:px-6">
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">Your withdrawal requests, newest first.</caption>
                    <thead>
                      <tr>
                        <Th>Method</Th>
                        <Th numeric>Honor</Th>
                        <Th numeric>You receive</Th>
                        <Th>State</Th>
                        <Th>Date</Th>
                        <Th>Reference</Th>
                        <Th className="text-right">Action</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((w) => {
                        const status = w.status as WithdrawalStatusValue;
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
                              <StatusDot status={status} />
                              {w.adminNote ? (
                                <span className="mt-0.5 block max-w-[12rem] truncate text-xs text-muted-foreground">
                                  {w.adminNote}
                                </span>
                              ) : null}
                            </Td>
                            <Td className="whitespace-nowrap text-xs text-muted-foreground">
                              {date(w.createdAt)}
                            </Td>
                            <Td className="text-xs text-muted-foreground">{w.reference ?? "—"}</Td>
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
              <p className="mt-4 rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                No withdrawals yet. Once your balance reaches the minimum, request one above.
              </p>
            )}
          </section>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Back to your{" "}
            <Link href="/dashboard" className="text-sakura underline-offset-4 hover:underline">
              dashboard
            </Link>
            .
          </p>
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
      className={cn(
        "px-4 py-3 align-middle first:pl-0 last:pr-0",
        numeric && "tabular text-right",
        className
      )}
    >
      {children}
    </td>
  );
}
