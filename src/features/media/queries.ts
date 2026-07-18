import "server-only";

import type { MediaKind, Prisma } from "../../../generated/prisma/client";

/**
 * What the library page and the editor's picker both read.
 *
 * One select and one where-builder, shared, because the two surfaces list the
 * same rows and a picker that quietly disagreed with the library about what
 * exists — or about what "search" means — is the kind of bug nobody reports and
 * everybody works around.
 */

/** The columns that leave the server. `uploadedById` is not among them. */
export const mediaSelect = {
  id: true,
  kind: true,
  path: true,
  fileName: true,
  mimeType: true,
  bytes: true,
  width: true,
  height: true,
  altText: true,
  caption: true,
  createdAt: true,
  uploadedBy: { select: { displayName: true } },
} satisfies Prisma.MediaSelect;

export type MediaSummary = {
  id: string;
  kind: MediaKind;
  path: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  createdAt: Date;
  uploadedBy: { displayName: string } | null;
};

/**
 * Search across the three fields a person would actually search by.
 *
 * Alt text and caption are included deliberately: six months on, nobody
 * remembers that the photo they want is `IMG_4021.jpg`, but they do remember it
 * was the one of the empty dojo at dawn.
 */
export function mediaWhere(q?: string, kind?: MediaKind): Prisma.MediaWhereInput {
  return {
    ...(kind ? { kind } : {}),
    ...(q
      ? {
          OR: [
            { fileName: { contains: q, mode: "insensitive" as const } },
            { altText: { contains: q, mode: "insensitive" as const } },
            { caption: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}
