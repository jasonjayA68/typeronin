import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { DeviceToggles, PlacementToggle } from "@/features/admin/placement-toggle";
import { getAdPlacements } from "@/features/admin/queries";
import { AdminPage, Panel, StatusDot } from "@/features/admin/ui";
import { isAdSenseConfigured } from "@/features/ads/config";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

export const metadata: Metadata = {
  title: "Advertisements",
  robots: { index: false, follow: false },
};

export default async function AdvertisementsPage() {
  await requirePermission("ads:write");
  const placements = await getAdPlacements();

  const live = placements.filter((p) => p.isActive).length;

  return (
    <AdminPage
      title="Advertisements"
      description="Pages ask for a slot by name and know nothing else — not the network, not the unit, not whether it is on. Everything below is that decision."
    >
      {/* The publisher id is the one piece that is not a row, so say where it is. */}
      <div
        className={cn(
          "rounded-xl border p-5 text-sm leading-relaxed",
          isAdSenseConfigured
            ? "border-sakura/30 bg-sakura/5"
            : "border-border bg-muted/30 text-muted-foreground"
        )}
      >
        {isAdSenseConfigured ? (
          <p>
            AdSense is configured for this deployment. Slots set to AdSense with a unit id will
            serve real adverts.
          </p>
        ) : (
          <p>
            No AdSense publisher id is set for this deployment, so every slot renders the house
            placeholder and no Google script is loaded. Set{" "}
            <code className="text-foreground">NEXT_PUBLIC_ADSENSE_CLIENT_ID</code> to change that.
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="tabular text-sakura">{live}</span> of {placements.length} slots live.
      </p>

      <div className="space-y-3">
        {placements.map((placement) => (
          <section
            key={placement.id}
            className={cn(
              "min-w-0 rounded-xl border border-border bg-card/60 p-5 transition-colors",
              !placement.isActive && "border-dashed bg-transparent"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-medium">{placement.name}</h2>
                <div className="mt-1 flex items-center gap-3">
                  <code className="tabular text-xs text-muted-foreground">{placement.slug}</code>
                  <StatusDot tone={placement.isActive ? "on" : "off"}>
                    {placement.isActive ? "Live" : "Off"}
                  </StatusDot>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DeviceToggles
                  placementId={placement.id}
                  showOnDesktop={placement.showOnDesktop}
                  showOnMobile={placement.showOnMobile}
                  label={placement.name}
                />
                <PlacementToggle
                  placementId={placement.id}
                  isActive={placement.isActive}
                  label={placement.name}
                />
              </div>
            </div>

            {placement.advertisements.length ? (
              <ul className="mt-4 space-y-2 border-t border-border/60 pt-4">
                {placement.advertisements.map((ad) => (
                  <li
                    key={ad.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{ad.name}</span>
                      <Badge variant="outline" className="text-[0.6rem]">
                        {ad.provider.toLowerCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {ad.format.toLowerCase().replace("_", " ")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      {ad.frequency < 100 ? (
                        <span className="tabular">{ad.frequency}% of views</span>
                      ) : null}
                      <span className={ad.isActive ? "text-sakura" : undefined}>
                        {ad.isActive ? "booked" : "paused"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                Nothing booked. An enabled slot with no advert renders nothing at all.
              </p>
            )}
          </section>
        ))}
      </div>

      <Panel title="Not built yet" className="border-dashed bg-transparent">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          Creating and editing individual adverts from here — the server actions exist and are
          guarded, but the form does not. Booking a unit today means an insert. Rewarded and
          interstitial formats also need their player-facing flows before they can be switched on
          honestly.
        </p>
      </Panel>
    </AdminPage>
  );
}
