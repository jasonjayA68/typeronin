"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  approveWithdrawal,
  markWithdrawalPaid,
  rejectWithdrawal,
} from "@/features/withdrawals/actions";
import {
  canApprove,
  canMarkPaid,
  canReject,
  type WithdrawalStatusValue,
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
 * The admin's four verbs for one payout: approve, reject, mark paid, and the
 * transaction reference mark-paid requires.
 *
 * Which buttons appear is decided by the same state-machine predicates the
 * server enforces (model.ts) — so a settled payout shows no actions, and the UI
 * can never offer a move the action would then refuse.
 */
export function AdminWithdrawalActions({
  id,
  status,
}: {
  id: string;
  status: WithdrawalStatusValue;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();

  const approve = () =>
    startTransition(async () => {
      const result = await approveWithdrawal(id);
      if (!result.ok) return void toast.error(result.message);
      toast.success("Approved");
    });

  const reject = () =>
    startTransition(async () => {
      const result = await rejectWithdrawal(id, note);
      if (!result.ok) return void toast.error(result.message);
      toast.success("Rejected — the Honor was refunded");
      setRejecting(false);
      setNote("");
    });

  const markPaid = () =>
    startTransition(async () => {
      const result = await markWithdrawalPaid(id, { reference });
      if (!result.ok) return void toast.error(result.message);
      toast.success("Marked paid");
      setPaying(false);
      setReference("");
    });

  const settled = !canApprove(status) && !canReject(status) && !canMarkPaid(status);
  if (settled) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex justify-end gap-1">
      {canApprove(status) ? (
        <Button variant="ghost" size="xs" onClick={approve} disabled={pending}>
          Approve
        </Button>
      ) : null}

      {canMarkPaid(status) ? (
        <Dialog open={paying} onOpenChange={setPaying}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="xs">
              Mark paid
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as paid</DialogTitle>
              <DialogDescription>
                Record the reference from the transfer you sent. This is final — the Honor stays
                spent, because it became the cash.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="wd-reference">Transaction reference</Label>
              <Input
                id="wd-reference"
                value={reference}
                disabled={pending}
                placeholder="e.g. GCASH-8830192"
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setPaying(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={markPaid}
                disabled={pending || reference.trim().length < 2}
              >
                {pending ? "Saving" : "Mark paid"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {canReject(status) ? (
        <Dialog open={rejecting} onOpenChange={setRejecting}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="xs" className="text-muted-foreground">
              Reject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject this withdrawal?</DialogTitle>
              <DialogDescription>
                The held Honor returns to the user&apos;s balance. A note is optional and is kept on
                the record.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="wd-note">Note (optional)</Label>
              <Input
                id="wd-note"
                value={note}
                disabled={pending}
                placeholder="Why it was refused"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)} disabled={pending}>
                Keep it
              </Button>
              <Button variant="destructive" size="sm" onClick={reject} disabled={pending}>
                {pending ? "Rejecting" : "Reject and refund"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
