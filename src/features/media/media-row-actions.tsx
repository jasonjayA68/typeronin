"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteMedia, mediaUsage, updateMedia, type MediaUsage } from "@/features/media/actions";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export type MediaDraft = {
  id: string;
  kind: string;
  fileName: string;
  altText: string;
  caption: string;
};

/**
 * Edit and delete for one file.
 *
 * The file itself is immutable — there is no "replace". A path is referenced by
 * posts that have already been published, and swapping the bytes underneath one
 * would change what those posts show without touching them, from a screen that
 * gives no hint that is what is about to happen. Upload the new picture and point
 * the post at it.
 */
export function MediaRowActions({ media }: { media: MediaDraft }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [altText, setAltText] = useState(media.altText);
  const [caption, setCaption] = useState(media.caption);
  const [usage, setUsage] = useState<MediaUsage | null>(null);
  const [pending, startTransition] = useTransition();

  const isImage = media.kind === "IMAGE";

  const save = () =>
    startTransition(async () => {
      const result = await updateMedia(media.id, { altText, caption });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${media.fileName} saved`);
      setEditing(false);
    });

  const remove = () =>
    startTransition(async () => {
      // The dialog has shown the count; pressing the button acknowledges it.
      const result = await deleteMedia(media.id, true);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${media.fileName} removed`);
      setConfirming(false);
    });

  /**
   * The counts are fetched when the dialog opens, not with the page.
   *
   * Scanning every post's body for an embed is a sequential scan (see
   * `embeddedIn`), and doing it for every row of a 200-file grid to render a
   * warning nobody has asked for yet would make the library slow for everyone to
   * make deletion honest for the few.
   */
  const openDelete = (next: boolean) => {
    setConfirming(next);
    if (!next) return;

    setUsage(null);
    startTransition(async () => setUsage(await mediaUsage(media.id)));
  };

  const uses = usage ? usage.attached + usage.embedded : 0;

  return (
    <span className="flex items-center justify-end gap-1">
      <Dialog
        open={editing}
        onOpenChange={(next) => {
          setEditing(next);
          if (next) {
            setAltText(media.altText);
            setCaption(media.caption);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="truncate">{media.fileName}</DialogTitle>
            <DialogDescription>
              The description belongs to the file. Every post using it shows this description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-alt">Description{isImage ? "" : " (optional)"}</Label>
              <Input
                id="edit-alt"
                value={altText}
                disabled={pending}
                onChange={(e) => setAltText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {isImage
                  ? "Describe the picture for someone who cannot see it. Required for images."
                  : "There is nothing to describe. Leave it empty."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-caption">Caption</Label>
              <Input
                id="edit-caption"
                value={caption}
                disabled={pending}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending || (isImage && !altText.trim())}>
              {pending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirming} onOpenChange={openDelete}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="truncate">Delete {media.fileName}</DialogTitle>
            <DialogDescription>
              {usage === null ? (
                "Checking where this file is used…"
              ) : uses === 0 ? (
                "Nothing uses this file. Deleting it removes it for good."
              ) : (
                <>
                  <span className="tabular text-sakura">{uses}</span>{" "}
                  {uses === 1 ? "post or category uses" : "posts or categories use"} this file
                  {usage.embedded > 0 ? (
                    <>
                      {" "}
                      — <span className="tabular">{usage.embedded}</span> of them show it inside the
                      text, where it will leave a gap
                    </>
                  ) : null}
                  . Deleting cannot be undone. The file is removed for good, not just from this list.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={remove}
              // Until the count is in, there is nothing to acknowledge and the
              // warning above is still a spinner. Deleting now would be deleting
              // blind.
              disabled={pending || usage === null}
            >
              {pending ? "Removing" : uses > 0 ? `Delete anyway` : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
}
