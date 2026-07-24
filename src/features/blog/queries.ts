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

/* ------------------------------------------------------------- navigation */

export type NavCategory = { slug: string; name: string };

/**
 * The content pillars, as the header renders them.
 *
 * The fallback, and the answer whenever the database cannot give a better one.
 * These are the three the seed creates; an unseeded clone and an unreachable
 * database therefore both get a working nav rather than an empty one.
 */
const FALLBACK_NAV_CATEGORIES: readonly NavCategory[] = [
  { slug: "freelancing", name: "Freelancing" },
  { slug: "work-from-home", name: "Work From Home" },
  { slug: "make-money-online", name: "Make Money Online" },
];

/**
 * How many pillars the header will carry. The nav is a row of links, not a
 * directory — past this it wraps and stops being navigation. Anything further
 * down `sort` lives on /blog, which lists them all.
 */
const NAV_CATEGORY_LIMIT = 4;

/**
 * The categories the site header links to.
 *
 * Read from the database rather than written into the component, because a
 * category is a row an admin edits: renaming one, or switching it off, must not
 * leave a link in the header pointing at a page that 404s.
 *
 * Resilient in the same way the economy and play-limit readers are — this runs
 * in the header, on every page, so a database blip must degrade the nav rather
 * than take the site down with it. An empty result falls back too: a fresh
 * clone that has not been seeded gets the pillars rather than a bare header.
 */
export async function getNavCategories(): Promise<readonly NavCategory[]> {
  try {
    const rows = await prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      take: NAV_CATEGORY_LIMIT,
      select: { slug: true, name: true },
    });
    return rows.length > 0 ? rows : FALLBACK_NAV_CATEGORIES;
  } catch (error) {
    console.error("getNavCategories failed; using the built-in pillars", error);
    return FALLBACK_NAV_CATEGORIES;
  }
}

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
