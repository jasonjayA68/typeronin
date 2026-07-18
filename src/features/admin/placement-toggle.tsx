"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setPlacementActive, setPlacementDevices } from "@/features/admin/ad-actions";
import { cn } from "@/lib/utils";

/**
 * The live switch for a placement.
 *
 * Optimistic on the label only — the real state comes back from the server, and
 * a failure snaps it back and says why. An ad switch that lies about being off
 * is a policy problem, not a UI nit.
 */
export function PlacementToggle({
  placementId,
  isActive,
  label,
}: {
  placementId: string;
  isActive: boolean;
  label: string;
}) {
  const [on, setOn] = useState(isActive);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${on ? "Disable" : "Enable"} ${label}`}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        startTransition(async () => {
          const result = await setPlacementActive(placementId, next);
          if (!result.ok) {
            setOn(!next);
            toast.error(result.message);
            return;
          }
          toast.success(next ? `${label} is live` : `${label} is off`);
        });
      }}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
        on ? "bg-sakura" : "bg-border"
      )}
    >
      <span
        className={cn(
          "grid size-4 place-items-center rounded-full bg-background transition-transform",
          on ? "translate-x-4.5" : "translate-x-0.5"
        )}
      >
        {pending ? (
          <LoaderCircleIcon aria-hidden="true" className="size-2.5 animate-spin text-sakura" />
        ) : null}
      </span>
    </button>
  );
}

/** Desktop / mobile targeting for a placement. */
export function DeviceToggles({
  placementId,
  showOnDesktop,
  showOnMobile,
  label,
}: {
  placementId: string;
  showOnDesktop: boolean;
  showOnMobile: boolean;
  label: string;
}) {
  const [devices, setDevices] = useState({ showOnDesktop, showOnMobile });
  const [pending, startTransition] = useTransition();

  const update = (next: { showOnDesktop: boolean; showOnMobile: boolean }) => {
    // A slot on neither device is just a disabled slot wearing a disguise.
    if (!next.showOnDesktop && !next.showOnMobile) {
      toast.error("A slot must show somewhere. Disable it instead.");
      return;
    }
    const previous = devices;
    setDevices(next);
    startTransition(async () => {
      const result = await setPlacementDevices(placementId, next);
      if (!result.ok) {
        setDevices(previous);
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="flex gap-1">
      {(
        [
          ["showOnDesktop", "Desktop"],
          ["showOnMobile", "Mobile"],
        ] as const
      ).map(([key, name]) => (
        <button
          key={key}
          type="button"
          disabled={pending}
          aria-pressed={devices[key]}
          aria-label={`${name} for ${label}`}
          onClick={() => update({ ...devices, [key]: !devices[key] })}
          className={cn(
            "rounded-md border px-1.5 py-0.5 text-[0.65rem] transition-colors disabled:opacity-60",
            devices[key]
              ? "border-sakura/40 bg-sakura/10 text-sakura"
              : "border-border text-muted-foreground/60"
          )}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
