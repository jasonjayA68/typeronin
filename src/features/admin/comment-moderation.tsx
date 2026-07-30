"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  approveComment,
  bulkModerateComments,
  deleteComment,
  markCommentSpam,
  rejectComment,
} from "@/features/admin/content-actions";
import type { ContentActionResult } from "@/features/admin/content-actions";
import { DataTable, Td, Th, Tr } from "@/features/admin/ui";
import { Button } from "@/shared/components/ui/button";

export type CommentRow = {
  id: string;
  body: string;
  authorName: string;
  isGuest: boolean;
  postTitle: string;
  created: string;
  isReply: boolean;
};

type Intent = "approve" | "reject" | "spam" | "delete";

const SINGLE: Record<Intent, (id: string) => Promise<ContentActionResult>> = {
  approve: approveComment,
  reject: rejectComment,
  spam: markCommentSpam,
  delete: deleteComment,
};

const PAST: Record<Intent, string> = {
  approve: "approved",
  reject: "rejected",
  spam: "marked as spam",
  delete: "deleted",
};

/**
 * The list of comments to review.
 *
 * Ticking rows is the only reason this is a client component: the rows, the
 * filter and the counts are all server-rendered. Every button calls an action
 * that re-checks the permission, so nothing here decides who is allowed in.
 */
export function CommentQueue({ rows }: { rows: CommentRow[] }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const runSingle = (id: string, intent: Intent) =>
    startTransition(async () => {
      const result = await SINGLE[intent](id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSelected((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      toast.success(`Comment ${PAST[intent]}`);
    });

  const runBulk = (intent: Intent) =>
    startTransition(async () => {
      const ids = [...selected];
      const result = await bulkModerateComments({ ids, intent });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSelected(new Set());
      toast.success(`${ids.length} ${ids.length === 1 ? "comment" : "comments"} ${PAST[intent]}`);
    });

  return (
    <>
      {selected.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <p className="mr-auto text-xs text-muted-foreground">
            <span className="tabular text-sakura">{selected.size}</span> ticked
          </p>
          {(["approve", "reject", "spam"] as const).map((intent) => (
            <Button
              key={intent}
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => runBulk(intent)}
            >
              {intent === "spam" ? "Mark spam" : intent === "approve" ? "Approve" : "Reject"}
            </Button>
          ))}
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => runBulk("delete")}
          >
            Delete
          </Button>
        </div>
      ) : null}

      <DataTable>
        <caption className="sr-only">
          Comments in the group you picked, newest first.
        </caption>
        <thead>
          <tr>
            <Th className="w-8">
              <input
                type="checkbox"
                checked={allSelected}
                aria-label={allSelected ? "Untick every comment" : "Tick every comment shown"}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                className="size-4 accent-sakura"
              />
            </Th>
            <Th>Comment</Th>
            <Th>Written by</Th>
            <Th>Post</Th>
            <Th numeric>Written</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.id}>
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  aria-label={`Tick the comment by ${row.authorName}`}
                  onChange={() => toggle(row.id)}
                  className="size-4 accent-sakura"
                />
              </Td>
              <Td>
                <span className="block max-w-[22rem] text-pretty">
                  {row.isReply ? (
                    <span className="mr-1.5 text-xs text-muted-foreground">reply to another comment</span>
                  ) : null}
                  {row.body}
                </span>
              </Td>
              <Td>
                <span className="block max-w-[9rem] truncate">{row.authorName}</span>
                {row.isGuest ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">not signed in</span>
                ) : null}
              </Td>
              <Td>
                <span className="block max-w-[11rem] truncate text-muted-foreground">
                  {row.postTitle}
                </span>
              </Td>
              <Td numeric className="text-xs whitespace-nowrap text-muted-foreground">
                {row.created}
              </Td>
              <Td className="text-right">
                <span className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => runSingle(row.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => runSingle(row.id, "reject")}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={pending}
                    onClick={() => runSingle(row.id, "spam")}
                  >
                    Spam
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={pending}
                    onClick={() => runSingle(row.id, "delete")}
                  >
                    Delete
                  </Button>
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}
