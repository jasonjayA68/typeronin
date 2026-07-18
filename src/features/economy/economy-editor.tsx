"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  DEFAULT_ECONOMY,
  formatCash,
  honorToCash,
  honorToCents,
  type EconomyConfig,
} from "@/features/economy/config";
import { updateEconomyConfig } from "@/features/economy/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * The typed economy editor.
 *
 * Controlled state rather than a raw form, because this screen shows its own
 * consequences: change the rate and the worked example beneath it re-reckons
 * live, so an operator sees what "1000 Honor to the dollar" actually pays before
 * they save it. A number that decides real payouts should not be set blind.
 *
 * Follows the same shape as the category editor — local state, a transition for
 * the pending window, a toast for the result. Validation is the server's; this
 * only has to gather the fields.
 */

type Draft = {
  honorPerDollar: string;
  minWithdrawalHonor: string;
  maxWithdrawalHonor: string;
  dailyWithdrawalLimit: string;
  processingFeePercent: string;
};

function toDraft(config: EconomyConfig): Draft {
  return {
    honorPerDollar: String(config.honorPerDollar),
    minWithdrawalHonor: String(config.minWithdrawalHonor),
    maxWithdrawalHonor: String(config.maxWithdrawalHonor),
    dailyWithdrawalLimit: String(config.dailyWithdrawalLimit),
    processingFeePercent: String(config.processingFeePercent),
  };
}

/** Digits only. The server coerces and bounds; this keeps the field numeric. */
function digits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
  suffix,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          className="tabular"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(digits(e.target.value))}
        />
        {suffix ? <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function EconomyEditor({ initial }: { initial: EconomyConfig }) {
  const [draft, setDraft] = useState<Draft>(toDraft(initial));
  const [pending, startTransition] = useTransition();

  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // The worked example. Read from the draft so it moves as the operator types;
  // an empty field reads as zero here, which is fine for a preview and caught by
  // the server on save.
  const rate = Number(draft.honorPerDollar) || 0;
  const preview: EconomyConfig = {
    honorPerDollar: rate || 1,
    minWithdrawalHonor: Number(draft.minWithdrawalHonor) || 0,
    maxWithdrawalHonor: Number(draft.maxWithdrawalHonor) || 0,
    dailyWithdrawalLimit: Number(draft.dailyWithdrawalLimit) || 0,
    processingFeePercent: Number(draft.processingFeePercent) || 0,
  };

  const save = () =>
    startTransition(async () => {
      const result = await updateEconomyConfig({
        honorPerDollar: Number(draft.honorPerDollar),
        minWithdrawalHonor: Number(draft.minWithdrawalHonor),
        maxWithdrawalHonor: Number(draft.maxWithdrawalHonor),
        dailyWithdrawalLimit: Number(draft.dailyWithdrawalLimit),
        processingFeePercent: Number(draft.processingFeePercent),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Economy saved");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="economy-rate"
          label="Conversion rate"
          hint="How much Honor equals one dollar."
          suffix="Honor = $1"
          value={draft.honorPerDollar}
          onChange={(v) => set("honorPerDollar", v)}
          disabled={pending}
        />
        <Field
          id="economy-fee"
          label="Processing fee"
          hint="Taken from each payout. Zero disables it."
          suffix="%"
          value={draft.processingFeePercent}
          onChange={(v) => set("processingFeePercent", v)}
          disabled={pending}
        />
        <Field
          id="economy-min"
          label="Minimum withdrawal"
          hint="The smallest payout a player may request."
          suffix="Honor"
          value={draft.minWithdrawalHonor}
          onChange={(v) => set("minWithdrawalHonor", v)}
          disabled={pending}
        />
        <Field
          id="economy-max"
          label="Maximum withdrawal"
          hint="The largest single payout."
          suffix="Honor"
          value={draft.maxWithdrawalHonor}
          onChange={(v) => set("maxWithdrawalHonor", v)}
          disabled={pending}
        />
        <Field
          id="economy-daily"
          label="Daily withdrawal limit"
          hint="How many payouts one account may request a day."
          suffix="per day"
          value={draft.dailyWithdrawalLimit}
          onChange={(v) => set("dailyWithdrawalLimit", v)}
          disabled={pending}
        />
        <div className="flex items-end">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving" : "Save economy"}
          </Button>
        </div>
      </div>

      {/* The consequence, spelled out. */}
      <aside className="rounded-xl border border-border bg-card/60 p-5">
        <p className="font-heading text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
          At this rate
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">1,000 Honor</dt>
            <dd className="tabular text-foreground">{honorToCash(1000, preview)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Minimum payout</dt>
            <dd className="tabular text-foreground">
              {honorToCash(preview.minWithdrawalHonor, preview)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Maximum payout</dt>
            <dd className="tabular text-foreground">
              {honorToCash(preview.maxWithdrawalHonor, preview)}
            </dd>
          </div>
          {preview.processingFeePercent > 0 ? (
            <div className="flex items-baseline justify-between gap-3 border-t border-border/60 pt-3">
              <dt className="text-muted-foreground">Fee on the max</dt>
              <dd className="tabular text-sakura">
                −
                {formatCash(
                  Math.floor(
                    (honorToCents(preview.maxWithdrawalHonor, preview) *
                      preview.processingFeePercent) /
                      100
                  )
                )}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Defaults: {DEFAULT_ECONOMY.honorPerDollar.toLocaleString()} Honor to the dollar, no fee.
        </p>
      </aside>
    </div>
  );
}
