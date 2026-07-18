"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { ACCEPTED, MEDIA_KINDS } from "@/features/media/accepted";
import { mediaSelect, mediaWhere, type MediaSummary } from "@/features/media/queries";
import { MEDIA_BUCKET } from "@/features/media/url";
import { prisma } from "@/lib/prisma";
import { isAdminKeyConfigured, supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The media library's mutations.
 *
 * The bytes never pass through this server. A Server Action is capped at 1MB of
 * request body by default, which a single photograph clears without trying, and
 * raising that cap only moves the ceiling while making every upload cost us the
 * bandwidth twice. So the browser uploads straight to Supabase Storage, and this
 * module hands out the tickets that let it:
 *
 *   1. `createUploadTicket` — checks `media:write`, decides the path, mints a
 *      signed upload URL scoped to that exact path.
 *   2. the browser PUTs the file to that URL. We never see it.
 *   3. `recordUpload` — reads the object back from storage and writes the row
 *      from what storage says, not from what the browser claims.
 *
 * Step 3 is what makes step 2 safe to hand out. The ticket is a promise about
 * one path, not permission to write a row.
 */

export type MediaActionResult = { ok: true } | { ok: false; message: string };

const STORAGE_UNCONFIGURED =
  "Storage is not configured. Set SUPABASE_SECRET_KEY in .env.local and create the media bucket — see supabase/media-bucket.sql.";

function bucket() {
  return supabaseAdmin().storage.from(MEDIA_BUCKET);
}

function refreshMedia() {
  revalidatePath("/admin/media");
  // A post's featured image and its embedded images are read from these rows,
  // so an alt-text fix or a deletion has to reach the editor too.
  revalidatePath("/admin/posts");
}

function firstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

/**
 * Where an object lives: `YYYY/MM/<uuid>.<ext>`.
 *
 * The uploader's filename is deliberately not in it. A name off a stranger's
 * disk is a traversal attempt, a collision, and an information leak in one
 * string — "Q3 layoffs draft.png" should not become a public URL. The real name
 * is kept in the row, where it is data rather than structure. The date prefix is
 * for the humans who will one day open the bucket in the dashboard.
 */
function objectPath(ext: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${crypto.randomUUID()}.${ext}`;
}

/** The shape `objectPath` produces, and the only shape `recordUpload` will accept. */
const PATH_SHAPE = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

/* ----------------------------------------------------------------- search */

const searchSchema = z.object({
  q: z.string().trim().max(120),
  kind: z.enum(MEDIA_KINDS).nullable(),
});

/** One screenful. The picker is for finding a file, not for browsing the archive. */
const PICKER_LIMIT = 24;

/**
 * The picker's search.
 *
 * A read behind a Server Action rather than props from the page: the library
 * outgrows a single payload quickly, and shipping every row to the browser so a
 * dialog can filter them in memory is a bill that arrives later, on the slowest
 * connection someone has. Permission-checked like any other action — it is a
 * public endpoint whatever it returns.
 */
export async function searchMedia(
  input: unknown
): Promise<{ ok: true; media: MediaSummary[] } | { ok: false; message: string }> {
  await requirePermission("media:write");

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That search could not be run." };

  try {
    const media = await prisma.media.findMany({
      where: mediaWhere(parsed.data.q || undefined, parsed.data.kind ?? undefined),
      orderBy: { createdAt: "desc" },
      take: PICKER_LIMIT,
      select: mediaSelect,
    });

    return { ok: true, media };
  } catch (error) {
    console.error("searchMedia failed", error);
    return { ok: false, message: "The library could not be read." };
  }
}

/* ----------------------------------------------------------------- upload */

const ticketSchema = z.object({
  fileName: z.string().trim().min(1, "That file has no name.").max(200),
  mimeType: z.string().trim().min(1).max(100),
  bytes: z.number().int().positive("That file is empty."),
});

export type UploadTicket =
  | { ok: true; path: string; token: string }
  | { ok: false; message: string };

/**
 * Permission to write one object, at one path we chose.
 *
 * The size is the browser's claim and is checked here only to fail fast — the
 * bucket enforces its own ceiling, and `recordUpload` weighs the object for real.
 * Refusing a 40MB file before it is uploaded is a courtesy, not a control.
 */
export async function createUploadTicket(input: unknown): Promise<UploadTicket> {
  await requirePermission("media:write");

  if (!isAdminKeyConfigured) return { ok: false, message: STORAGE_UNCONFIGURED };

  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error, "That file cannot be uploaded.") };
  }
  const { mimeType, bytes } = parsed.data;

  const accepted = ACCEPTED[mimeType];
  if (!accepted) {
    return { ok: false, message: `${mimeType || "That file type"} is not accepted here.` };
  }
  if (bytes > accepted.limit) {
    const mb = (accepted.limit / 1_000_000).toFixed(0);
    return { ok: false, message: `That file is over the ${mb}MB limit for this type.` };
  }

  const path = objectPath(accepted.ext);

  try {
    // No upsert: the path is a fresh uuid, so a collision would mean the random
    // source is broken and silently overwriting someone's file is the last thing
    // that should happen next.
    const { data, error } = await bucket().createSignedUploadUrl(path);
    if (error || !data) {
      console.error("createUploadTicket failed", error);
      return { ok: false, message: "Storage would not accept the upload. Try again." };
    }

    return { ok: true, path: data.path, token: data.token };
  } catch (error) {
    console.error("createUploadTicket threw", error);
    return { ok: false, message: "Storage could not be reached." };
  }
}

const recordSchema = z.object({
  path: z.string().trim().max(300),
  fileName: z.string().trim().min(1, "That file has no name.").max(200),
  altText: z.string().trim().max(300),
  caption: z.string().trim().max(500),
  /** Measured by the browser. Display metadata only — nothing trusts these. */
  width: z.number().int().positive().max(30000).nullable(),
  height: z.number().int().positive().max(30000).nullable(),
});

/**
 * Write the row for an object the browser says it uploaded.
 *
 * "Says it" is the whole reason this reads the object back. `kind`, `bytes` and
 * `mimeType` come from storage's own account of what is at that path, because a
 * caller who can invoke this action can claim anything — including that the 40MB
 * video it just pushed is a 2KB PNG. Only `fileName`, `altText`, `caption` and
 * the dimensions are taken on trust, and none of those decide anything but what
 * a page renders.
 */
export async function recordUpload(input: unknown): Promise<MediaActionResult> {
  const { user } = await requirePermission("media:write");

  if (!isAdminKeyConfigured) return { ok: false, message: STORAGE_UNCONFIGURED };

  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error, "That upload could not be recorded.") };
  }
  const data = parsed.data;

  // Only paths this module mints. Anything else is not an upload we handed out.
  if (!PATH_SHAPE.test(data.path)) {
    return { ok: false, message: "That is not an upload this library issued." };
  }

  try {
    const { data: info, error } = await bucket().info(data.path);
    if (error || !info) {
      return { ok: false, message: "Storage has no file at that path. The upload did not land." };
    }

    const mimeType = info.contentType ?? "";
    const accepted = ACCEPTED[mimeType];
    if (!accepted) {
      // Storage holds something we would not have issued a ticket for. Take it
      // back out rather than leave an unaccepted object served from a public
      // bucket with no row to find it by.
      await bucket().remove([data.path]);
      return { ok: false, message: `Storage recorded that file as ${mimeType || "unknown"}, which is not accepted here.` };
    }

    const bytes = info.size ?? 0;
    if (bytes > accepted.limit) {
      await bucket().remove([data.path]);
      const mb = (accepted.limit / 1_000_000).toFixed(0);
      return { ok: false, message: `That file is over the ${mb}MB limit for this type.` };
    }

    // The schema leaves altText nullable because a PDF has nothing to describe.
    // An image without it is a real gap for a real reader, so the rule lives
    // here, at the layer that knows which kind it is.
    if (accepted.kind === "IMAGE" && !data.altText) {
      await bucket().remove([data.path]);
      return { ok: false, message: "An image needs alt text. Describe it for someone who cannot see it." };
    }

    const media = await prisma.media.create({
      data: {
        kind: accepted.kind,
        path: data.path,
        fileName: data.fileName,
        mimeType,
        bytes,
        width: data.width,
        height: data.height,
        altText: data.altText || null,
        caption: data.caption || null,
        uploadedById: user.id,
      },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "media.uploaded",
      entity: "Media",
      entityId: media.id,
      meta: { fileName: data.fileName, path: data.path, mimeType, bytes },
    });

    refreshMedia();
    return { ok: true };
  } catch (error) {
    console.error("recordUpload failed", error);
    return { ok: false, message: "That upload could not be recorded." };
  }
}

/* ------------------------------------------------------------------ edit */

const detailsSchema = z.object({
  altText: z.string().trim().max(300),
  caption: z.string().trim().max(500),
});

/** Alt text and caption. The file itself is immutable — replace it by uploading again. */
export async function updateMedia(mediaId: string, input: unknown): Promise<MediaActionResult> {
  const { user } = await requirePermission("media:write");

  const id = z.uuid().safeParse(mediaId);
  if (!id.success) return { ok: false, message: "Unknown file." };

  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error, "Check the details.") };
  }
  const data = parsed.data;

  try {
    const existing = await prisma.media.findUnique({
      where: { id: id.data },
      select: { kind: true, fileName: true },
    });
    if (!existing) return { ok: false, message: "That file no longer exists." };

    if (existing.kind === "IMAGE" && !data.altText) {
      return { ok: false, message: "An image needs alt text. Describe it for someone who cannot see it." };
    }

    await prisma.media.update({
      where: { id: id.data },
      data: { altText: data.altText || null, caption: data.caption || null },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "media.updated",
      entity: "Media",
      entityId: id.data,
      meta: { fileName: existing.fileName },
    });

    refreshMedia();
    return { ok: true };
  } catch (error) {
    console.error("updateMedia failed", error);
    return { ok: false, message: "That file could not be saved." };
  }
}

/* ---------------------------------------------------------------- delete */

/**
 * How many posts embed this file in their body.
 *
 * The editor stores an image as `{ type: "image", attrs: { mediaId } }` inside
 * `BlogPost.content`, and a JSON column carries no foreign key — so unlike a
 * featured image, nothing in the database knows this reference exists and
 * nothing would stop the delete. Scanning the column as text is crude and it is
 * a sequential scan, but files are deleted by hand and rarely, and the
 * alternative is a hole appearing mid-article that no one finds until a reader
 * does.
 */
async function embeddedIn(mediaId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count
    FROM "BlogPost"
    WHERE content::text LIKE ${`%${mediaId}%`}
  `;
  return Number(rows[0]?.count ?? 0);
}

export type MediaUsage = {
  /** Posts and categories pointing at it by column. These the database knows. */
  attached: number;
  /** Posts embedding it in their body. These it does not. */
  embedded: number;
};

/**
 * Everything that would break if this file went away.
 *
 * Read by the delete dialog to write its warning, and re-read by the action
 * itself — the dialog protects the UI path, and the action is reachable without
 * it.
 */
export async function mediaUsage(mediaId: string): Promise<MediaUsage> {
  await requirePermission("media:write");

  const id = z.uuid().safeParse(mediaId);
  if (!id.success) return { attached: 0, embedded: 0 };

  const media = await prisma.media.findUnique({
    where: { id: id.data },
    select: {
      _count: { select: { featuredFor: true, ogFor: true, categoryOgFor: true } },
    },
  });
  if (!media) return { attached: 0, embedded: 0 };

  return {
    attached: media._count.featuredFor + media._count.ogFor + media._count.categoryOgFor,
    embedded: await embeddedIn(id.data),
  };
}

/**
 * Remove the object and its row.
 *
 * The object goes first. If storage succeeds and the row delete then fails, the
 * library shows an entry whose image is gone — visibly wrong, and fixable by
 * pressing delete again. The other order fails the other way: the row goes, the
 * object stays, and the bucket quietly accrues files nothing references and no
 * page can reach. A visible fault beats an invisible leak.
 */
export async function deleteMedia(
  mediaId: string,
  acknowledgeUsage = false
): Promise<MediaActionResult> {
  const { user } = await requirePermission("media:write");

  if (!isAdminKeyConfigured) return { ok: false, message: STORAGE_UNCONFIGURED };

  const id = z.uuid().safeParse(mediaId);
  if (!id.success) return { ok: false, message: "Unknown file." };

  try {
    const media = await prisma.media.findUnique({
      where: { id: id.data },
      select: { path: true, fileName: true },
    });
    if (!media) return { ok: false, message: "That file no longer exists." };

    const usage = await mediaUsage(id.data);
    const uses = usage.attached + usage.embedded;
    if (uses > 0 && !acknowledgeUsage) {
      return {
        ok: false,
        message: `${uses} ${uses === 1 ? "post or category uses" : "posts or categories use"} this file. Confirm to continue.`,
      };
    }

    const { error } = await bucket().remove([media.path]);
    if (error) {
      console.error("deleteMedia storage remove failed", error);
      return { ok: false, message: "Storage would not release that file. Nothing was removed." };
    }

    await prisma.media.delete({ where: { id: id.data }, select: { id: true } });

    await audit({
      actorId: user.id,
      action: "media.deleted",
      entity: "Media",
      entityId: id.data,
      // The usage counts are the part worth reading back when a post breaks.
      meta: {
        fileName: media.fileName,
        path: media.path,
        attachedTo: usage.attached,
        embeddedIn: usage.embedded,
      },
    });

    refreshMedia();
    return { ok: true };
  } catch (error) {
    console.error("deleteMedia failed", error);
    return { ok: false, message: "That file could not be removed." };
  }
}
