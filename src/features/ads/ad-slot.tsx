import { cn } from "@/lib/utils";
import { AdSenseUnit } from "@/features/ads/adsense-unit";
import { ADSENSE_CLIENT_ID } from "@/features/ads/config";
import { getPlacement } from "@/features/ads/queries";

/**
 * An advertising slot.
 *
 * Usage is always `<AdSlot placement="in-content" />`. The page names a slot and
 * nothing else — no provider, no unit id, no switch. Whether anything renders is
 * decided by database rows an admin controls.
 *
 * Renders nothing when the placement is off, unbooked, or unresolvable, so
 * "advertising disabled" costs exactly zero markup rather than an empty box.
 */

/** Reserved heights, so a filling advert cannot shove the page down (CLS). */
const HEIGHTS: Record<string, string> = {
  BANNER: "min-h-[90px]",
  IN_ARTICLE: "min-h-[250px]",
  RESPONSIVE: "min-h-[250px]",
  REWARDED: "min-h-0",
  INTERSTITIAL: "min-h-0",
};

export async function AdSlot({
  placement,
  className,
}: {
  placement: string;
  className?: string;
}) {
  // Resolves the slot AND applies frequency capping — see queries.ts. This
  // component stays pure.
  const ad = await getPlacement(placement);
  if (!ad) return null;

  // Device targeting via CSS. An <ins> inside display:none is simply not filled
  // by AdSense — it reports unfilled rather than a phantom impression — which is
  // why hiding is safe here and counting a hidden impression would not be.
  const device = cn(
    !ad.showOnDesktop && "md:hidden",
    !ad.showOnMobile && "hidden md:block",
    ad.showOnDesktop && ad.showOnMobile && "block"
  );

  const usable =
    ad.provider === "ADSENSE" && (ad.adClientId ?? ADSENSE_CLIENT_ID) && ad.adSlotId;

  return (
    <aside
      // Announced, and skippable. A screen-reader user should know what this is
      // and be able to move past it.
      aria-label="Advertisement"
      className={cn("mx-auto w-full max-w-3xl", HEIGHTS[ad.format] ?? "min-h-0", device, className)}
    >
      {usable ? (
        <AdSenseUnit
          clientId={(ad.adClientId ?? ADSENSE_CLIENT_ID)!}
          slotId={ad.adSlotId!}
          responsive={ad.format === "RESPONSIVE" || ad.format === "IN_ARTICLE"}
        />
      ) : (
        <HousePlaceholder placement={ad.placementSlug} />
      )}
    </aside>
  );
}

/**
 * What a HOUSE ad renders, and what an AdSense slot falls back to when its unit
 * id is missing. Labelled honestly rather than dressed as content: a box
 * pretending to be an advert on a live site is how policy strikes happen.
 */
function HousePlaceholder({ placement }: { placement: string }) {
  return (
    <div className="grid h-full min-h-[inherit] place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
      <div>
        <p className="font-heading text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
          Advertisement
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This space funds the dojo. It stays free.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="tabular mt-1 text-[0.65rem] text-muted-foreground/70">{placement}</p>
        ) : null}
      </div>
    </div>
  );
}
