"use client";

import { ShieldAlertIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  setAccountFlag,
  setAccountStatus,
  setModerationNote,
  setWithdrawalsFrozen,
  type ModerationResult,
} from "@/features/admin/moderation-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

export type ModerationState = {
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  isFlagged: boolean;
  withdrawalsFrozen: boolean;
  moderationNote: string | null;
};

function tell(result: ModerationResult) {
  if (result.ok) toast.success(result.message ?? "Done.");
  else toast.error(result.message);
}

/**
 * The account status dialog for one account.
 *
 * State only — every button calls a server action that checks the permission
 * itself and writes to the activity log. Account controls need `users:write`;
 * blocking payouts needs `payouts:write`, so that button is shown only when the
 * admin holds it.
 */
export function ModerationControls({
  profileId,
  displayName,
  state,
  isSelf,
  canFreeze,
}: {
  profileId: string;
  displayName: string;
  state: ModerationState;
  isSelf: boolean;
  canFreeze: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [note, setNote] = useState(state.moderationNote ?? "");

  const run = (fn: () => Promise<ModerationResult>) => start(async () => tell(await fn()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldAlertIcon aria-hidden="true" />
          Account status
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account status for {displayName}</DialogTitle>
          <DialogDescription>
            Every action here is saved in the activity log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Account status */}
          <section className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Status — now {state.status.toLowerCase()}
            </p>
            {isSelf ? (
              <p className="text-xs text-muted-foreground">
                You cannot change the status of your own account.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={state.status === "ACTIVE" ? "secondary" : "outline"}
                  disabled={pending || state.status === "ACTIVE"}
                  onClick={() => run(() => setAccountStatus({ profileId, status: "ACTIVE" }))}
                >
                  Reactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || state.status === "SUSPENDED"}
                  onClick={() => run(() => setAccountStatus({ profileId, status: "SUSPENDED" }))}
                >
                  Suspend
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:text-destructive"
                  disabled={pending || state.status === "BANNED"}
                  onClick={() => run(() => setAccountStatus({ profileId, status: "BANNED" }))}
                >
                  Ban
                </Button>
              </div>
            )}
          </section>

          {/* Flag + freeze toggles */}
          <section className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Restrictions
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={state.isFlagged ? "secondary" : "outline"}
                disabled={pending}
                onClick={() =>
                  run(() => setAccountFlag({ profileId, flagged: !state.isFlagged }))
                }
              >
                {state.isFlagged ? "Remove the flag" : "Flag as suspicious"}
              </Button>
              {canFreeze ? (
                <Button
                  size="sm"
                  variant={state.withdrawalsFrozen ? "secondary" : "outline"}
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      setWithdrawalsFrozen({ profileId, frozen: !state.withdrawalsFrozen })
                    )
                  }
                >
                  {state.withdrawalsFrozen ? "Allow payouts again" : "Block payouts"}
                </Button>
              ) : null}
            </div>
          </section>

          {/* Internal note */}
          <section className="space-y-2">
            <label
              htmlFor={`note-${profileId}`}
              className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase"
            >
              Private note
            </label>
            <textarea
              id={`note-${profileId}`}
              value={note}
              maxLength={1000}
              rows={3}
              disabled={pending}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Only admins can see this. The player never sees it."
              className={cn(
                "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              )}
            />
            <Button
              size="sm"
              variant="dojo"
              disabled={pending}
              onClick={() => run(() => setModerationNote({ profileId, note }))}
            >
              Save note
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact status badges for the table row. */
export function StatusBadges({ state }: { state: ModerationState }) {
  const badges: { label: string; className: string }[] = [];
  if (state.status === "BANNED")
    badges.push({ label: "Banned", className: "bg-destructive/15 text-destructive" });
  else if (state.status === "SUSPENDED")
    badges.push({ label: "Suspended", className: "bg-warning/15 text-warning" });
  if (state.isFlagged) badges.push({ label: "Flagged", className: "bg-sakura/15 text-sakura" });
  if (state.withdrawalsFrozen)
    badges.push({ label: "Payouts blocked", className: "bg-muted text-muted-foreground" });

  if (badges.length === 0) {
    return <span className="text-xs text-muted-foreground">Normal</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span
          key={b.label}
          className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", b.className)}
        >
          {b.label}
        </span>
      ))}
    </span>
  );
}
