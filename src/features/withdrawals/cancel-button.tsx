"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelWithdrawal } from "@/features/withdrawals/actions";
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

/** Take a pending request back. The Honor returns to the balance on confirm. */
export function CancelWithdrawalButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelWithdrawal(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Withdrawal cancelled. Your Honor is back in your balance.");
      setOpen(false);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs" className="text-muted-foreground">
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this withdrawal?</DialogTitle>
          <DialogDescription>
            The Honor we are holding goes back to your balance straight away. You can request another
            withdrawal after that.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Keep it
          </Button>
          <Button variant="destructive" size="sm" onClick={cancel} disabled={pending}>
            {pending ? "Cancelling" : "Cancel withdrawal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
