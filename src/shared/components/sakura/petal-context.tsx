"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * How thick the blossom falls, 0–1.
 *
 * Split into two contexts on purpose: the field subscribes to the value and the
 * app subscribes to the setter. If they shared one context, every gust would
 * re-render every consumer of the setter — including the typing trainer, mid-run.
 */
const DensityValue = createContext(0.55);
const DensityControls = createContext<{
  /** Briefly thicken the fall, then settle back. For combos and unlocks. */
  gust: (intensity?: number, ms?: number) => void;
  set: (density: number) => void
} | null>(null);

const BASE_DENSITY = 0.55;

export function PetalProvider({ children }: { children: ReactNode }) {
  const [density, setDensity] = useState(BASE_DENSITY);
  const timer = useRef<number | null>(null);

  const set = useCallback((next: number) => {
    setDensity(Math.max(0, Math.min(1, next)));
  }, []);

  const gust = useCallback((intensity = 1, ms = 2600) => {
    if (timer.current) window.clearTimeout(timer.current);
    setDensity(Math.max(0, Math.min(1, BASE_DENSITY + intensity * (1 - BASE_DENSITY))));
    timer.current = window.setTimeout(() => setDensity(BASE_DENSITY), ms);
  }, []);

  const controls = useMemo(() => ({ gust, set }), [gust, set]);

  return (
    <DensityValue.Provider value={density}>
      <DensityControls.Provider value={controls}>{children}</DensityControls.Provider>
    </DensityValue.Provider>
  );
}

export function usePetalDensity() {
  return useContext(DensityValue);
}

/**
 * Returns no-ops outside a PetalProvider rather than throwing: a gust is
 * decoration, and decoration must never be able to break a typing run.
 */
export function usePetals() {
  return (
    useContext(DensityControls) ?? {
      gust: () => {},
      set: () => {},
    }
  );
}
