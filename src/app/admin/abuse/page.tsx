import type { Metadata } from "next";
import Link from "next/link";

import { findSharedIps, findSharedNumbers, type AbuseGroup } from "@/features/admin/abuse-queries";
import { AbuseGroupActions } from "@/features/admin/abuse-group-actions";
import { requirePermission } from "@/features/admin/guard";
import { AdminPage, EmptyState, Panel } from "@/features/admin/ui";

export const metadata: Metadata = {
  title: "Suspicious accounts",
  robots: { index: false, follow: false },
};

/** A badge showing what has already been done to an account in a group. */
function StateTag({ status, isFlagged }: { status: string; isFlagged: boolean }) {
  if (status === "BANNED")
    return <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[0.65rem] font-semibold text-destructive">Banned</span>;
  if (status === "SUSPENDED")
    return <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[0.65rem] font-semibold text-warning">Suspended</span>;
  if (isFlagged)
    return <span className="rounded-full bg-sakura/15 px-2 py-0.5 text-[0.65rem] font-semibold text-sakura">Flagged</span>;
  return null;
}

/** One cluster of accounts sharing a value, with flag-all / ban-all. */
function GroupCard({ label, group }: { label: string; group: AbuseGroup }) {
  const ids = group.accounts.map((a) => a.id);
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className="tabular truncate font-medium">{group.key}</p>
          <p className="text-xs text-muted-foreground">
            {group.accounts.length} accounts use this
          </p>
        </div>
        <AbuseGroupActions profileIds={ids} />
      </div>

      <ul className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
        {group.accounts.map((a) => (
          <li key={a.id}>
            <Link
              href={`/profile/${a.handle}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs transition-colors hover:border-sakura/40 hover:text-foreground"
            >
              <span className="max-w-[10rem] truncate">{a.displayName}</span>
              <span className="text-muted-foreground">@{a.handle}</span>
              <StateTag status={a.status} isFlagged={a.isFlagged} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AbuseChecksPage() {
  await requirePermission("users:write");

  const [sharedIps, sharedNumbers] = await Promise.all([findSharedIps(), findSharedNumbers()]);

  return (
    <AdminPage
      title="Suspicious accounts"
      description="Accounts that share one sign-in address or one payout number. Sharing is not proof of cheating. A family or one shared phone looks the same. Check each group before you mark or ban it. Every action is saved in the activity log, and you can undo it per account from Users."
    >
      <Panel title={`Same payout number (${sharedNumbers.length})`}>
        {sharedNumbers.length ? (
          <div className="space-y-3">
            {sharedNumbers.map((g) => (
              <GroupCard key={g.key} label="Payout number" group={g} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing to check">
            No payout number is used by more than one account.
          </EmptyState>
        )}
      </Panel>

      <Panel title={`Same sign-in address (${sharedIps.length})`} className="mt-4">
        {sharedIps.length ? (
          <div className="space-y-3">
            {sharedIps.map((g) => (
              <GroupCard key={g.key} label="Sign-in address" group={g} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing to check">
            No sign-in address has been used by more than one account.
          </EmptyState>
        )}
      </Panel>
    </AdminPage>
  );
}
