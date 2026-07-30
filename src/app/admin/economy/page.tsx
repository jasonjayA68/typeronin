import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { AdminPage, Panel } from "@/features/admin/ui";
import { DEFAULT_ECONOMY } from "@/features/economy/config";
import { EconomyEditor } from "@/features/economy/economy-editor";
import { getEconomyConfig } from "@/features/economy/service";

export const metadata: Metadata = {
  title: "Honor value",
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
      title="Honor value"
      description="Set how much cash Honor is worth, and the smallest and largest payout. Honor is the points players earn. Every wallet and payout uses the numbers on this page."
    >
      <Panel title="Cash value and payout limits">
        <EconomyEditor initial={config} />
      </Panel>

      <Panel title="Good to know" className="border-dashed bg-transparent">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          Your changes are checked before they are saved, so a bad value cannot go live.{" "}
          {isDefault
            ? "Nothing has been saved yet, so these are the starting values."
            : "These values were set on this page."}
        </p>
      </Panel>
    </AdminPage>
  );
}
