import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { getAuditLog } from "@/features/admin/queries";
import { AdminPage, DataTable, EmptyState, Panel, Td, Th, Tr } from "@/features/admin/ui";
import { when } from "@/features/profile/dashboard-panels";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

export default async function AuditPage() {
  await requirePermission("audit:read");
  const entries = await getAuditLog();

  return (
    <AdminPage
      title="Audit log"
      description="Every administrative action, newest first. Append-only: nothing here can be edited from the panel, which is the only property that makes a log worth keeping."
    >
      <Panel>
        {entries.length ? (
          <DataTable>
            <thead>
              <Tr>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>By</Th>
                <Th>Detail</Th>
                <Th numeric>When</Th>
              </Tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <Tr key={entry.id}>
                  <Td className="font-medium whitespace-nowrap text-foreground">{entry.action}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{entry.entity}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {entry.actor?.displayName ?? "System"}
                  </Td>
                  <Td className="max-w-xs truncate text-xs text-muted-foreground">
                    {entry.meta && Object.keys(entry.meta).length
                      ? JSON.stringify(entry.meta)
                      : "—"}
                  </Td>
                  <Td className="text-xs whitespace-nowrap text-muted-foreground" numeric>
                    {when(entry.createdAt)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="Nothing has been administered yet">
            Actions taken in this panel are recorded here.
          </EmptyState>
        )}
      </Panel>
    </AdminPage>
  );
}
