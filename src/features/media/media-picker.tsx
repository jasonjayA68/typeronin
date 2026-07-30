"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { MEDIA_KINDS, formatBytes } from "@/features/media/accepted";
import { searchMedia } from "@/features/media/actions";
import { MediaThumb } from "@/features/media/media-thumb";
import { MediaUploader } from "@/features/media/media-uploader";
// Type-only, so nothing from the server-only module is imported at runtime —
// `isolatedModules` guarantees the whole statement is erased.
import type { MediaSummary } from "@/features/media/queries";
import { cn } from "@/lib/utils";

import type { MediaKind } from "../../../generated/prisma/client";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

/**
 * Choose a file from the media library, or add one without leaving the page.
 *
 * The uploader is embedded rather than linked to. Picking a featured image is
 * nearly always the moment you discover you have not uploaded it yet, and
 * sending someone to /admin/media at that moment means abandoning a draft to a
 * navigation — which is how unsaved work dies.
 */

export type Picked = {
  id: string;
  kind: MediaKind;
  path: string;
  fileName: string;
  altText: string | null;
};

type KindFilter = (typeof MEDIA_KINDS)[number];

function title(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function MediaPicker({
  trigger,
  onPick,
  /** Narrow the library to one kind. Null offers everything. */
  only = "IMAGE",
  heading = "Choose an image",
  description = "Pick a file from the media library. The file is used, not copied.",
}: {
  trigger: ReactNode;
  onPick: (media: Picked) => void;
  only?: KindFilter | null;
  heading?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter | null>(only);
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    // Debounced: a search per keystroke is a Server Action per keystroke, and
    // they are dispatched one at a time per client — so the queue, not the
    // database, is what would make this feel broken.
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await searchMedia({ q, kind });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setResults(result.media);
        setLoaded(true);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [open, q, kind]);

  const pick = (media: MediaSummary) => {
    onPick({
      id: media.id,
      kind: media.kind,
      path: media.path,
      fileName: media.fileName,
      altText: media.altText,
    });
    setOpen(false);
  };

  const reopen = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQ("");
      setKind(only);
      setLoaded(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reopen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {uploading ? (
          <>
            <MediaUploader
              onUploaded={() => {
                // Back to the grid, which re-runs its search on mount and will
                // show the new file at the top — newest first.
                setUploading(false);
                setLoaded(false);
                setQ("");
              }}
            />
            <div>
              <Button variant="ghost" size="sm" onClick={() => setUploading(false)}>
                Back to the media library
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search file name or description"
                aria-label="Search the library"
                className="h-7 w-full min-w-0 sm:w-64"
              />
              {only === null
                ? MEDIA_KINDS.map((value) => (
                    <Button
                      key={value}
                      size="xs"
                      variant={kind === value ? "secondary" : "ghost"}
                      onClick={() => setKind(kind === value ? null : value)}
                    >
                      {title(value)}s
                    </Button>
                  ))
                : null}
              <Button size="xs" variant="outline" className="ml-auto" onClick={() => setUploading(true)}>
                Upload new
              </Button>
            </div>

            <div className="max-h-[26rem] min-h-40 overflow-y-auto">
              {!loaded && pending ? (
                <p className="py-12 text-center text-sm text-muted-foreground">Searching…</p>
              ) : results.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {results.map((media) => (
                    <li key={media.id}>
                      <button
                        type="button"
                        onClick={() => pick(media)}
                        className={cn(
                          "group w-full min-w-0 rounded-lg p-1 text-left transition-colors",
                          "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        )}
                      >
                        <MediaThumb media={media} className="aspect-4/3 w-full" sizes="200px" />
                        <span className="mt-1.5 block truncate text-xs font-medium">
                          {media.fileName}
                        </span>
                        <span className="tabular block truncate text-[0.7rem] text-muted-foreground">
                          {formatBytes(media.bytes)}
                          {media.width && media.height ? ` · ${media.width}×${media.height}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {q ? "Nothing matches that." : "The media library is empty."} Upload what you need.
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
