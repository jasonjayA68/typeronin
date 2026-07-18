import "server-only";

import { DEFAULT_ECONOMY, parseEconomy, type EconomyConfig } from "@/features/economy/config";
import { prisma } from "@/lib/prisma";

/** The one `Setting` key the whole economy lives under. */
export const ECONOMY_KEY = "economy";

/**
 * The live economy configuration.
 *
 * Resilient by design, the same way authorization and ad lookups are: this is
 * read on the dashboard and will be read on the withdrawal form, and neither is
 * worth a 500. Three things can go wrong, and all three land on the defaults
 * rather than on an error page:
 *
 *   - the row does not exist yet (a fresh database) — use the defaults;
 *   - the row holds something a past version wrote that no longer validates —
 *     log it and use the defaults, rather than compute a payout from a shape we
 *     do not understand;
 *   - the database is unreachable — the wallet shows figures at the default rate
 *     instead of nothing at all.
 *
 * The defaults are conservative on purpose (see config.ts), so falling back to
 * them is safe: no fee, a real rate, a usable window.
 */
export async function getEconomyConfig(): Promise<EconomyConfig> {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: ECONOMY_KEY },
      select: { value: true },
    });
    if (!row) return DEFAULT_ECONOMY;

    const parsed = parseEconomy(row.value);
    if (!parsed) {
      console.error("economy setting is present but does not validate; using defaults");
      return DEFAULT_ECONOMY;
    }
    return parsed;
  } catch (error) {
    console.error("getEconomyConfig: could not read the economy setting", error);
    return DEFAULT_ECONOMY;
  }
}
