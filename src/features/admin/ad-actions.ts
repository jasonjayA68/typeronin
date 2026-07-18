"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

/**
 * Advertising mutations.
 *
 * Each one re-checks the permission. A Server Action is a public endpoint — the
 * page's guard protects the render, not these.
 *
 * Placements are no longer cached across requests (see features/ads/queries.ts),
 * so a switch takes effect on the very next render with nothing to invalidate.
 */

export type AdActionResult = { ok: true } | { ok: false; message: string };

function refresh() {
  revalidatePath("/admin/advertisements");
  // Drops the client router cache, so a slot toggled here is gone the moment the
  // visitor navigates rather than when their cached shell expires.
  revalidatePath("/", "layout");
}

export async function setPlacementActive(placementId: string, isActive: boolean): Promise<AdActionResult> {
  const { user } = await requirePermission("ads:write");

  const parsed = z.uuid().safeParse(placementId);
  if (!parsed.success) return { ok: false, message: "Unknown placement." };

  try {
    const placement = await prisma.advertisementPlacement.update({
      where: { id: parsed.data },
      data: { isActive },
      select: { slug: true },
    });

    await audit({
      actorId: user.id,
      action: isActive ? "placement.enabled" : "placement.disabled",
      entity: "AdvertisementPlacement",
      entityId: parsed.data,
      meta: { slug: placement.slug },
    });

    refresh();
    return { ok: true };
  } catch (error) {
    console.error("setPlacementActive failed", error);
    return { ok: false, message: "That placement could not be changed." };
  }
}

export async function setPlacementDevices(
  placementId: string,
  devices: { showOnDesktop: boolean; showOnMobile: boolean }
): Promise<AdActionResult> {
  const { user } = await requirePermission("ads:write");

  const parsed = z.uuid().safeParse(placementId);
  if (!parsed.success) return { ok: false, message: "Unknown placement." };

  try {
    const placement = await prisma.advertisementPlacement.update({
      where: { id: parsed.data },
      data: devices,
      select: { slug: true },
    });

    await audit({
      actorId: user.id,
      action: "placement.devices",
      entity: "AdvertisementPlacement",
      entityId: parsed.data,
      meta: { slug: placement.slug, ...devices },
    });

    refresh();
    return { ok: true };
  } catch (error) {
    console.error("setPlacementDevices failed", error);
    return { ok: false, message: "That placement could not be changed." };
  }
}

const adSchema = z.object({
  placementId: z.uuid(),
  name: z.string().trim().min(2, "Give it a name.").max(80),
  provider: z.enum(["ADSENSE", "HOUSE"]),
  format: z.enum(["BANNER", "IN_ARTICLE", "RESPONSIVE", "REWARDED", "INTERSTITIAL"]),
  /** AdSense slot id: digits, as the dashboard shows them. */
  adSlotId: z
    .string()
    .trim()
    .regex(/^\d{6,20}$/, "An AdSense slot id is a number.")
    .nullable(),
  adClientId: z
    .string()
    .trim()
    .regex(/^ca-pub-\d{10,20}$/, 'A publisher id looks like "ca-pub-0000000000000000".')
    .nullable(),
  frequency: z.coerce.number().int().min(1).max(100),
  isActive: z.boolean(),
});

export async function upsertAdvertisement(
  adId: string | null,
  input: unknown
): Promise<AdActionResult> {
  const { user } = await requirePermission("ads:write");

  const parsed = adSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };
  }
  const data = parsed.data;

  // An AdSense unit with no slot id renders the house placeholder instead of an
  // advert, which looks like a bug. Refuse it at the door.
  if (data.provider === "ADSENSE" && !data.adSlotId) {
    return { ok: false, message: "An AdSense unit needs a slot id." };
  }

  try {
    const saved = adId
      ? await prisma.advertisement.update({ where: { id: adId }, data, select: { id: true } })
      : await prisma.advertisement.create({ data, select: { id: true } });

    await audit({
      actorId: user.id,
      action: adId ? "ad.updated" : "ad.created",
      entity: "Advertisement",
      entityId: saved.id,
      // The slot id is not a secret, but it is not useful in a log either.
      meta: { name: data.name, provider: data.provider, isActive: data.isActive },
    });

    refresh();
    return { ok: true };
  } catch (error) {
    console.error("upsertAdvertisement failed", error);
    return { ok: false, message: "That advert could not be saved." };
  }
}

export async function deleteAdvertisement(adId: string): Promise<AdActionResult> {
  const { user } = await requirePermission("ads:write");

  const parsed = z.uuid().safeParse(adId);
  if (!parsed.success) return { ok: false, message: "Unknown advert." };

  try {
    const ad = await prisma.advertisement.delete({
      where: { id: parsed.data },
      select: { name: true },
    });
    await audit({
      actorId: user.id,
      action: "ad.deleted",
      entity: "Advertisement",
      entityId: parsed.data,
      meta: { name: ad.name },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("deleteAdvertisement failed", error);
    return { ok: false, message: "That advert could not be removed." };
  }
}
