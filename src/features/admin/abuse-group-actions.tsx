"use client";

import { FlagIcon, ShieldXIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { banAccounts, flagAccounts } from "@/features/admin/moderation-actions";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

/**
 * Flag-all / Ban-all for one cluster of accounts that share an IP or a payout
 * number. Flag is one click (reversible, gates nothing); Ban is destructive, so
 * it sits behind a confirmation naming how many accounts it will close.
 */
export function AbuseGroupActions({ profileIds }: { profileIds: string[] }) {
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const flag = () =>
    start(async () => {
      const result = await flagAccounts({ profileIds });
      if (result.ok) toast.success(result.message ?? "Flagged.");
      else toast.error(result.message);
    });

  const ban = () =>
    start(async () => {
      const result = await banAccounts({ profileIds });
      if (result.ok) {
        toast.success(result.message ?? "Banned.");
        setConfirmOpen(false);
      } else {
        toast.error(result.message);
      }
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={flag}>
        <FlagIcon aria-hidden="true" />
        Flag all
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-destructive/50 text-destructive hover:text-destructive"
            disabled={pending}
          >
            <ShieldXIcon aria-hidden="true" />
            Ban all
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban these {profileIds.length} accounts?</DialogTitle>
            <DialogDescription>
              Each will be blocked from playing, earning, and withdrawing. Your own account is never
              included. This is logged and can be reversed per account from the Users page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" disabled={pending} onClick={ban}>
              Ban all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
