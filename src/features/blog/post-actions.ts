"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import {
  embeddedMediaIds,
  parsePostDocument,
  toPlainText,
  toReadingMinutes,
} from "@/features/blog/document";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

import { Prisma, type PostStatus } from "../../../generated/prisma/client";

/**
 * Post mutations.
 *
 * The permission split here is the seed's, honoured rather than reinvented:
 * `blog:write` creates and edits, `blog:publish` decides what the world sees.
 * That is why saving and publishing are different actions instead of one action
 * with a status field — a writer who could set `status: "PUBLISHED"` in the same
 * call that saves their draft would hold `blog:publish` in all but name, and the
 * roles table would be describing something that is not true.
 *
 * Every action re-checks its own permission: a Server Action is a public HTTP
 * endpoint, and the page's guard protects the render, not these.
 */

export type PostActionResult = { ok: true } | { ok: false; message: string };
export type PostCreated = { ok: true; id: string } | { ok: false; message: string };

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function firstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

function refreshPosts(id?: string) {
  revalidatePath("/admin/posts");
  if (id) revalidatePath(`/admin/posts/${id}`);
}

/* ---------------------------------------------------------------- schema */

const draftSchema = z.object({
  title: z.string().trim().min(3, "Give the post a title.").max(160),
  /** Blank means "derive it from the title". */
  slug: z.string().trim().max(64),
  excerpt: z.string().trim().max(300),
  /** Shape-checked by parsePostDocument, not here — see features/blog/document.ts. */
  content: z.unknown(),
  /** "" means uncategorised. */
  categoryId: z.string().trim(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10, "Ten tags is plenty."),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(200),
  canonicalUrl: z.string().trim().max(300),
  featuredImageId: z.string().trim(),
  ogImageId: z.string().trim(),
});

type Draft = z.infer<typeof draftSchema>;

/** "" or a uuid. The forms send "" for "none", which `z.uuid()` will not take. */
function optionalId(value: string): string | null {
  return value && z.uuid().safeParse(value).success ? value : null;
}

/**
 * A canonical URL is a claim about where a page really lives, handed to search
 * engines. `javascript:` in one is not a threat the way an href is — nothing
 * clicks it — but a canonical pointing anywhere but http(s) is meaningless, and
 * the field is a public endpoint's input like any other.
 */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Everything that has to be true about a draft before it can be a row.
 *
 * Shared by create and update so the two cannot drift — the failure mode being
 * an editor that lets you save something on edit that it would have refused on
 * create.
 */
async function resolve(
  data: Draft
): Promise<
  | { ok: false; message: string }
  | {
      ok: true;
      slug: string;
      content: Prisma.InputJsonValue;
      plainText: string;
      readingMinutes: number;
      categoryId: string | null;
      featuredImageId: string | null;
      ogImageId: string | null;
      tagIds: string[];
    }
> {
  const slug = slugify(data.slug || data.title);
  if (!slug) {
    return { ok: false, message: "That title yields no usable slug. Set one by hand." };
  }

  if (data.canonicalUrl && !isHttpUrl(data.canonicalUrl)) {
    return { ok: false, message: "A canonical URL must be a full http or https address." };
  }

  // The gate. Whatever comes back is what gets stored — never the input.
  const parsed = parsePostDocument(data.content);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const plainText = toPlainText(parsed.document);

  const categoryId = optionalId(data.categoryId);
  if (categoryId) {
    const exists = await prisma.blogCategory.count({ where: { id: categoryId } });
    if (!exists) return { ok: false, message: "That category no longer exists." };
  }

  /**
   * Every image the post points at must be a real row, and must be an image.
   *
   * The body references media by id through a JSON column, which carries no
   * foreign key — so nothing else in the stack will ever check this. Refusing a
   * dangling id at write time is the only moment it costs one error message
   * instead of a hole in a published article.
   */
  const featuredImageId = optionalId(data.featuredImageId);
  const ogImageId = optionalId(data.ogImageId);
  const referenced = [
    ...new Set([...embeddedMediaIds(parsed.document), featuredImageId, ogImageId].filter(Boolean)),
  ] as string[];

  if (referenced.length > 0) {
    const found = await prisma.media.findMany({
      where: { id: { in: referenced } },
      select: { id: true, kind: true },
    });

    const byId = new Map(found.map((media) => [media.id, media]));
    const missing = referenced.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      return {
        ok: false,
        message: `${missing.length === 1 ? "An image" : `${missing.length} images`} in this post ${missing.length === 1 ? "is" : "are"} no longer in the library. Remove or replace ${missing.length === 1 ? "it" : "them"}.`,
      };
    }

    for (const id of [featuredImageId, ogImageId].filter(Boolean) as string[]) {
      if (byId.get(id)?.kind !== "IMAGE") {
        return { ok: false, message: "A featured or social image must be an image." };
      }
    }
  }

  /**
   * Tags are found or made, by slug.
   *
   * A tag is a page with a URL — that is why BlogTag is a table where Word.tags is
   * a string array — so "Kata" and "kata" must be the same tag rather than two
   * pages competing for one topic. Created here rather than in the editor because
   * a tag with no post on it is litter.
   */
  const tagIds: string[] = [];
  for (const name of new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))) {
    const tagSlug = slugify(name);
    if (!tagSlug) continue;

    const tag = await prisma.blogTag.upsert({
      where: { slug: tagSlug },
      // An existing tag keeps the name it was created with. Re-typing a tag with
      // different capitalisation should not rename it everywhere it is used.
      update: {},
      create: { slug: tagSlug, name },
      select: { id: true },
    });
    tagIds.push(tag.id);
  }

  return {
    ok: true,
    slug,
    content: parsed.document as unknown as Prisma.InputJsonValue,
    plainText,
    readingMinutes: toReadingMinutes(plainText),
    categoryId,
    featuredImageId,
    ogImageId,
    tagIds,
  };
}

/** The columns a draft owns. Status and its dates are not among them, on purpose. */
function columns(data: Draft, resolved: Extract<Awaited<ReturnType<typeof resolve>>, { ok: true }>) {
  return {
    title: data.title,
    slug: resolved.slug,
    excerpt: data.excerpt || null,
    content: resolved.content,
    plainText: resolved.plainText,
    readingMinutes: resolved.readingMinutes,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    canonicalUrl: data.canonicalUrl || null,
    categoryId: resolved.categoryId,
    featuredImageId: resolved.featuredImageId,
    ogImageId: resolved.ogImageId,
  };
}

/* ---------------------------------------------------------------- create */

export async function createPost(input: unknown): Promise<PostCreated> {
  const { user } = await requirePermission("blog:write");

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error, "Check the details.") };
  }

  const resolved = await resolve(parsed.data);
  if (!resolved.ok) return resolved;

  try {
    const post = await prisma.blogPost.create({
      data: {
        ...columns(parsed.data, resolved),
        // Always. Publishing is a different action and a different permission.
        status: "DRAFT",
        authorId: user.id,
        tags: { create: resolved.tagIds.map((tagId) => ({ tagId })) },
      },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "post.created",
      entity: "BlogPost",
      entityId: post.id,
      meta: { title: parsed.data.title, slug: resolved.slug },
    });

    refreshPosts();
    return { ok: true, id: post.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: `The slug "${resolved.slug}" is taken. Choose another.` };
    }
    console.error("createPost failed", error);
    return { ok: false, message: "That post could not be saved." };
  }
}

/* ---------------------------------------------------------------- update */

export async function updatePost(postId: string, input: unknown): Promise<PostActionResult> {
  const { user } = await requirePermission("blog:write");

  const id = z.uuid().safeParse(postId);
  if (!id.success) return { ok: false, message: "Unknown post." };

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error, "Check the details.") };
  }

  const resolved = await resolve(parsed.data);
  if (!resolved.ok) return resolved;

  try {
    const existing = await prisma.blogPost.findUnique({
      where: { id: id.data },
      select: { slug: true, status: true },
    });
    if (!existing) return { ok: false, message: "That post no longer exists." };

    await prisma.blogPost.update({
      where: { id: id.data },
      data: {
        ...columns(parsed.data, resolved),
        // Replace rather than merge: the editor sends the whole set, and a tag
        // removed there must actually come off.
        tags: {
          deleteMany: {},
          create: resolved.tagIds.map((tagId) => ({ tagId })),
        },
      },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "post.updated",
      entity: "BlogPost",
      entityId: id.data,
      meta: {
        title: parsed.data.title,
        slug: resolved.slug,
        // Worth a line of its own: editing a live post's slug breaks every link
        // to it that exists in the world.
        ...(existing.slug !== resolved.slug
          ? { slugChangedFrom: existing.slug, wasLive: existing.status === "PUBLISHED" }
          : {}),
      },
    });

    refreshPosts(id.data);
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: `The slug "${resolved.slug}" is taken. Choose another.` };
    }
    console.error("updatePost failed", error);
    return { ok: false, message: "That post could not be saved." };
  }
}

/* --------------------------------------------------------------- publish */

const statusSchema = z
  .object({
    status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
    /** ISO, and only meaningful for SCHEDULED. */
    scheduledFor: z.string().trim().max(40),
  })
  .refine((value) => value.status !== "SCHEDULED" || Boolean(value.scheduledFor), {
    message: "A scheduled post needs a date to go out on.",
    path: ["scheduledFor"],
  });

/**
 * Move a post between states.
 *
 * `blog:publish`, not `blog:write` — this is the action that decides what the
 * world can read.
 */
export async function setPostStatus(postId: string, input: unknown): Promise<PostActionResult> {
  const { user } = await requirePermission("blog:publish");

  const id = z.uuid().safeParse(postId);
  if (!id.success) return { ok: false, message: "Unknown post." };

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error, "That state is not available.") };
  }
  const { status } = parsed.data;

  let scheduledFor: Date | null = null;
  if (status === "SCHEDULED") {
    const when = new Date(parsed.data.scheduledFor);
    if (Number.isNaN(when.getTime())) {
      return { ok: false, message: "That is not a date." };
    }
    if (when.getTime() <= Date.now()) {
      // Otherwise the post sits in SCHEDULED looking like it is about to go out,
      // and the publisher job — which compares against this — has already passed
      // the moment. It would never run. Silence, forever.
      return { ok: false, message: "That moment has passed. Schedule it later, or publish it now." };
    }
    scheduledFor = when;
  }

  try {
    const existing = await prisma.blogPost.findUnique({
      where: { id: id.data },
      select: { title: true, status: true, publishedAt: true, content: true },
    });
    if (!existing) return { ok: false, message: "That post no longer exists." };

    /**
     * A post going out is re-validated on the way.
     *
     * Its body was checked when it was saved — but by an older version of the
     * allowlist, possibly months ago. Publishing is the moment the document
     * stops being one person's draft and becomes a page, so it is worth the one
     * parse to know it still satisfies the rules as they stand today.
     */
    if (status === "PUBLISHED" || status === "SCHEDULED") {
      const document = parsePostDocument(existing.content);
      if (!document.ok) {
        return { ok: false, message: `This post cannot go out as it stands: ${document.message}` };
      }
    }

    const post = await prisma.blogPost.update({
      where: { id: id.data },
      data: {
        status: status as PostStatus,
        scheduledFor,
        // Stamped once and kept. Re-publishing something that was pulled should
        // not move its date — the article is from when it is from, and an
        // archive that quietly re-dates itself cannot be cited.
        publishedAt:
          status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: `post.${status.toLowerCase()}`,
      entity: "BlogPost",
      entityId: post.id,
      meta: {
        title: existing.title,
        from: existing.status,
        ...(scheduledFor ? { scheduledFor: scheduledFor.toISOString() } : {}),
      },
    });

    refreshPosts(id.data);
    return { ok: true };
  } catch (error) {
    console.error("setPostStatus failed", error);
    return { ok: false, message: "That post could not be changed." };
  }
}

const flagsSchema = z.object({
  isFeatured: z.boolean(),
  isTrending: z.boolean(),
});

/** Featuring is an editorial decision about the front page, so it rides with publish. */
export async function setPostFlags(postId: string, input: unknown): Promise<PostActionResult> {
  const { user } = await requirePermission("blog:publish");

  const id = z.uuid().safeParse(postId);
  if (!id.success) return { ok: false, message: "Unknown post." };

  const parsed = flagsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the details." };

  try {
    const post = await prisma.blogPost.update({
      where: { id: id.data },
      data: parsed.data,
      select: { title: true },
    });

    await audit({
      actorId: user.id,
      action: "post.flagged",
      entity: "BlogPost",
      entityId: id.data,
      meta: { title: post.title, ...parsed.data },
    });

    refreshPosts(id.data);
    return { ok: true };
  } catch (error) {
    console.error("setPostFlags failed", error);
    return { ok: false, message: "That post could not be changed." };
  }
}

/* ---------------------------------------------------------------- delete */

/**
 * Erase a post.
 *
 * Archiving is the softer verb and the right one nearly always: it takes the post
 * off the blog and keeps the writing. This drops the row, and its comments with
 * it — Comment.postId is `onDelete: Cascade`, so a conversation a reader had here
 * goes too. That is the part the dialog has to say out loud, and the reason the
 * count is read back here rather than trusted from the UI that showed it.
 */
export async function deletePost(
  postId: string,
  acknowledgeComments = false
): Promise<PostActionResult> {
  const { user } = await requirePermission("blog:publish");

  const id = z.uuid().safeParse(postId);
  if (!id.success) return { ok: false, message: "Unknown post." };

  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: id.data },
      select: { title: true, slug: true, status: true, _count: { select: { comments: true } } },
    });
    if (!post) return { ok: false, message: "That post no longer exists." };

    const comments = post._count.comments;
    if (comments > 0 && !acknowledgeComments) {
      return {
        ok: false,
        message: `${comments} ${comments === 1 ? "comment" : "comments"} would be deleted with it. Confirm to continue.`,
      };
    }

    await prisma.blogPost.delete({ where: { id: id.data }, select: { id: true } });

    await audit({
      actorId: user.id,
      action: "post.deleted",
      entity: "BlogPost",
      entityId: id.data,
      meta: {
        title: post.title,
        slug: post.slug,
        wasStatus: post.status,
        commentsDeleted: comments,
      },
    });

    refreshPosts();
    return { ok: true };
  } catch (error) {
    console.error("deletePost failed", error);
    return { ok: false, message: "That post could not be removed." };
  }
}
