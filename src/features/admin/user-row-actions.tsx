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
  bio,
  countryCode,
  email,
  isSelf,
  isAdmin,
}: {
  profileId: string;
  displayName: string;
  handle: string;
  bio: string;
  countryCode: string;
  email: string;
  isSelf: boolean;
  isAdmin: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [tag, setTag] = useState(handle);
  const [about, setAbout] = useState(bio);
  const [country, setCountry] = useState(countryCode);
  const [mail, setMail] = useState(email);
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
      const result = await updateUser(profileId, {
        displayName: name.trim(),
        handle: tag.trim(),
        bio: about.trim(),
        countryCode: country.trim(),
        email: mail.trim(),
      });
      if (result.ok) {
        toast.success("User updated.");
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
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update this user&apos;s details. Roles, Honor, and account status are managed
              elsewhere. Changing the email sets it immediately (no confirmation needed).
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
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor={`handle-${profileId}`}>Username</Label>
                <Input
                  id={`handle-${profileId}`}
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  maxLength={30}
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`country-${profileId}`}>Country</Label>
                <Input
                  id={`country-${profileId}`}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="PH"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`email-${profileId}`}>Email</Label>
              <Input
                id={`email-${profileId}`}
                type="email"
                inputMode="email"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`bio-${profileId}`}>Bio</Label>
              <textarea
                id={`bio-${profileId}`}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={300}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                placeholder="Optional."
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
