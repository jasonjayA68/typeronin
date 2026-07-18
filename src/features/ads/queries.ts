import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Which advert, if any, belongs in a slot.
 *
 * Every page asks by slug. Nothing on a page knows the provider, the unit id, or
 * whether advertising is switched on at all — that is the whole point of the
 * indirection, and it is what lets an operator repoint or disable a slot without
 * a deploy.
 */

export type ResolvedAd = {
  placementSlug: string;
  provider: "ADSENSE" | "HOUSE";
  format: string;
  adClientId: string | null;
  adSlotId: string | null;
  showOnDesktop: boolean;
  showOnMobile: boolean;
  frequency: number;
};

/**
 * Deduped per request, NOT cached across them.
 *
 * This was `unstable_cache` with a 60s TTL and an "ads" tag. Two problems:
 * `unstable_cache` is replaced by `use cache` in Next 16 and does not respond to
 * `updateTag` at all — so the invalidation was a silent no-op, and a slot
 * switched off kept serving for up to a minute. For a kill-switch that is the
 * wrong failure: it may be switched off precisely because something is wrong.
 *
 * Migrating to `use cache` means opting the whole app into Cache Components, so
 * that is deferred. React's `cache()` still collapses every slot on a page into
 * one query per slug, and these pages are already dynamic (they read auth
 * cookies), so a cross-request cache bought nothing anyway.
 */
const loadPlacement = cache(
  async (slug: string): Promise<ResolvedAd | null> => {
    const placement = await prisma.advertisementPlacement.findUnique({
      where: { slug },
      select: {
        slug: true,
        isActive: true,
        showOnDesktop: true,
        showOnMobile: true,
        advertisements: {
          where: {
            isActive: true,
            OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
          },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            provider: true,
            format: true,
            adClientId: true,
            adSlotId: true,
            frequency: true,
          },
        },
      },
    });

    // A disabled placement, or one with nothing booked, renders nothing at all.
    if (!placement?.isActive) return null;
    const ad = placement.advertisements[0];
    if (!ad) return null;

    return {
      placementSlug: placement.slug,
      provider: ad.provider,
      format: ad.format,
      adClientId: ad.adClientId,
      adSlotId: ad.adSlotId,
      showOnDesktop: placement.showOnDesktop,
      showOnMobile: placement.showOnMobile,
      frequency: ad.frequency,
    };
  }
);

export async function getPlacement(slug: string): Promise<ResolvedAd | null> {
  let ad: ResolvedAd | null;
  try {
    ad = await loadPlacement(slug);
  } catch (error) {
    // An advert is never worth a 500. If the lookup fails the slot stays empty
    // and the page it sits on renders exactly as it should.
    console.error(`ad placement "${slug}" failed to resolve`, error);
    return null;
  }

  if (!ad) return null;

  // Frequency capping, rolled here rather than in the component: a component
  // must be pure, and a random draw inside render is unstable across re-renders.
  // Deliberately outside the cache above, so the roll is per request rather than
  // one draw served to everyone for a minute.
  if (ad.frequency < 100 && Math.random() * 100 >= ad.frequency) return null;

  return ad;
}
