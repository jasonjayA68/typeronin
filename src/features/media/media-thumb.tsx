import Image from "next/image";

import { mediaUrl } from "@/features/media/url";
import { cn } from "@/lib/utils";

import type { MediaKind } from "../../../generated/prisma/client";

/**
 * One file, at thumbnail size.
 *
 * Shared by the library grid and the editor's picker so the two never drift into
 * rendering the same row differently. No "use client" — it is pure, and left as
 * a Server Component where it is used from one.
 *
 * A video or a PDF gets a labelled box rather than a broken frame. Generating a
 * poster frame means decoding the file, which is real work for a thumbnail
 * nobody has asked to watch.
 */
export function MediaThumb({
  media,
  className,
  sizes = "96px",
}: {
  media: {
    kind: MediaKind;
    path: string;
    fileName: string;
    altText: string | null;
  };
  className?: string;
  sizes?: string;
}) {
  const url = media.kind === "IMAGE" ? mediaUrl(media.path) : null;

  if (!url) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-lg bg-muted text-[0.65rem] tracking-[0.12em] text-muted-foreground uppercase",
          className
        )}
      >
        {media.kind === "VIDEO" ? "Video" : media.kind === "DOCUMENT" ? "PDF" : "No preview"}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
      <Image
        src={url}
        // Empty alt, deliberately. The library is a grid of files and the
        // filename is already beside every one of them; a screen reader
        // announcing the description twice is noise. Where the image *is* the
        // content — a post — the alt text is read from the row and used.
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}
