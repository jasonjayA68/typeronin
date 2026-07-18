import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { SubscriberRowActions } from "@/features/admin/subscriber-actions";
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
import { when } from "@/features/profile/dashboard-panels";
import { prisma } from "@/lib/prisma";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import type { SubscriberStatus } from "../../../../generated/prisma/client";

export const metadata: Metadata = {
  title: "Newsletter",
  robots: { index: false, follow: false },
};

const PER_PAGE = 50;

const STATUSES = ["CONFIRMED", "PENDING", "UNSUBSCRIBED"] as const;

const LABEL: Record<SubscriberStatus, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  UNSUBSCRIBED: "Unsubscribed",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Unlike comments, "all" is a legitimate default here. */
function parseStatus(value: string | string[] | undefined): SubscriberStatus | undefined {
  const upper = first(value)?.toUpperCase();
  return STATUSES.find((s) => s === upper);
}

function parsePage(value: string | string[] | undefined): number {
  const n = Number(first(value));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

async function getSubscribers(status: SubscriberStatus | undefined, q: string, page: number) {
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { email: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [subscribers, matching, grouped] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        email: true,
        status: true,
        source: true,
        createdAt: true,
        confirmedAt: true,
        unsubscribedAt: true,
      },
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return {
    subscribers,
    matching,
    counts: new Map(grouped.map((g) => [g.status, g._count._all])),
  };
}

export default async function NewsletterPage(props: PageProps<"/admin/newsletter">) {
  await requirePermission("blog:write");

  const params = await props.searchParams;
  const status = parseStatus(params.status);
  const q = (first(params.q) ?? "").trim().slice(0, 120);
  const requested = parsePage(params.page);

  const { subscribers, matching, counts } = await getSubscribers(status, q, requested);
  const pages = Math.max(1, Math.ceil(matching / PER_PAGE));
  const page = Math.min(requested, pages);

  const confirmed = counts.get("CONFIRMED") ?? 0;

  const href = (next: { status?: string; page?: number }) => {
    const search = new URLSearchParams();
    const nextStatus = "status" in next ? next.status : status?.toLowerCase();
    if (nextStatus) search.set("status", nextStatus);
    if (q) search.set("q", q);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const query = search.toString();
    return query ? `/admin/newsletter?${query}` : "/admin/newsletter";
  };

  return (
    <AdminPage
      title="Newsletter"
      description="Every address and how it got here. Pending means the address was given but never proven, so it belongs to no one until it is confirmed."
      actions={
        // A plain anchor, not Link: the response is a download, not a route.
        // Offered only when there is something to export — `disabled` on an
        // anchor renders an invalid attribute and still follows the href.
        confirmed > 0 ? (
          <Button asChild size="sm" variant="outline">
            <a href="/admin/newsletter/export">Export confirmed</a>
          </Button>
        ) : null
      }
    >
      <PanelGrid cols={3}>
        <Stat
          framed
          accent
          label="Confirmed"
          value={confirmed.toLocaleString("en-US")}
          hint="Provably theirs, and the only addresses safe to mail"
        />
        <Stat
          framed
          label="Pending"
          value={(counts.get("PENDING") ?? 0).toLocaleString("en-US")}
          hint="Never confirmed"
        />
        <Stat
          framed
          label="Unsubscribed"
          value={(counts.get("UNSUBSCRIBED") ?? 0).toLocaleString("en-US")}
          hint="Kept on file so they stay off the list"
        />
      </PanelGrid>

      <Panel title="Subscribers">
        <Toolbar>
          <Pill href={href({ status: undefined })} active={!status}>
            All
          </Pill>
          {STATUSES.map((s) => (
            <Pill key={s} href={href({ status: s.toLowerCase() })} active={s === status}>
              {LABEL[s]}
              <span className="tabular ml-1.5 text-muted-foreground">{counts.get(s) ?? 0}</span>
            </Pill>
          ))}

          {/* A GET form: the query lives in the URL, so the page stays linkable. */}
          <form action="/admin/newsletter" className="ml-auto flex items-center gap-2">
            {status ? <input type="hidden" name="status" value={status.toLowerCase()} /> : null}
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by email"
              aria-label="Search subscribers by email"
              className="h-8 w-44"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>
        </Toolbar>

        {subscribers.length ? (
          <>
            <DataTable>
              <caption className="sr-only">
                Newsletter subscribers, newest first, with the state of each address.
              </caption>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>State</Th>
                  <Th>Source</Th>
                  <Th numeric>Joined</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <Tr key={subscriber.id}>
                    <Td>
                      <span className="block max-w-[16rem] truncate">{subscriber.email}</span>
                    </Td>
                    <Td>
                      <StatusDot
                        tone={
                          subscriber.status === "CONFIRMED"
                            ? "on"
                            : subscriber.status === "PENDING"
                              ? "warn"
                              : "off"
                        }
                      >
                        {LABEL[subscriber.status]}
                      </StatusDot>
                      {subscriber.status === "CONFIRMED" && subscriber.confirmedAt ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {when(subscriber.confirmedAt)}
                        </span>
                      ) : null}
                      {subscriber.status === "UNSUBSCRIBED" && subscriber.unsubscribedAt ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {when(subscriber.unsubscribedAt)}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-muted-foreground">
                      <span className="block max-w-[10rem] truncate text-xs">
                        {subscriber.source ?? "Unknown"}
                      </span>
                    </Td>
                    <Td numeric className="text-xs whitespace-nowrap text-muted-foreground">
                      {when(subscriber.createdAt)}
                    </Td>
                    <Td className="text-right">
                      <SubscriberRowActions
                        subscriberId={subscriber.id}
                        email={subscriber.email}
                        canUnsubscribe={subscriber.status !== "UNSUBSCRIBED"}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>

            <Pagination page={page} pages={pages} build={(n) => href({ page: n })} />
          </>
        ) : (
          <EmptyState title={q ? `Nothing matches "${q}"` : "No subscribers yet"}>
            {q
              ? "Search matches on any part of the address, so a shorter query may find it."
              : "Addresses arrive here as people sign up, and stay pending until they confirm."}
          </EmptyState>
        )}
      </Panel>

      <Panel title="About the export" className="border-dashed bg-transparent">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          The export contains confirmed addresses only —{" "}
          <span className="tabular text-sakura">{confirmed.toLocaleString("en-US")}</span> of{" "}
          <span className="tabular">
            {[...counts.values()].reduce((a, b) => a + b, 0).toLocaleString("en-US")}
          </span>{" "}
          on file. Pending addresses were typed into a form by someone who never proved the address
          was theirs, and unsubscribed ones asked to be left alone. Mailing either is how a sending
          domain ends up on a blocklist, which costs more to undo than the addresses were worth.
          {confirmed === 0
            ? " The export appears once at least one address is confirmed; there is nothing to download yet."
            : null}
        </p>
      </Panel>
    </AdminPage>
  );
}
