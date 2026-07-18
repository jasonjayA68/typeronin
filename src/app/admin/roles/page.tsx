import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { Fragment } from "react";

import { requirePermission } from "@/features/admin/guard";
import {
  AdminPage,
  DataTable,
  EmptyState,
  Panel,
  PanelGrid,
  Stat,
  StatusDot,
  Td,
  Th,
  Tr,
} from "@/features/admin/ui";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Roles",
  robots: { index: false, follow: false },
};

/**
 * Read-only, deliberately. No actions are imported here, and none exist for
 * roles: see the closing panel for why.
 */
async function getMatrix() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ isSystem: "desc" }, { slug: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { permissionId: true } },
        _count: { select: { profiles: true } },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { slug: "asc" }],
      select: { id: true, slug: true, description: true, resource: true },
    }),
  ]);

  const byResource = new Map<string, typeof permissions>();
  for (const permission of permissions) {
    const group = byResource.get(permission.resource) ?? [];
    group.push(permission);
    byResource.set(permission.resource, group);
  }

  return {
    roles: roles.map((role) => ({
      ...role,
      granted: new Set(role.permissions.map((p) => p.permissionId)),
    })),
    permissions,
    groups: [...byResource.entries()],
  };
}

function Granted({ on, role, permission }: { on: boolean; role: string; permission: string }) {
  return (
    <>
      {on ? (
        <CheckIcon aria-hidden="true" className="mx-auto size-4 text-sakura" />
      ) : (
        <span aria-hidden="true" className="text-muted-foreground/40">
          —
        </span>
      )}
      <span className="sr-only">
        {role} {on ? "holds" : "does not hold"} {permission}
      </span>
    </>
  );
}

export default async function RolesPage() {
  // Reading the matrix is itself a disclosure of who can do what, so it sits
  // behind the permission that edits people rather than a read-only one.
  await requirePermission("users:write");

  const { roles, permissions, groups } = await getMatrix();
  const holders = roles.reduce((total, role) => total + role._count.profiles, 0);

  return (
    <AdminPage
      title="Roles"
      description="A role is a named bundle of permissions, and the database is the source of truth for authority — no deploy grants anyone anything. This is the whole matrix, as it stands."
    >
      <PanelGrid cols={3}>
        <Stat framed label="Roles" value={String(roles.length)} hint="All three are seeded." />
        <Stat framed label="Permissions" value={String(permissions.length)} hint="The vocabulary of the panel." />
        <Stat framed accent label="Grants held" value={String(holders)} hint="Role rows across all profiles." />
      </PanelGrid>

      <Panel title="Roles">
        {roles.length ? (
          <DataTable>
            <caption className="sr-only">
              Each role, whether it is a system role, how many permissions it grants and how many
              profiles hold it.
            </caption>
            <thead>
              <tr>
                <Th>Role</Th>
                <Th>Purpose</Th>
                <Th>Origin</Th>
                <Th numeric>Permissions</Th>
                <Th numeric>Profiles</Th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <Tr key={role.id}>
                  <Td>
                    <span className="font-medium">{role.name}</span>
                    <span className="block text-xs text-muted-foreground">{role.slug}</span>
                  </Td>
                  <Td className="text-muted-foreground">{role.description ?? "—"}</Td>
                  <Td>
                    <StatusDot tone={role.isSystem ? "on" : "off"}>
                      {role.isSystem ? "System" : "Custom"}
                    </StatusDot>
                  </Td>
                  <Td numeric>{role.granted.size}</Td>
                  <Td numeric>{role._count.profiles}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No roles">
            Run <code>npx prisma db seed</code> to create the three the panel expects.
          </EmptyState>
        )}
      </Panel>

      <Panel title="Permission matrix">
        <p className="mb-4 text-sm leading-relaxed text-pretty text-muted-foreground">
          Permissions are named <code className="text-foreground">resource:action</code> and grouped
          by resource. A module that grants no permission cannot be reached at all, so this list is
          also the list of things the panel can do.
        </p>
        <DataTable>
          <caption className="sr-only">
            Permissions as rows, roles as columns, a check where the role holds the permission.
          </caption>
          <thead>
            <tr>
              <Th>Permission</Th>
              {roles.map((role) => (
                <Th key={role.id} className="text-center">
                  {role.name}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(([resource, group]) => (
              <Fragment key={resource}>
                <tr>
                  <Th
                    colSpan={roles.length + 1}
                    className="pt-6 text-sakura first:pl-0"
                    scope="colgroup"
                  >
                    {resource}
                  </Th>
                </tr>
                {group.map((permission) => (
                  <Tr key={permission.id}>
                    <Td>
                      <code className="text-xs">{permission.slug}</code>
                      <span className="block text-xs text-muted-foreground">
                        {permission.description ?? ""}
                      </span>
                    </Td>
                    {roles.map((role) => (
                      <Td key={role.id} className="text-center">
                        <Granted
                          on={role.granted.has(permission.id)}
                          role={role.name}
                          permission={permission.slug}
                        />
                      </Td>
                    ))}
                  </Tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </DataTable>
      </Panel>

      <Panel title="Read-only, deliberately" className="border-dashed bg-transparent">
        <div className="space-y-4 text-sm leading-relaxed text-pretty text-muted-foreground">
          <p>
            Creating roles and editing this matrix is not wired up, and that is a decision rather
            than a gap. Authority is read from these tables on every request, so a mis-set matrix
            does not fail loudly — it locks people out of the panel that would fix it. The safe
            version needs a rule that an admin cannot drop their own authority, and a matrix editor
            that cannot leave zero holders of{" "}
            <code className="text-foreground">users:write</code>. Until those exist, a form here
            would be a foot-gun with a save button.
          </p>
          <p>
            System roles are marked <span className="text-foreground">System</span> above and could
            not be deleted even once editing lands. The seed re-creates them, code checks for the{" "}
            <code className="text-foreground">admin</code> slug by name, and deleting a role cascades
            its grants — so removing one would silently revoke everyone who held it and then hand the
            slug back on the next seed.
          </p>
          <p>
            Grants are made from the command line, which is also how the first admin exists at all —
            there is no chicken-and-egg panel to log into first:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background/60 p-4 text-xs">
            <code>{`npx tsx scripts/grant-admin.ts you@example.com
npx tsx scripts/grant-admin.ts you@example.com --revoke`}</code>
          </pre>
          <p>
            The account must already exist in Supabase auth and have confirmed its email; the script
            grants a role, it does not mint credentials. The role is read per request, so a grant
            takes effect without signing out. Everything else — which permissions each role bundles —
            is changed in <code className="text-foreground">prisma/seed.ts</code> and re-seeded.
          </p>
        </div>
      </Panel>
    </AdminPage>
  );
}
