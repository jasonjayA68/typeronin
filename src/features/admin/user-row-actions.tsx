"use client";

import { LoaderCircleIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteUser, updateUser } from "@/features/admin/user-actions";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * Per-row edit and delete for the Students table.
 *
 * A client island inside a server-rendered table: the authority lives in the
 * server actions (each re-checks `users:write`), this only gathers the input and
 * reports the answer. Delete is destructive and irreversible, so it sits behind
 * its own confirmation naming the account.
 */
export function UserRowActions({
  profileId,
  displayName,
  handle,
  isSelf,
  isAdmin,
}: {
  profileId: string;
  displayName: string;
  handle: string;
  isSelf: boolean;
  isAdmin: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [tag, setTag] = useState(handle);
  const [pending, startTransition] = useTransition();

  // Self-delete is refused by the action; admins must be demoted first. Say so
  // early rather than let the click travel to a refusal.
  const deleteBlockedReason = isSelf
    ? "You cannot delete your own account."
    : isAdmin
      ? "Revoke the admin role before deleting this account."
      : null;

  function submitEdit() {
    startTransition(async () => {
      const result = await updateUser(profileId, { displayName: name.trim(), handle: tag.trim() });
      if (result.ok) {
        toast.success("Student updated.");
        setEditOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function submitDelete() {
    startTransition(async () => {
      const result = await deleteUser(profileId);
      if (result.ok) {
        toast.success(`Deleted @${handle}.`);
        setConfirmOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <PencilIcon aria-hidden="true" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
            <DialogDescription>
              Change the display name and handle. Roles and Honor are managed elsewhere.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${profileId}`}>Display name</Label>
              <Input
                id={`name-${profileId}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`handle-${profileId}`}>Handle</Label>
              <Input
                id={`handle-${profileId}`}
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                maxLength={30}
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={submitEdit} disabled={pending}>
              {pending ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={deleteBlockedReason !== null}
            title={deleteBlockedReason ?? undefined}
          >
            <Trash2Icon aria-hidden="true" />
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              This permanently removes <span className="font-medium text-foreground">@{handle}</span>{" "}
              and everything it owns — sessions, trials, missions and withdrawals — along with the
              login itself. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={submitDelete}
              disabled={pending}
            >
              {pending ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : null}
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
