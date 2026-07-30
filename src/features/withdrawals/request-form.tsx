"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { formatCash, honorToCash, type EconomyConfig } from "@/features/economy/config";
import { requestWithdrawal } from "@/features/withdrawals/actions";
import {
  PAYOUT_METHODS,
  PAYOUT_METHOD_INFO,
  checkWithdrawalAmount,
  quoteWithdrawal,
  type PayoutMethodValue,
} from "@/features/withdrawals/model";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * The request dialog.
 *
 * It shows the payout as the amount is typed — cash value, fee and what actually
 * arrives — computed with the very functions the server writes down, so the
 * figure on screen is the figure that gets fixed into the row. The submit stays
 * disabled until the amount is one the server would accept, which turns the
 * min/max/balance rules into guidance rather than a rejection after the fact.
 */

const field =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const BLANK = { method: "GCASH" as PayoutMethodValue, accountName: "", accountRef: "", details: "", amount: "" };

/** A saved payout method the form can open pre-filled from. */
export type SavedDefault = {
  method: PayoutMethodValue;
  accountName: string;
  accountRef: string;
  details: string;
};

/** The form's opening values — the saved default's destination, amount blank. */
function initialValues(saved: SavedDefault | null): typeof BLANK {
  if (!saved) return BLANK;
  return {
    method: saved.method,
    accountName: saved.accountName,
    accountRef: saved.accountRef,
    details: saved.details,
    amount: "",
  };
}

export function RequestWithdrawalButton({
  balance,
  config,
  saved = null,
}: {
  balance: number;
  config: EconomyConfig;
  /** The user's default saved payout method, to pre-fill the destination. */
  saved?: SavedDefault | null;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => initialValues(saved));
  const [pending, startTransition] = useTransition();

  const info = PAYOUT_METHOD_INFO[values.method];
  const amount = Number(values.amount) || 0;
  const quote = quoteWithdrawal(amount, config);
  const check = amount > 0 ? checkWithdrawalAmount(amount, balance, config) : null;
  const belowMin = balance < config.minWithdrawalHonor;

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = () =>
    startTransition(async () => {
      const result = await requestWithdrawal({
        method: values.method,
        accountName: values.accountName,
        accountRef: values.accountRef,
        details: values.details,
        honorAmount: amount,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Withdrawal requested");
      setValues(initialValues(saved));
      setOpen(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValues(initialValues(saved));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={belowMin}>
          Request withdrawal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a withdrawal</DialogTitle>
          <DialogDescription>
            The Honor leaves your balance now. We hold it until the payment is sent or refused. The
            rate is fixed at the moment you request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {saved ? (
            <p className="rounded-lg border border-sakura/30 bg-sakura/5 px-3 py-2 text-xs text-muted-foreground">
              We filled this in from your default payout method. You can change anything below.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="wd-method">Method</Label>
            <select
              id="wd-method"
              value={values.method}
              disabled={pending}
              onChange={(e) => set("method", e.target.value as PayoutMethodValue)}
              className={field}
            >
              {PAYOUT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYOUT_METHOD_INFO[method].label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-name">Account holder name</Label>
            <Input
              id="wd-name"
              value={values.accountName}
              disabled={pending}
              placeholder="The name on the account"
              onChange={(e) => set("accountName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-ref">{info.refLabel}</Label>
            <Input
              id="wd-ref"
              value={values.accountRef}
              disabled={pending}
              placeholder={info.refPlaceholder}
              inputMode={info.ref === "phone" ? "tel" : info.ref === "email" ? "email" : "text"}
              onChange={(e) => set("accountRef", e.target.value)}
            />
          </div>

          {values.method === "BANK" ? (
            <div className="space-y-2">
              <Label htmlFor="wd-details">Bank name</Label>
              <Input
                id="wd-details"
                value={values.details}
                disabled={pending}
                placeholder="The name of your bank"
                onChange={(e) => set("details", e.target.value)}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="wd-amount">Amount</Label>
            <div className="flex items-center gap-2">
              <Input
                id="wd-amount"
                inputMode="numeric"
                className="tabular"
                value={values.amount}
                disabled={pending}
                placeholder={String(config.minWithdrawalHonor)}
                onChange={(e) => set("amount", e.target.value.replace(/[^0-9]/g, ""))}
              />
              <span className="shrink-0 text-xs text-muted-foreground">Honor</span>
            </div>
            <p className="text-xs text-muted-foreground">
              You have <span className="tabular text-foreground">{balance.toLocaleString()}</span>{" "}
              Honor ({honorToCash(balance, config)}). The smallest amount you can withdraw is{" "}
              <span className="tabular">{config.minWithdrawalHonor.toLocaleString()}</span> Honor.
            </p>
          </div>

          {/* The payout, spelled out as they type. */}
          {amount > 0 ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Cash value</span>
                <span className="tabular">{formatCash(quote.grossCents)}</span>
              </div>
              {quote.feeCents > 0 ? (
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">
                    Fee ({config.processingFeePercent}%)
                  </span>
                  <span className="tabular text-sakura">−{formatCash(quote.feeCents)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border/60 pt-2">
                <span className="font-medium">You receive</span>
                <span className="tabular font-semibold text-foreground">
                  {formatCash(quote.netCents)}
                </span>
              </div>
            </div>
          ) : null}

          {check && !check.ok ? <p className="text-xs text-destructive">{check.message}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={
              pending ||
              !check?.ok ||
              values.accountName.trim().length < 2 ||
              values.accountRef.trim().length < 3
            }
          >
            {pending ? "Requesting" : "Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
