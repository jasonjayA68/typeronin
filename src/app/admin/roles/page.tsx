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
 * Read-only, on purpose. No actions are imported here, and none exist for
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
        {role} {on ? "is allowed to" : "is not allowed to"} {permission}
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
      description="A role is a set of permissions. A permission is one thing a person is allowed to do. This page shows every role and what it allows."
    >
      <PanelGrid cols={3}>
        <Stat framed label="Roles" value={String(roles.length)} hint="Three come with the site." />
        <Stat framed label="Permissions" value={String(permissions.length)} hint="Everything the admin pages can do." />
        <Stat framed accent label="People with a role" value={String(holders)} hint="Counted across all roles." />
      </PanelGrid>

      <Panel title="Roles">
        {roles.length ? (
          <DataTable>
            <caption className="sr-only">
              Each role, where it came from, how many permissions it allows and how many people have
              it.
            </caption>
            <thead>
              <tr>
                <Th>Role</Th>
                <Th>What it is for</Th>
                <Th>Where it came from</Th>
                <Th numeric>Permissions</Th>
                <Th numeric>People</Th>
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
                      {role.isSystem ? "Built in" : "Added later"}
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
            Run <code>npx prisma db seed</code> to create the three roles the site expects.
          </EmptyState>
        )}
      </Panel>

      <Panel title="Who can do what">
        <p className="mb-4 text-sm leading-relaxed text-pretty text-muted-foreground">
          Each permission is named <code className="text-foreground">area:action</code> and grouped by
          area. A tick means that role is allowed to do it.
        </p>
        <DataTable>
          <caption className="sr-only">
            Permissions as rows and roles as columns, with a tick where the role is allowed.
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

      <Panel title="You can read this page, not change it" className="border-dashed bg-transparent">
        <div className="space-y-4 text-sm leading-relaxed text-pretty text-muted-foreground">
          <p>
            You cannot add roles or change the ticks here yet. That is on purpose. One wrong tick can
            lock everyone out of the page needed to fix it. An editor is only safe once it stops you
            from removing your own access, and from leaving nobody who can manage users.
          </p>
          <p>
            Roles marked <span className="text-foreground">Built in</span> cannot be deleted. The site
            recreates them, and the code looks for the{" "}
            <code className="text-foreground">admin</code> role by name. Deleting a role would also
            remove it from everyone who has it.
          </p>
          <p>
            Roles are given from the command line. This is also how the first admin is created, since
            there is no admin page to sign in to yet:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background/60 p-4 text-xs">
            <code>{`npx tsx scripts/grant-admin.ts you@example.com
npx tsx scripts/grant-admin.ts you@example.com --revoke`}</code>
          </pre>
          <p>
            The account must already exist and have a confirmed email. The command gives a role; it
            does not create a login. The change takes effect at once, with no need to sign out. To
            change which permissions a role has, edit{" "}
            <code className="text-foreground">prisma/seed.ts</code> and run the seed again.
          </p>
        </div>
      </Panel>
    </AdminPage>
  );
}
