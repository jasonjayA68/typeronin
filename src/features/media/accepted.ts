import type { MediaKind } from "../../../generated/prisma/client";

/**
 * What the library accepts, what it weighs, and what it is called on disk.
 *
 * Shared rather than server-only so the file picker offers exactly what the
 * server will take. Two lists that drift apart produce the worst upload
 * experience there is: a dialog that lets you choose a file and a server that
 * then refuses it. The type import above is erased at build, so this stays safe
 * in a browser bundle.
 *
 * An allowlist, because the bucket is public: whatever lands here is served to
 * the internet with the content type storage recorded for it.
 *
 * Note the absence of `image/svg+xml`. An SVG is a document that can carry
 * script, and serving one from the storage origin would put an attacker-authored
 * page on the domain holding our users' Supabase session. It is the one image
 * format a public bucket should not take, and "our editors are trusted" misses
 * the point — a stolen editor account should not also be a stored-XSS primitive.
 */
export type Accepted = {
  kind: MediaKind;
  /** The extension the stored object gets. Never the uploader's. */
  ext: string;
  /** Ceiling in bytes. The bucket enforces its own; this one explains itself. */
  limit: number;
};

export const ACCEPTED: Record<string, Accepted> = {
  "image/jpeg": { kind: "IMAGE", ext: "jpg", limit: 8_000_000 },
  "image/png": { kind: "IMAGE", ext: "png", limit: 8_000_000 },
  "image/webp": { kind: "IMAGE", ext: "webp", limit: 8_000_000 },
  "image/avif": { kind: "IMAGE", ext: "avif", limit: 8_000_000 },
  "image/gif": { kind: "IMAGE", ext: "gif", limit: 8_000_000 },
  "video/mp4": { kind: "VIDEO", ext: "mp4", limit: 50_000_000 },
  "video/webm": { kind: "VIDEO", ext: "webm", limit: 50_000_000 },
  "application/pdf": { kind: "DOCUMENT", ext: "pdf", limit: 20_000_000 },
};

/** For an `<input type="file" accept>`. */
export const ACCEPT_ATTRIBUTE = Object.keys(ACCEPTED).join(",");

/**
 * The kinds, in the order they are offered as filters.
 *
 * Mirrors the `MediaKind` enum. It is stated again here rather than derived
 * because a Prisma enum's runtime object is server-side, and the filter pills
 * that need this list render in the browser.
 */
export const MEDIA_KINDS = ["IMAGE", "VIDEO", "DOCUMENT"] as const;

/** Bytes as something a person reads, for limits and file sizes alike. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
