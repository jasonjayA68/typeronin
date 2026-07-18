import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { AdminPage, Panel } from "@/features/admin/ui";
import { DEFAULT_ECONOMY } from "@/features/economy/config";
import { EconomyEditor } from "@/features/economy/economy-editor";
import { getEconomyConfig } from "@/features/economy/service";

export const metadata: Metadata = {
  title: "Honor economy",
  robots: { index: false, follow: false },
};

export default async function EconomyPage() {
  await requirePermission("settings:write");

  const config = await getEconomyConfig();
  const isDefault =
    config.honorPerDollar === DEFAULT_ECONOMY.honorPerDollar &&
    config.minWithdrawalHonor === DEFAULT_ECONOMY.minWithdrawalHonor &&
    config.maxWithdrawalHonor === DEFAULT_ECONOMY.maxWithdrawalHonor &&
    config.dailyWithdrawalLimit === DEFAULT_ECONOMY.dailyWithdrawalLimit &&
    config.processingFeePercent === DEFAULT_ECONOMY.processingFeePercent;

  return (
    <AdminPage
      title="Honor economy"
      description="What a run is worth in cash, and the bounds a payout must fall within. The rate is never hardcoded — it is this row, read by every wallet and every withdrawal."
    >
      <Panel title="Conversion & withdrawals">
        <EconomyEditor initial={config} />
      </Panel>

      <Panel title="How this is stored" className="border-dashed bg-transparent">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          One <code className="text-xs">Setting</code> row under the key{" "}
          <code className="text-xs">economy</code>, validated against a fixed schema before it can be
          written — so no malformed rate reaches production, and no migration is needed to change a
          value.{" "}
          {isDefault
            ? "Nothing has been saved yet, so these are the built-in defaults."
            : "These values were set here."}
        </p>
      </Panel>
    </AdminPage>
  );
}
