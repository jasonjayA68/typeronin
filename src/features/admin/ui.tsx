import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The admin design system.
 *
 * Built because the panel had no system: three padding scales, five gap values,
 * three surface radii, and stat cards nested inside cards — two surfaces at the
 * same elevation, which is what made it read as unconsidered.
 *
 * The rules, and they are not negotiable per-module:
 *
 *  - ONE spacing scale. Page rhythm 8, panel padding 5/6, everything inside 4,
 *    inline 2. Nothing else. If a gap needs to be 3, the layout is wrong.
 *  - ONE surface per context. A Panel is a surface; things inside it are not.
 *    Nested cards are the fastest way to make a dashboard look amateur.
 *  - ONE type scale. Page title, panel title, label, value. Four sizes.
 *  - Numbers are always tabular, right-aligned in tables, so columns line up.
 */

/* ------------------------------------------------------------------ page */

export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-heading text-2xl font-semibold tracking-wide">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- surface */

/** The one surface. Everything inside it is flat. */
export function Panel({
  title,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-heading text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      <div className={cn("min-w-0", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Panels in a row. The only grid an admin page should need. */
export function PanelGrid({
  cols = 2,
  className,
  children,
}: {
  cols?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 && "md:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- stats */

/**
 * A headline figure. Flat by default — it only gets a surface when it IS the
 * top-level element (`framed`), never when it sits inside a Panel.
 */
export function Stat({
  label,
  value,
  hint,
  accent,
  framed,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  framed?: boolean;
}) {
  return (
    <div className={cn("min-w-0", framed && "rounded-xl border border-border bg-card p-5")}>
      <p className="text-xs tracking-[0.12em] break-words text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-2 text-2xl leading-none font-semibold",
          accent ? "text-sakura" : "text-foreground"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- tables */

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // Wide tables scroll inside their own surface rather than pushing the page
    // sideways. The repo has a zero-horizontal-overflow rule.
    <div className={cn("-mx-5 overflow-x-auto sm:-mx-6", className)}>
      <div className="inline-block min-w-full px-5 align-middle sm:px-6">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({
  className,
  numeric,
  ...props
}: ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border px-4 py-3 text-left text-xs font-medium tracking-[0.1em] whitespace-nowrap text-muted-foreground uppercase first:pl-0 last:pr-0",
        numeric && "text-right",
        className
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  numeric,
  ...props
}: ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "border-b border-border/50 px-4 py-3 align-middle first:pl-0 last:pr-0",
        numeric && "tabular text-right",
        className
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("last:[&>td]:border-0", className)} {...props} />;
}

/* ----------------------------------------------------------- furnishings */

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="font-heading text-sm tracking-wide text-foreground">{title}</p>
      {children ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-pretty text-muted-foreground">
          {children}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Search and filters above a table. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

export function Pill({
  active,
  children,
  href,
}: {
  active?: boolean;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-sakura/40 bg-sakura/10 text-sakura"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

/** Page N of M, with prev/next that keep the current query. */
export function Pagination({
  page,
  pages,
  build,
}: {
  page: number;
  pages: number;
  /** Given a page number, return the href. */
  build: (page: number) => string;
}) {
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between gap-4 text-sm"
    >
      <p className="tabular text-xs text-muted-foreground">
        Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Pill href={build(page - 1)}>Previous</Pill>
        ) : (
          <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground/40">
            Previous
          </span>
        )}
        {page < pages ? (
          <Pill href={build(page + 1)}>Next</Pill>
        ) : (
          <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground/40">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

/** A quiet inline link, for panel actions. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      {children}
    </Link>
  );
}

/** States that read at a glance: live/draft, approved/pending. */
export function StatusDot({
  tone,
  children,
}: {
  tone: "on" | "off" | "warn";
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          tone === "on" && "bg-success",
          tone === "off" && "bg-muted-foreground/40",
          tone === "warn" && "bg-warning"
        )}
      />
      {children}
    </span>
  );
}
