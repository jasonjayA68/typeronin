import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { holds, requirePermission } from "@/features/admin/guard";
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
import { deletePassage, setPassageActive } from "@/features/passages/actions";
import { PassageCreate, PassageEdit } from "@/features/passages/passage-form";
import { prisma } from "@/lib/prisma";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Passages",
  robots: { index: false, follow: false },
};

type Difficulty = "EASY" | "MEDIUM" | "HARD";

function title(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function refused(): string {
  return "/admin/passages?notice=refused";
}

async function togglePassage(formData: FormData) {
  "use server";

  const result = await setPassageActive(
    String(formData.get("id") ?? ""),
    formData.get("next") === "true"
  );
  redirect(result.ok ? "/admin/passages" : refused());
}

async function removePassage(formData: FormData) {
  "use server";

  const result = await deletePassage(String(formData.get("id") ?? ""));
  redirect(result.ok ? "/admin/passages" : refused());
}

export default async function PassagesPage(props: PageProps<"/admin/passages">) {
  const context = await requirePermission("words:write");
  const canWrite = holds(context, "words:write");

  const searchParams = await props.searchParams;
  const noticeParam = searchParams.notice;
  const notice = Array.isArray(noticeParam) ? noticeParam[0] : noticeParam;

  const [passages, total, activeCount] = await Promise.all([
    prisma.passage.findMany({
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        text: true,
        difficulty: true,
        isActive: true,
        sort: true,
      },
    }),
    prisma.passage.count(),
    prisma.passage.count({ where: { isActive: true } }),
  ]);

  return (
    <AdminPage
      title="Passages"
      description="The KATA prose the typing engine draws from. Each passage is a title and a body typed clean; the dojo draws only the active ones, in the order below."
    >
      {notice === "refused" ? (
        <p
          role="status"
          className="rounded-lg border border-sakura/30 bg-sakura/10 px-4 py-3 text-sm text-sakura"
        >
          That change was refused. Nothing was altered.
        </p>
      ) : null}

      <PanelGrid cols={2}>
        <Stat
          label="Passages"
          value={String(total)}
          hint={`${activeCount} active · ${total - activeCount} off`}
          framed
          accent
        />
        <Stat
          label="In rotation"
          value={String(activeCount)}
          hint={activeCount === 0 ? "Dojo falls back to the built-in set" : "Drawn in the dojo"}
          framed
        />
      </PanelGrid>

      <Panel title="Passages">
        {passages.length ? (
          <DataTable>
            <caption className="sr-only">Passages, in the order the dojo draws them.</caption>
            <thead>
              <Tr>
                <Th numeric>Order</Th>
                <Th>Title</Th>
                <Th>Passage</Th>
                <Th>Difficulty</Th>
                <Th>State</Th>
                {canWrite ? <Th numeric>Actions</Th> : null}
              </Tr>
            </thead>
            <tbody>
              {passages.map((passage) => (
                <Tr key={passage.id}>
                  <Td className="tabular text-muted-foreground" numeric>
                    {passage.sort}
                  </Td>
                  <Td className="font-medium whitespace-nowrap text-foreground">{passage.title}</Td>
                  <Td className="max-w-md text-xs text-muted-foreground">
                    <span className="line-clamp-2">{passage.text}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {title(passage.difficulty)}
                  </Td>
                  <Td>
                    <StatusDot tone={passage.isActive ? "on" : "off"}>
                      {passage.isActive ? "Active" : "Off"}
                    </StatusDot>
                  </Td>
                  {canWrite ? (
                    <Td numeric>
                      <div className="flex justify-end gap-1">
                        <PassageEdit
                          passage={{
                            id: passage.id,
                            title: passage.title,
                            text: passage.text,
                            difficulty: passage.difficulty as Difficulty,
                            sort: passage.sort,
                            isActive: passage.isActive,
                          }}
                        />
                        <form action={togglePassage}>
                          <input type="hidden" name="id" value={passage.id} />
                          <input type="hidden" name="next" value={String(!passage.isActive)} />
                          <Button type="submit" size="xs" variant="ghost">
                            {passage.isActive ? "Disable" : "Enable"}
                          </Button>
                        </form>
                        <form action={removePassage}>
                          <input type="hidden" name="id" value={passage.id} />
                          <Button type="submit" size="xs" variant="ghost">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No passages yet">
            The dojo is running on the built-in set. Add a passage below to take over the rotation.
          </EmptyState>
        )}
      </Panel>

      {canWrite ? (
        <Panel title="Add a passage">
          <PassageCreate />
        </Panel>
      ) : null}
    </AdminPage>
  );
}
