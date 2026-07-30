import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { getAuditLog } from "@/features/admin/queries";
import { AdminPage, DataTable, EmptyState, Panel, Td, Th, Tr } from "@/features/admin/ui";
import { when } from "@/features/profile/dashboard-panels";

export const metadata: Metadata = {
  title: "Activity log",
  robots: { index: false, follow: false },
};

export default async function AuditPage() {
  await requirePermission("audit:read");
  const entries = await getAuditLog();

  return (
    <AdminPage
      title="Activity log"
      description="A record of every action taken in the admin pages, newest first. Nothing here can be edited or deleted."
    >
      <Panel>
        {entries.length ? (
          <DataTable>
            <thead>
              <Tr>
                <Th>Action</Th>
                <Th>Item</Th>
                <Th>Done by</Th>
                <Th>Details</Th>
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
          <EmptyState title="Nothing here yet">
            Actions taken in the admin pages are recorded here.
          </EmptyState>
        )}
      </Panel>
    </AdminPage>
  );
}
