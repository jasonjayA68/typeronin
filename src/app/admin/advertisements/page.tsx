import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { DeviceToggles, PlacementToggle } from "@/features/admin/placement-toggle";
import { getAdPlacements } from "@/features/admin/queries";
import { AdminPage, Panel, StatusDot } from "@/features/admin/ui";
import { isAdSenseConfigured } from "@/features/ads/config";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

export const metadata: Metadata = {
  title: "Ads",
  robots: { index: false, follow: false },
};

export default async function AdvertisementsPage() {
  await requirePermission("ads:write");
  const placements = await getAdPlacements();

  const live = placements.filter((p) => p.isActive).length;

  return (
    <AdminPage
      title="Ads"
      description="Every ad position on the site, and what fills it. Turn a position on or off here, and choose whether it shows on desktop, on mobile, or both."
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
            AdSense is set up on this site. Ad positions set to AdSense with a unit id will show real
            ads.
          </p>
        ) : (
          <p>
            No AdSense account is set up on this site, so every ad position shows our own placeholder
            and no Google code is loaded. Set{" "}
            <code className="text-foreground">NEXT_PUBLIC_ADSENSE_CLIENT_ID</code> to change that.
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="tabular text-sakura">{live}</span> of {placements.length} ad positions are
        on.
      </p>

      <div className="space-y-3">
        {placements.map((placement) => (
          <section
            key={placement.id}
            className={cn(
              "min-w-0 rounded-xl border border-border bg-card p-5 transition-colors",
              !placement.isActive && "border-dashed bg-transparent"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-medium">{placement.name}</h2>
                <div className="mt-1 flex items-center gap-3">
                  <code className="tabular text-xs text-muted-foreground">{placement.slug}</code>
                  <StatusDot tone={placement.isActive ? "on" : "off"}>
                    {placement.isActive ? "On" : "Off"}
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
                Nothing booked. An ad position with nothing in it shows nothing.
              </p>
            )}
          </section>
        ))}
      </div>

      <Panel title="Not built yet" className="border-dashed bg-transparent">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          You cannot add or edit a single ad from this page yet. For now a developer must add it in
          the database. Reward and full-screen ads also need work in the game before they can be
          turned on.
        </p>
      </Panel>
    </AdminPage>
  );
}
