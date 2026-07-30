import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Every field on these screens. `h-11` is 44px — the smallest target a thumb
 * hits reliably, and the reason auth fields are taller than the app's default
 * `Input`.
 */
export const authFieldClass = "mt-2 h-11";

/**
 * A secondary link. Quiet enough that it never competes with the primary
 * button, but always underlined (colour alone is not a link) and padded out to
 * a 44px target.
 */
export const authLinkClass =
  "inline-flex min-h-11 items-center rounded-md px-1 underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Shared chrome for the auth forms so they stay indistinguishable in
 * everything but their fields.
 *
 * One heading, one form, one row of quiet links. `lede` is optional on purpose:
 * a sentence that only restates the heading is noise between the reader and
 * the first field.
 */
export function AuthFormShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      {/* font-sans + tracking-normal override the global Cinzel heading rule —
          the sign-in screen reads as a plain, modern form, not a brand masthead. */}
      <h1 className="font-sans text-2xl font-semibold tracking-normal text-balance">{title}</h1>
      {lede ? <p className="mt-2 text-pretty text-muted-foreground">{lede}</p> : null}

      <div className="mt-8">{children}</div>

      {footer ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** The dot between two secondary links. Decorative, so screen readers skip it. */
export function LinkDivider() {
  return (
    <span aria-hidden="true" className="text-muted-foreground/40">
      ·
    </span>
  );
}

/** A field's error text. Reserves no space when empty — forms should not jitter. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * The form-level answer — "did that work?" — as opposed to a single field's.
 *
 * The live region is mounted even when there is nothing to say. A `role="alert"`
 * that appears at the same moment as its text is announced inconsistently
 * across screen readers; a region that was already there when the text arrives
 * is not. It collapses to nothing when empty, so it costs no layout.
 */
export function FormNotice({
  tone = "error",
  children,
}: {
  tone?: "error" | "info";
  children?: ReactNode;
}) {
  return (
    <div aria-live="assertive" aria-atomic="true">
      {children ? (
        <p
          className={cn(
            "mb-5 rounded-lg border px-3 py-2.5 text-sm",
            tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-sakura/30 bg-sakura/10 text-foreground"
          )}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Shown only when Supabase keys are absent from the environment. Auth is wired;
 * this deployment simply has nothing to talk to, and saying so plainly beats a
 * spinner that resolves into an opaque failure.
 */
export function NotConnectedNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground",
        className
      )}
    >
      Sign-in is not ready on this site yet. You can still{" "}
      <Link href="/dojo" className="text-sakura underline underline-offset-4">
        play now
      </Link>
      .
    </p>
  );
}
