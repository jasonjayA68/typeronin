"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

import { Prisma, type CommentStatus } from "../../../generated/prisma/client";

/**
 * Blog category, comment and newsletter mutations.
 *
 * Every action re-checks its own permission. A Server Action is a public HTTP
 * endpoint — the page's guard protects the render, not these. There is no public
 * blog route yet, so only the admin paths are revalidated; when one lands it
 * belongs in the refresh helpers below rather than at each call site.
 */

export type ContentActionResult = { ok: true } | { ok: false; message: string };

/** More than this in one request is a script, not a moderator. */
const BULK_LIMIT = 200;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/* ------------------------------------------------------- blog categories */

const categorySchema = z.object({
  name: z.string().trim().min(2, "Give the category a name.").max(80),
  /** Blank is allowed and means "derive it from the name". */
  slug: z.string().trim().max(64),
  description: z.string().trim().max(300),
  intro: z.string().trim().max(4000),
  sort: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
});

function refreshCategories() {
  revalidatePath("/admin/blog-categories");
}

export async function createCategory(input: unknown): Promise<ContentActionResult> {
  const { user } = await requirePermission("blog:write");

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };
  }
  const data = parsed.data;

  const slug = slugify(data.slug || data.name);
  if (!slug) {
    return { ok: false, message: "That name yields no usable slug. Set one by hand." };
  }

  try {
    const created = await prisma.blogCategory.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        intro: data.intro || null,
        sort: data.sort,
        isActive: data.isActive,
      },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "blogCategory.created",
      entity: "BlogCategory",
      entityId: created.id,
      meta: { name: data.name, slug },
    });

    refreshCategories();
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: `The slug "${slug}" is already taken. Choose another.` };
    }
    console.error("createCategory failed", error);
    return { ok: false, message: "That category could not be saved." };
  }
}

export async function updateCategory(
  categoryId: string,
  input: unknown
): Promise<ContentActionResult> {
  const { user } = await requirePermission("blog:write");

  const id = z.uuid().safeParse(categoryId);
  if (!id.success) return { ok: false, message: "Unknown category." };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };
  }
  const data = parsed.data;

  const slug = slugify(data.slug || data.name);
  if (!slug) {
    return { ok: false, message: "That name yields no usable slug. Set one by hand." };
  }

  try {
    await prisma.blogCategory.update({
      where: { id: id.data },
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        intro: data.intro || null,
        sort: data.sort,
        isActive: data.isActive,
      },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "blogCategory.updated",
      entity: "BlogCategory",
      entityId: id.data,
      meta: { name: data.name, slug, isActive: data.isActive },
    });

    refreshCategories();
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: `The slug "${slug}" is already taken. Choose another.` };
    }
    console.error("updateCategory failed", error);
    return { ok: false, message: "That category could not be saved." };
  }
}

/**
 * Remove a category.
 *
 * BlogPost.categoryId is `onDelete: SetNull`, so the posts survive but land
 * uncategorised — silently, from the database's point of view. The count is
 * re-read here and the deletion refused unless the caller has acknowledged it,
 * because the dialog's warning protects the UI path only and this is reachable
 * without it.
 */
export async function deleteCategory(
  categoryId: string,
  acknowledgeOrphans = false
): Promise<ContentActionResult> {
  const { user } = await requirePermission("blog:write");

  const id = z.uuid().safeParse(categoryId);
  if (!id.success) return { ok: false, message: "Unknown category." };

  try {
    const category = await prisma.blogCategory.findUnique({
      where: { id: id.data },
      select: { name: true, slug: true, _count: { select: { posts: true } } },
    });
    if (!category) return { ok: false, message: "That category no longer exists." };

    const posts = category._count.posts;
    if (posts > 0 && !acknowledgeOrphans) {
      return {
        ok: false,
        message: `${posts} ${posts === 1 ? "post is" : "posts are"} filed here and would be left uncategorised. Confirm to continue.`,
      };
    }

    await prisma.blogCategory.delete({ where: { id: id.data }, select: { id: true } });

    await audit({
      actorId: user.id,
      action: "blogCategory.deleted",
      entity: "BlogCategory",
      entityId: id.data,
      // The orphan count is the part worth reading back later.
      meta: { name: category.name, slug: category.slug, postsUncategorised: posts },
    });

    refreshCategories();
    return { ok: true };
  } catch (error) {
    console.error("deleteCategory failed", error);
    return { ok: false, message: "That category could not be removed." };
  }
}

/* --------------------------------------------------------------- comments */

const STATUS_FOR = {
  approve: "APPROVED",
  reject: "REJECTED",
  spam: "SPAM",
} as const satisfies Record<string, CommentStatus>;

type ModerateIntent = keyof typeof STATUS_FOR | "delete";

const idsSchema = z
  .array(z.uuid())
  .min(1, "Nothing was selected.")
  .max(BULK_LIMIT, `${BULK_LIMIT} comments at a time is the limit.`);

function refreshComments() {
  revalidatePath("/admin/comments");
}

/**
 * The one code path for every moderation verb, single or bulk. The caller has
 * already proven its permission; this does the work and writes the line.
 */
async function applyIntent(
  actorId: string,
  ids: string[],
  intent: ModerateIntent
): Promise<ContentActionResult> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nothing was selected." };
  }
  const where = { id: { in: parsed.data } };

  try {
    const affected =
      intent === "delete"
        ? await prisma.comment.deleteMany({ where })
        : await prisma.comment.updateMany({ where, data: { status: STATUS_FOR[intent] } });

    if (affected.count === 0) {
      return { ok: false, message: "Those comments no longer exist." };
    }

    await audit({
      actorId,
      action: `comment.${intent}`,
      entity: "Comment",
      // A bulk action is one line naming the count, not N lines.
      entityId: parsed.data.length === 1 ? parsed.data[0] : null,
      meta: { count: affected.count },
    });

    refreshComments();
    return { ok: true };
  } catch (error) {
    console.error("applyIntent failed", intent, error);
    return { ok: false, message: "Those comments could not be changed." };
  }
}

export async function approveComment(commentId: string): Promise<ContentActionResult> {
  const { user } = await requirePermission("comments:moderate");
  return applyIntent(user.id, [commentId], "approve");
}

export async function rejectComment(commentId: string): Promise<ContentActionResult> {
  const { user } = await requirePermission("comments:moderate");
  return applyIntent(user.id, [commentId], "reject");
}

export async function markCommentSpam(commentId: string): Promise<ContentActionResult> {
  const { user } = await requirePermission("comments:moderate");
  return applyIntent(user.id, [commentId], "spam");
}

export async function deleteComment(commentId: string): Promise<ContentActionResult> {
  const { user } = await requirePermission("comments:moderate");
  return applyIntent(user.id, [commentId], "delete");
}

const bulkSchema = z.object({
  ids: idsSchema,
  intent: z.enum(["approve", "reject", "spam", "delete"]),
});

export async function bulkModerateComments(input: unknown): Promise<ContentActionResult> {
  const { user } = await requirePermission("comments:moderate");

  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nothing was selected." };
  }

  return applyIntent(user.id, parsed.data.ids, parsed.data.intent);
}

/* ------------------------------------------------------------- newsletter */

function refreshNewsletter() {
  revalidatePath("/admin/newsletter");
}

export async function unsubscribeSubscriber(subscriberId: string): Promise<ContentActionResult> {
  const { user } = await requirePermission("blog:write");

  const id = z.uuid().safeParse(subscriberId);
  if (!id.success) return { ok: false, message: "Unknown subscriber." };

  try {
    const subscriber = await prisma.newsletterSubscriber.update({
      where: { id: id.data },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
      select: { email: true },
    });

    await audit({
      actorId: user.id,
      action: "subscriber.unsubscribed",
      entity: "NewsletterSubscriber",
      entityId: id.data,
      meta: { email: subscriber.email },
    });

    refreshNewsletter();
    return { ok: true };
  } catch (error) {
    console.error("unsubscribeSubscriber failed", error);
    return { ok: false, message: "That subscriber could not be changed." };
  }
}

/**
 * Erase the row entirely, for a deletion request.
 *
 * Unsubscribing is the softer verb and the right one for most cases: it keeps
 * the address on file so a later re-import cannot mail someone who asked to be
 * left alone. This removes that record too.
 */
export async function deleteSubscriber(subscriberId: string): Promise<ContentActionResult> {
  const { user } = await requirePermission("blog:write");

  const id = z.uuid().safeParse(subscriberId);
  if (!id.success) return { ok: false, message: "Unknown subscriber." };

  try {
    const subscriber = await prisma.newsletterSubscriber.delete({
      where: { id: id.data },
      select: { email: true },
    });

    await audit({
      actorId: user.id,
      action: "subscriber.deleted",
      entity: "NewsletterSubscriber",
      entityId: id.data,
      meta: { email: subscriber.email },
    });

    refreshNewsletter();
    return { ok: true };
  } catch (error) {
    console.error("deleteSubscriber failed", error);
    return { ok: false, message: "That subscriber could not be removed." };
  }
}
