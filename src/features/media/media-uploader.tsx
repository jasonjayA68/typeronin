"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ACCEPTED, ACCEPT_ATTRIBUTE, formatBytes } from "@/features/media/accepted";
import { createUploadTicket, recordUpload } from "@/features/media/actions";
import { MEDIA_BUCKET } from "@/features/media/url";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * Upload, in three moves: get a ticket, push the bytes straight to storage,
 * record the row.
 *
 * The file never touches our server — see features/media/actions.ts for why.
 *
 * The alt text is asked for *before* the upload rather than after, which is the
 * whole reason this is a small form and not a one-click file input. An image
 * without alt text is refused by `recordUpload`, and being refused after the
 * bytes are already up means the object gets deleted and the person uploads it
 * twice. Ask first, and the refusal never happens.
 */

const field =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

/**
 * The pixel dimensions, read in the browser because it is the only place that
 * has the file. Display metadata: the server stores what it is told here and
 * nothing depends on it being true.
 *
 * Failure is not an error — a video or a PDF has no dimensions to read, and an
 * image the decoder chokes on is still a perfectly good upload with two null
 * columns.
 */
async function measure(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/")) return { width: null, height: null };

  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null };
  }
}

export function MediaUploader({ onUploaded }: { onUploaded?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [pending, startTransition] = useTransition();

  const accepted = file ? ACCEPTED[file.type] : undefined;
  const isImage = accepted?.kind === "IMAGE";

  const clear = () => {
    // Revoking matters: an object URL pins the whole file in memory until the
    // document unloads, and this form is used repeatedly in one sitting.
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setAltText("");
    setCaption("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const choose = (next: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
    setFile(next);
  };

  const submit = () => {
    if (!file) return;

    startTransition(async () => {
      const ticket = await createUploadTicket({
        fileName: file.name,
        mimeType: file.type,
        bytes: file.size,
      });
      if (!ticket.ok) {
        toast.error(ticket.message);
        return;
      }

      const { width, height } = await measure(file);

      try {
        const supabase = createClient();
        const { error } = await supabase.storage
          .from(MEDIA_BUCKET)
          .uploadToSignedUrl(ticket.path, ticket.token, file, {
            // Say what it is. Storage records this and serves it back as the
            // response's content type, and `recordUpload` re-reads it to decide
            // the kind — so an omission here becomes a wrong row later.
            contentType: file.type,
          });

        if (error) {
          console.error("uploadToSignedUrl failed", error);
          toast.error("The upload did not reach storage. Nothing was saved.");
          return;
        }
      } catch (error) {
        console.error("uploadToSignedUrl threw", error);
        toast.error("The upload did not reach storage. Nothing was saved.");
        return;
      }

      const recorded = await recordUpload({
        path: ticket.path,
        fileName: file.name,
        altText,
        caption,
        width,
        height,
      });
      if (!recorded.ok) {
        toast.error(recorded.message);
        return;
      }

      toast.success(`${file.name} uploaded`);
      clear();
      onUploaded?.();
    });
  };

  const tooBig = Boolean(file && accepted && file.size > accepted.limit);
  const unsupported = Boolean(file && !accepted);
  const needsAlt = isImage && !altText.trim();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="media-file">File</Label>
        <input
          ref={inputRef}
          id="media-file"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          disabled={pending}
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          className="w-full min-w-0 text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-transparent file:px-2.5 file:py-1 file:text-sm file:text-foreground hover:file:bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP, AVIF or GIF up to 8MB · MP4 and WebM up to 50MB · PDF up to 20MB.
        </p>
      </div>

      {file ? (
        <>
          <div className="flex items-start gap-4 rounded-lg border border-dashed border-border p-4">
            {previewUrl ? (
              // A local object URL, not next/image: the file is in this browser
              // and has no URL to optimise yet. eslint's img rule is about
              // shipping unoptimised remote images, which this is not.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="size-20 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">
                {accepted?.kind === "VIDEO" ? "Video" : accepted?.kind === "DOCUMENT" ? "PDF" : "File"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="tabular mt-1 text-xs text-muted-foreground">
                {formatBytes(file.size)} · {file.type || "unknown type"}
              </p>
              {unsupported ? (
                <p className="mt-2 text-xs text-destructive">
                  That file type is not accepted here.
                </p>
              ) : tooBig ? (
                <p className="mt-2 text-xs text-destructive">
                  Over the {formatBytes(accepted!.limit)} limit for this type.
                </p>
              ) : null}
            </div>
            <Button variant="ghost" size="xs" onClick={clear} disabled={pending}>
              Remove
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="media-alt">Alt text{isImage ? "" : " (optional)"}</Label>
            <Input
              id="media-alt"
              value={altText}
              disabled={pending}
              placeholder="An empty dojo at dawn, one sword on the rack"
              onChange={(e) => setAltText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {isImage
                ? "What someone who cannot see it needs to know. Required for images."
                : "A video or document has nothing to describe visually. Leave it blank."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="media-caption">Caption</Label>
            <input
              id="media-caption"
              value={caption}
              disabled={pending}
              placeholder="Optional — shown beneath the image where it appears"
              onChange={(e) => setCaption(e.target.value)}
              className={field}
            />
          </div>

          <Button
            size="sm"
            onClick={submit}
            disabled={pending || tooBig || unsupported || needsAlt}
          >
            {pending ? "Uploading" : "Upload"}
          </Button>
          {needsAlt && !pending ? (
            <p className="text-xs text-muted-foreground">Alt text first, then upload.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
