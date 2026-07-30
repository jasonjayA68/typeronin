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
import { DeviceRowActions } from "@/features/security/device-actions";
import { listDevices } from "@/features/security/queries";

export const metadata: Metadata = {
  title: "Devices",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 30;

function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export default async function DevicesPage(props: PageProps<"/admin/devices">) {
  await requirePermission("users:write");

  const searchParams = await props.searchParams;
  const onlyFlagged = one(searchParams.filter) === "flagged";

  const requested = Number(one(searchParams.page) ?? "1");
  const page = Math.max(Number.isFinite(requested) ? Math.trunc(requested) : 1, 1);

  const { devices, total, flaggedCount, sharedCount } = await listDevices({
    onlyFlagged,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const date = (value: Date) =>
    value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const link = (filter: string | null, p?: number) => {
    const s = new URLSearchParams();
    if (filter) s.set("filter", filter);
    if (p && p > 1) s.set("page", String(p));
    const qs = s.toString();
    return qs ? `/admin/devices?${qs}` : "/admin/devices";
  };

  return (
    <AdminPage
      title="Devices"
      description="Every phone or computer used to sign in, and how many accounts each one has used. Two or more accounts on one device gets flagged so you can check it. Sharing a device is not proof of cheating. If the sharing is fine, mark the device as trusted and the flag goes away for good."
    >
      <PanelGrid cols={3}>
        <Stat label="Devices" value={total.toLocaleString()} framed />
        <Stat label="Shared" value={sharedCount.toLocaleString()} hint="Used by more than one account" framed />
        <Stat label="Flagged" value={flaggedCount.toLocaleString()} hint="Waiting for you to check" framed accent />
      </PanelGrid>

      <Panel title="All devices">
        <Toolbar>
          <Pill href={link(null)} active={!onlyFlagged}>
            All devices
          </Pill>
          <Pill href={link("flagged")} active={onlyFlagged}>
            Flagged only
          </Pill>
        </Toolbar>

        {devices.length ? (
          <>
            <DataTable>
              <caption className="sr-only">
                Devices and the accounts used on each, flagged when shared.
              </caption>
              <thead>
                <Tr>
                  <Th>Accounts</Th>
                  <Th>Device id</Th>
                  <Th>Last sign-in address</Th>
                  <Th numeric>Last seen</Th>
                  <Th>State</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {devices.map((device) => {
                  const shared = device._count.accounts > 1;
                  return (
                    <Tr key={device.id}>
                      <Td>
                        <span className="tabular text-xs text-muted-foreground">
                          {device._count.accounts}{" "}
                          {device._count.accounts === 1 ? "account" : "accounts"}
                        </span>
                        <span className="mt-0.5 block max-w-[16rem] truncate text-sm">
                          {device.accounts.map((a) => `@${a.profile.handle}`).join(", ") || "—"}
                        </span>
                      </Td>
                      <Td>
                        <code className="text-xs text-muted-foreground">
                          {device.fingerprint?.slice(0, 12) ?? "—"}
                        </code>
                      </Td>
                      <Td className="text-xs text-muted-foreground">{device.lastIp ?? "—"}</Td>
                      <Td numeric className="text-xs whitespace-nowrap text-muted-foreground">
                        {date(device.lastSeenAt)}
                      </Td>
                      <Td>
                        {device.trusted ? (
                          <StatusDot tone="on">Trusted</StatusDot>
                        ) : device.flaggedAt ? (
                          <StatusDot tone="warn">Flagged</StatusDot>
                        ) : shared ? (
                          <StatusDot tone="warn">Shared</StatusDot>
                        ) : (
                          <StatusDot tone="off">One account</StatusDot>
                        )}
                      </Td>
                      <Td className="text-right">
                        <DeviceRowActions id={device.id} trusted={device.trusted} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </DataTable>

            <Pagination page={page} pages={pages} build={(p) => link(onlyFlagged ? "flagged" : null, p)} />
          </>
        ) : (
          <EmptyState title={onlyFlagged ? "Nothing flagged" : "No devices yet"}>
            {onlyFlagged
              ? "No device has been used by more than one account. Nothing to check."
              : "Devices appear here as people sign in."}
          </EmptyState>
        )}
      </Panel>
    </AdminPage>
  );
}
