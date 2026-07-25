import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { holds, requirePermission } from "@/features/admin/guard";
import { ModerationControls, StatusBadges } from "@/features/admin/moderation-controls";
import { grantRole, revokeRole } from "@/features/admin/user-actions";
import { UserRowActions } from "@/features/admin/user-row-actions";
import { when } from "@/features/profile/dashboard-panels";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

import { Prisma } from "../../../../generated/prisma/client";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

async function getStudents() {
  const profiles = await prisma.profile.findMany({
    orderBy: { honor: "desc" },
    take: 50,
    select: {
      id: true,
      handle: true,
      displayName: true,
      bio: true,
      countryCode: true,
      honor: true,
      createdAt: true,
      status: true,
      isFlagged: true,
      withdrawalsFrozen: true,
      moderationNote: true,
      roles: { select: { role: { select: { slug: true, name: true } } } },
      _count: { select: { sessions: true } },
    },
  });

  // Email lives in Supabase's auth.users, outside the Prisma schema — hence raw
  // SQL, and hence a join in memory rather than in the query.
  const emails = profiles.length
    ? await prisma.$queryRaw<{ id: string; email: string | null }[]>`
        select id::text, email
          from auth.users
         where id::text in (${Prisma.join(profiles.map((p) => p.id))})
      `
    : [];
  const emailById = new Map(emails.map((row) => [row.id, row.email]));

  return profiles.map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? null,
    roles: p.roles.map((r) => r.role),
  }));
}

/**
 * The form's entry point. The imported actions carry the authority; this only
 * translates a form post into a call and puts the refusal somewhere visible.
 */
async function updateAdminRole(formData: FormData) {
  "use server";

  const profileId = String(formData.get("profileId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  const result =
    intent === "revoke" ? await revokeRole(profileId, "admin") : await grantRole(profileId, "admin");

  redirect(result.ok ? "/admin/users" : "/admin/users?notice=refused");
}

export default async function StudentsPage(props: PageProps<"/admin/users">) {
  const context = await requirePermission("users:read");
  const canWrite = holds(context, "users:write");
  const canFreeze = holds(context, "payouts:write");

  const [students, { notice }] = await Promise.all([getStudents(), props.searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The fifty users holding the most Honor. Roles decide what a user may reach in this
          panel; everything else here is read from the tables that own it.
        </p>
      </div>

      {notice === "refused" ? (
        <p
          role="status"
          className="rounded-lg border border-sakura/30 bg-sakura/10 px-4 py-3 text-sm text-sakura"
        >
          That change was refused. Nothing was altered.
        </p>
      ) : null}

      {students.length === 0 ? (
        <p className="glass-panel rounded-2xl py-12 text-center text-sm text-muted-foreground">
          No users yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-3xl border-collapse text-sm">
            <caption className="sr-only">
              Users ordered by Honor, with their roles, sessions played and the date they joined.
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  User
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Roles
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Honor
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Sessions
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Joined
                </th>
                {canWrite ? (
                  <>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Admin
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Manage
                    </th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const isAdmin = student.roles.some((r) => r.slug === "admin");
                const isSelf = student.id === context.user.id;

                return (
                  <tr key={student.id} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="px-4 py-4 text-left font-medium">
                      <Link
                        href={`/profile/${student.handle}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {student.displayName}
                      </Link>
                      <span className="block text-xs font-normal text-muted-foreground">
                        @{student.handle}
                      </span>
                    </th>
                    <td className="px-4 py-4 text-muted-foreground">
                      {student.email ?? "No email on record"}
                    </td>
                    <td className="px-4 py-4">
                      {student.roles.length ? (
                        <span className="flex flex-wrap gap-1">
                          {student.roles.map((role) => (
                            <Badge
                              key={role.slug}
                              variant="secondary"
                              className={cn(
                                role.slug === "admin" &&
                                  "border-sakura/30 bg-sakura/10 text-sakura"
                              )}
                            >
                              {role.name}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">User</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadges
                        state={{
                          status: student.status,
                          isFlagged: student.isFlagged,
                          withdrawalsFrozen: student.withdrawalsFrozen,
                          moderationNote: student.moderationNote,
                        }}
                      />
                    </td>
                    <td className="tabular px-4 py-4 text-right font-semibold">
                      {student.honor.toLocaleString("en-US")}
                    </td>
                    <td className="tabular px-4 py-4 text-right text-muted-foreground">
                      {student._count.sessions.toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-4 text-right text-muted-foreground">
                      {when(student.createdAt)}
                    </td>
                    {canWrite ? (
                      <td className="px-4 py-4 text-right">
                        <form action={updateAdminRole} className="inline">
                          <input type="hidden" name="profileId" value={student.id} />
                          <input
                            type="hidden"
                            name="intent"
                            value={isAdmin ? "revoke" : "grant"}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant={isAdmin ? "outline" : "secondary"}
                            // Revoking your own admin role would lock you out; the
                            // action refuses it regardless, this only says so early.
                            disabled={isAdmin && isSelf}
                            title={
                              isAdmin && isSelf
                                ? "You cannot revoke your own admin role."
                                : undefined
                            }
                          >
                            {isAdmin ? "Revoke" : "Grant"}
                          </Button>
                        </form>
                      </td>
                    ) : null}
                    {canWrite ? (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <ModerationControls
                            profileId={student.id}
                            displayName={student.displayName}
                            isSelf={isSelf}
                            canFreeze={canFreeze}
                            state={{
                              status: student.status,
                              isFlagged: student.isFlagged,
                              withdrawalsFrozen: student.withdrawalsFrozen,
                              moderationNote: student.moderationNote,
                            }}
                          />
                          <UserRowActions
                            profileId={student.id}
                            displayName={student.displayName}
                            handle={student.handle}
                            bio={student.bio ?? ""}
                            countryCode={student.countryCode ?? ""}
                            email={student.email ?? ""}
                            isSelf={isSelf}
                            isAdmin={isAdmin}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
