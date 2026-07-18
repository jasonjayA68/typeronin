import type { Metadata } from "next";

import { CommentQueue, type CommentRow } from "@/features/admin/comment-moderation";
import { requirePermission } from "@/features/admin/guard";
import {
  AdminPage,
  EmptyState,
  Panel,
  PanelGrid,
  Pill,
  Stat,
  Toolbar,
} from "@/features/admin/ui";
import { when } from "@/features/profile/dashboard-panels";
import { prisma } from "@/lib/prisma";

import type { CommentStatus } from "../../../../generated/prisma/client";

export const metadata: Metadata = {
  title: "Comments",
  robots: { index: false, follow: false },
};

const STATUSES = ["PENDING", "APPROVED", "SPAM", "REJECTED"] as const;

const LABEL: Record<CommentStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  SPAM: "Spam",
  REJECTED: "Rejected",
};

/** The queue defaults to what needs a decision, not to everything. */
function parseStatus(value: string | string[] | undefined): CommentStatus {
  const first = Array.isArray(value) ? value[0] : value;
  const upper = first?.toUpperCase();
  return STATUSES.find((s) => s === upper) ?? "PENDING";
}

const MAX_BODY = 180;

function truncate(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > MAX_BODY ? `${flat.slice(0, MAX_BODY).trimEnd()}…` : flat;
}

async function getQueue(status: CommentStatus) {
  const [comments, grouped] = await Promise.all([
    prisma.comment.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        body: true,
        guestName: true,
        parentId: true,
        createdAt: true,
        author: { select: { displayName: true } },
        post: { select: { title: true } },
      },
    }),
    prisma.comment.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));

  const rows: CommentRow[] = comments.map((c) => ({
    id: c.id,
    body: truncate(c.body),
    // A profile that was deleted takes its name with it (author is SetNull), so
    // an approved comment can outlive both its account and its guest name.
    authorName: c.author?.displayName ?? c.guestName ?? "Anonymous",
    isGuest: !c.author,
    postTitle: c.post.title,
    created: when(c.createdAt),
    isReply: c.parentId !== null,
  }));

  return { rows, counts };
}

export default async function CommentsPage(props: PageProps<"/admin/comments">) {
  await requirePermission("comments:moderate");

  const params = await props.searchParams;
  const status = parseStatus(params.status);
  const { rows, counts } = await getQueue(status);

  const total = STATUSES.reduce((sum, s) => sum + (counts.get(s) ?? 0), 0);

  return (
    <AdminPage
      title="Comments"
      description="Nothing reaches a post until it is approved here. Rejected and spam both stay on file — the difference is that spam is evidence, and a filter worth training needs it."
    >
      <PanelGrid cols={4}>
        {STATUSES.map((s) => (
          <Stat
            key={s}
            framed
            accent={s === "PENDING"}
            label={LABEL[s]}
            value={(counts.get(s) ?? 0).toLocaleString("en-US")}
            hint={s === "PENDING" ? "Awaiting a decision" : undefined}
          />
        ))}
      </PanelGrid>

      <Panel title={`${LABEL[status]} comments`}>
        <Toolbar>
          {STATUSES.map((s) => (
            <Pill key={s} href={`/admin/comments?status=${s.toLowerCase()}`} active={s === status}>
              {LABEL[s]}
              <span className="tabular ml-1.5 text-muted-foreground">{counts.get(s) ?? 0}</span>
            </Pill>
          ))}
        </Toolbar>

        {rows.length ? (
          <CommentQueue rows={rows} />
        ) : status === "PENDING" ? (
          <EmptyState title="Nothing awaiting moderation">
            {total > 0
              ? "Every comment on file has been decided. New ones arrive here first and stay invisible to readers until approved."
              : "No one has commented yet. When they do, nothing appears on the post until it is approved here."}
          </EmptyState>
        ) : (
          <EmptyState title={`No ${LABEL[status].toLowerCase()} comments`}>
            {total > 0
              ? "Nothing is filed under this state. The other tabs may have what you are looking for."
              : "No one has commented yet, so every state is empty."}
          </EmptyState>
        )}
      </Panel>
    </AdminPage>
  );
}
