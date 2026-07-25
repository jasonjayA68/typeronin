import "server-only";

import { embeddedMediaIds, parsePostDocument, type PostDocument } from "@/features/blog/document";
import type { MediaLookup } from "@/features/blog/renderer";
import { prisma } from "@/lib/prisma";

import type { Prisma } from "../../../generated/prisma/client";

/**
 * What the public blog may see, and how it says it.
 *
 * The important thing in this file is `PUBLIC_POSTS`. It is the one definition
 * of "a reader may read this", and every public query is built from it —
 * deliberately, because the alternative is four pages each writing their own
 * where-clause and one of them forgetting. Forgetting here does not look like a
 * bug; it looks like a working page that happens to serve unpublished drafts to
 * anyone who guesses a slug.
 */

/**
 * PUBLISHED and nothing else.
 *
 * Not `status: { not: "DRAFT" }`, which would be the same thing today and would
 * quietly start leaking the day a status is added to the enum. An allowlist, for
 * the same reason the document parser is one.
 *
 * SCHEDULED is excluded although its content is finished: it is finished *and
 * dated*, and the date is a decision. ARCHIVED is excluded because someone took
 * it down — the writing is kept, the page is not.
 */
export const PUBLIC_POSTS = { status: "PUBLISHED" } as const satisfies Prisma.BlogPostWhereInput;

/** What a card needs. Bodies are not read to render a list of links. */
export const cardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  publishedAt: true,
  readingMinutes: true,
  isFeatured: true,
  category: { select: { slug: true, name: true, kanji: true } },
  author: { select: { displayName: true, handle: true, avatarUrl: true } },
  featuredImage: { select: { path: true, altText: true, width: true, height: true } },
} satisfies Prisma.BlogPostSelect;

export type PostCard = Prisma.BlogPostGetPayload<{ select: typeof cardSelect }>;

/**
 * A post's body, ready to render.
 *
 * The column is JSON and the database enforces nothing about its shape, so this
 * re-parses on the way out. A row could hold something written by an older
 * allowlist, or by hand, and a public page must not be the thing that discovers
 * it by throwing — the caller gets null and renders the article without its body
 * rather than a 500.
 *
 * The media lookup is resolved here too, in one query for the images this post
 * actually uses. The body names files; the renderer needs rows.
 */
export async function loadBody(
  content: Prisma.JsonValue
): Promise<{ document: PostDocument; media: MediaLookup } | null> {
  const parsed = parsePostDocument(content);
  if (!parsed.ok) {
    console.error("a published post's body did not parse", parsed.message);
    return null;
  }

  const ids = embeddedMediaIds(parsed.document);
  const media = ids.length
    ? await prisma.media.findMany({
        where: { id: { in: ids } },
        select: { id: true, path: true, altText: true, width: true, height: true },
      })
    : [];

  return {
    document: parsed.document,
    media: Object.fromEntries(
      media.map(({ id, ...rest }) => [id, rest])
    ),
  };
}

/** The date, said the one way, everywhere a post is dated. */
export function formatPostDate(value: Date | null): string {
  if (!value) return "";
  return value.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
