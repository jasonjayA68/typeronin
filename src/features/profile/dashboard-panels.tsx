import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/features/profile/queries";

/** A titled surface. Every dashboard block is one of these, so they align. */
export function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("glass-panel lift rounded-2xl p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold tracking-[0.14em] text-foreground uppercase">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One number, named. */
export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-2xl font-semibold",
          accent ? "text-sakura" : "text-foreground"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Nothing here yet — said without apology. */
export function Empty({ children, cta }: { children: ReactNode; cta?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-8 text-center">
      <p className="text-sm text-pretty text-muted-foreground">{children}</p>
      {cta ? <div className="mt-3">{cta}</div> : null}
    </div>
  );
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Relative time, computed on the server. Deliberately coarse: a dashboard that
 * says "3 minutes ago" would be wrong the moment it is cached, and this page is
 * rendered per request rather than streamed.
 */
export function when(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function BattleRow({ session }: { session: SessionSummary }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">
          {session.categoryName ?? "Free practice"}
          <span className="ml-2 text-xs text-muted-foreground capitalize">
            {session.mode.toLowerCase()}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{when(session.playedAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-right">
        <span className="tabular text-sm text-foreground">{session.wpm} wpm</span>
        <span className="tabular hidden text-sm text-muted-foreground sm:inline">
          {session.accuracy}%
        </span>
        <span className="tabular text-sm text-sakura">+{session.honorEarned}</span>
      </div>
    </li>
  );
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      {children}
    </Link>
  );
}
