import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import {
  AdminPage,
  DataTable,
  EmptyState,
  Pagination,
  Panel,
  PanelGrid,
  Pill,
  Stat,
  StatusDot,
  Td,
  Th,
  Toolbar,
  Tr,
} from "@/features/admin/ui";
import { formatCash } from "@/features/economy/config";
import { AdminWithdrawalActions } from "@/features/withdrawals/admin-actions";
import {
  PAYOUT_METHOD_INFO,
  STATUS_LABEL,
  STATUS_TONE,
  WITHDRAWAL_STATUSES,
  type PayoutMethodValue,
  type WithdrawalStatusValue,
} from "@/features/withdrawals/model";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Withdrawals",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 30;

type Query = { status?: string; page?: number };

function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

function link(query: Query, path = "/admin/withdrawals"): string {
  const search = new URLSearchParams();
  if (query.status) search.set("status", query.status);
  if (query.page && query.page > 1) search.set("page", String(query.page));
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export default async function AdminWithdrawalsPage(props: PageProps<"/admin/withdrawals">) {
  await requirePermission("payouts:write");

  const searchParams = await props.searchParams;
  const statusParam = one(searchParams.status)?.toUpperCase();
  const status = WITHDRAWAL_STATUSES.find((value) => value === statusParam);

  const where = status ? { status } : {};

  const [total, byStatus, owedAgg, paidAgg] = await Promise.all([
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.groupBy({ by: ["status"], where, _count: { _all: true } }),
    // Cash owed on everything still in flight, and cash already paid — figured
    // from the frozen cents, never the live rate.
    prisma.withdrawal.aggregate({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      _sum: { netCents: true },
    }),
    prisma.withdrawal.aggregate({ where: { status: "PAID" }, _sum: { netCents: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number(one(searchParams.page) ?? "1");
  const page = Math.min(Math.max(Number.isFinite(requested) ? Math.trunc(requested) : 1, 1), pages);

  const withdrawals = await prisma.withdrawal.findMany({
    where,
    // Oldest pending first is the queue an operator works; but overall newest
    // first reads better as a ledger. Pending-first within that: warn states
    // rank above settled by recency is enough here — newest first.
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      method: true,
      status: true,
      accountName: true,
      accountRef: true,
      details: true,
      honorAmount: true,
      netCents: true,
      feeCents: true,
      reference: true,
      adminNote: true,
      onHold: true,
      createdAt: true,
      profile: { select: { handle: true, displayName: true } },
    },
  });

  const countOf = (value: WithdrawalStatusValue) =>
    byStatus.find((row) => row.status === value)?._count._all ?? 0;
  const date = (value: Date) =>
    value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AdminPage
      title="Withdrawals"
      description="Every payout request. Approving does not move money — it accepts the request; mark it paid once you have sent the transfer, with its reference. Rejecting returns the held Honor to the player."
    >
      <PanelGrid cols={4}>
        <Stat label="Pending" value={countOf("PENDING").toLocaleString()} framed accent />
        <Stat label="Approved" value={countOf("APPROVED").toLocaleString()} framed />
        <Stat
          label="Owed (in flight)"
          value={formatCash(owedAgg._sum.netCents ?? 0)}
          hint="Cash for pending + approved"
          framed
        />
        <Stat
          label="Paid to date"
          value={formatCash(paidAgg._sum.netCents ?? 0)}
          hint="Frozen at each rate"
          framed
        />
      </PanelGrid>

      <Panel title="Queue">
        <Toolbar>
          <Pill href={link({ status: undefined })} active={!status}>
            All
          </Pill>
          {WITHDRAWAL_STATUSES.map((value) => (
            <Pill key={value} href={link({ status: value })} active={status === value}>
              {STATUS_LABEL[value]}
            </Pill>
          ))}
        </Toolbar>

        {withdrawals.length ? (
          <>
            <DataTable>
              <caption className="sr-only">Withdrawal requests matching the filter.</caption>
              <thead>
                <Tr>
                  <Th>Player</Th>
                  <Th>Method</Th>
                  <Th>Destination</Th>
                  <Th numeric>Honor</Th>
                  <Th numeric>Net</Th>
                  <Th>State</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const method = PAYOUT_METHOD_INFO[w.method as PayoutMethodValue];
                  const wStatus = w.status as WithdrawalStatusValue;
                  return (
                    <Tr key={w.id}>
                      <Td>
                        <span className="block max-w-[10rem] truncate font-medium">
                          {w.profile?.displayName ?? "—"}
                        </span>
                        {w.profile ? (
                          <span className="block max-w-[10rem] truncate text-xs text-muted-foreground">
                            @{w.profile.handle}
                          </span>
                        ) : null}
                      </Td>
                      <Td className="whitespace-nowrap">{method.label}</Td>
                      <Td>
                        <span className="block max-w-[12rem] truncate">{w.accountName}</span>
                        <span className="block max-w-[12rem] truncate text-xs text-muted-foreground">
                          {w.accountRef}
                          {w.details ? ` · ${w.details}` : ""}
                        </span>
                        {w.reference ? (
                          <span className="block max-w-[12rem] truncate text-xs text-success">
                            ref {w.reference}
                          </span>
                        ) : null}
                      </Td>
                      <Td numeric>{w.honorAmount.toLocaleString()}</Td>
                      <Td numeric>{formatCash(w.netCents)}</Td>
                      <Td>
                        <StatusDot tone={STATUS_TONE[wStatus]}>{STATUS_LABEL[wStatus]}</StatusDot>
                        {w.onHold ? (
                          <span className="mt-0.5 block w-fit rounded-full bg-warning/15 px-2 py-0.5 text-[0.65rem] font-semibold text-warning">
                            On hold
                          </span>
                        ) : null}
                        {w.adminNote ? (
                          <span className="mt-0.5 block max-w-[10rem] truncate text-xs text-muted-foreground">
                            {w.adminNote}
                          </span>
                        ) : null}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-muted-foreground">
                        {date(w.createdAt)}
                      </Td>
                      <Td>
                        <AdminWithdrawalActions id={w.id} status={wStatus} onHold={w.onHold} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </DataTable>

            <Pagination page={page} pages={pages} build={(next) => link({ status, page: next })} />
          </>
        ) : (
          <EmptyState title="Nothing here">
            {status
              ? `No ${STATUS_LABEL[status].toLowerCase()} withdrawals.`
              : "No withdrawals have been requested yet."}
          </EmptyState>
        )}
      </Panel>
    </AdminPage>
  );
}
