"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  QR_MAX_BYTES,
  QR_MIME_TYPES,
  payoutMethodSchema,
  refLooksValid,
} from "@/features/withdrawals/payout-methods";
import { PAYOUT_METHOD_INFO, type PayoutMethodValue } from "@/features/withdrawals/model";
import { MEDIA_BUCKET } from "@/features/media/url";
import { ensureProfile } from "@/features/profile/service";
import { prisma } from "@/lib/prisma";
import { isAdminKeyConfigured, supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

/**
 * Saved payout methods — a user managing their own reusable payout destinations.
 *
 * Every action re-authenticates from the verified session and scopes every write
 * to the caller's own rows: a Server Action is a public endpoint, so ownership is
 * established here, never trusted from an argument. A `where` on both the row id
 * AND the profile id means a crafted id cannot touch someone else's method.
 *
 * The optional QR image is stored in the public `media` bucket under
 * payout-qr/<profileId>/, mirroring how avatars are stored — the service-role
 * write is gated by the getUser() check above it.
 */

export type PayoutMethodResult = { ok: true; message?: string } | { ok: false; message: string };

const QR_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function refresh() {
  revalidatePath("/dashboard");
}

/** Upload a QR image for a method, returning its public URL (or an error). */
async function uploadQr(
  profileId: string,
  methodId: string,
  file: File
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!isAdminKeyConfigured) {
    return { ok: false, message: "Photo storage is not set up on this deployment." };
  }
  if (!(QR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: "Use a JPEG, PNG, or WebP image for the QR." };
  }
  if (file.size > QR_MAX_BYTES) {
    return { ok: false, message: "That QR image is too large. Try a smaller one." };
  }

  const storage = supabaseAdmin().storage.from(MEDIA_BUCKET);
  const folder = `payout-qr/${profileId}/${methodId}`;

  // Clear any previous QR for this method so nothing is orphaned.
  const { data: existing } = await storage.list(folder);
  if (existing && existing.length > 0) {
    await storage.remove(existing.map((o) => `${folder}/${o.name}`));
  }

  const ext = QR_EXT[file.type] ?? "png";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await storage.upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) {
    console.error("uploadQr storage error", error);
    return { ok: false, message: "The QR image could not be uploaded." };
  }
  return { ok: true, url: storage.getPublicUrl(path).data.publicUrl };
}

/** Remove all stored QR objects for a method (best-effort). */
async function removeQrObjects(profileId: string, methodId: string) {
  if (!isAdminKeyConfigured) return;
  const storage = supabaseAdmin().storage.from(MEDIA_BUCKET);
  const folder = `payout-qr/${profileId}/${methodId}`;
  const { data: existing } = await storage.list(folder);
  if (existing && existing.length > 0) {
    await storage.remove(existing.map((o) => `${folder}/${o.name}`));
  }
}

/**
 * Create or update a saved payout method, with an optional QR image.
 *
 * FormData rather than a plain object because it may carry a file. `id` present
 * means update; absent means create. `makeDefault` sets this as the prefilled
 * default and clears the flag on every other method, in one transaction.
 */
export async function savePayoutMethod(formData: FormData): Promise<PayoutMethodResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };

  const parsed = payoutMethodSchema.safeParse({
    method: formData.get("method"),
    accountName: formData.get("accountName"),
    accountRef: formData.get("accountRef"),
    details: formData.get("details") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };
  }
  const data = parsed.data;

  if (!refLooksValid(data.method, data.accountRef)) {
    return {
      ok: false,
      message: `Enter a valid ${PAYOUT_METHOD_INFO[data.method as PayoutMethodValue].label} destination.`,
    };
  }

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" && idRaw ? idRaw : null;
  const makeDefault = formData.get("makeDefault") === "true";
  const qr = formData.get("qr");
  const hasQr = qr instanceof File && qr.size > 0;

  try {
    const profile = await ensureProfile(user);

    // The row first (so we have an id for the QR path), then the QR, then a final
    // update with the URL — all scoped to this user.
    let methodId = id;
    if (id) {
      const owned = await prisma.savedPayoutMethod.updateMany({
        where: { id, profileId: profile.id },
        data: {
          method: data.method,
          accountName: data.accountName,
          accountRef: data.accountRef,
          details: data.details || null,
        },
      });
      if (owned.count === 0) return { ok: false, message: "That payout method was not found." };
    } else {
      const created = await prisma.savedPayoutMethod.create({
        data: {
          profileId: profile.id,
          method: data.method,
          accountName: data.accountName,
          accountRef: data.accountRef,
          details: data.details || null,
        },
        select: { id: true },
      });
      methodId = created.id;
    }

    if (hasQr && methodId) {
      const uploaded = await uploadQr(profile.id, methodId, qr);
      if (!uploaded.ok) return uploaded;
      await prisma.savedPayoutMethod.updateMany({
        where: { id: methodId, profileId: profile.id },
        data: { qrUrl: uploaded.url },
      });
    }

    if (makeDefault && methodId) {
      await prisma.$transaction([
        prisma.savedPayoutMethod.updateMany({
          where: { profileId: profile.id, id: { not: methodId } },
          data: { isDefault: false },
        }),
        prisma.savedPayoutMethod.updateMany({
          where: { id: methodId, profileId: profile.id },
          data: { isDefault: true },
        }),
      ]);
    }

    refresh();
    return { ok: true, message: id ? "Payout method updated." : "Payout method saved." };
  } catch (error) {
    console.error("savePayoutMethod failed", error);
    return { ok: false, message: "That payout method could not be saved." };
  }
}

export async function deletePayoutMethod(id: unknown): Promise<PayoutMethodResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };

  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Unknown payout method." };

  try {
    const profile = await ensureProfile(user);
    const deleted = await prisma.savedPayoutMethod.deleteMany({
      where: { id: parsed.data, profileId: profile.id },
    });
    if (deleted.count === 0) return { ok: false, message: "That payout method was not found." };

    await removeQrObjects(profile.id, parsed.data);
    refresh();
    return { ok: true, message: "Payout method removed." };
  } catch (error) {
    console.error("deletePayoutMethod failed", error);
    return { ok: false, message: "That payout method could not be removed." };
  }
}

export async function setDefaultPayoutMethod(id: unknown): Promise<PayoutMethodResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };

  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Unknown payout method." };

  try {
    const profile = await ensureProfile(user);
    const owned = await prisma.savedPayoutMethod.findFirst({
      where: { id: parsed.data, profileId: profile.id },
      select: { id: true },
    });
    if (!owned) return { ok: false, message: "That payout method was not found." };

    await prisma.$transaction([
      prisma.savedPayoutMethod.updateMany({
        where: { profileId: profile.id, id: { not: parsed.data } },
        data: { isDefault: false },
      }),
      prisma.savedPayoutMethod.updateMany({
        where: { id: parsed.data, profileId: profile.id },
        data: { isDefault: true },
      }),
    ]);
    refresh();
    return { ok: true, message: "Default updated." };
  } catch (error) {
    console.error("setDefaultPayoutMethod failed", error);
    return { ok: false, message: "The default could not be set." };
  }
}
