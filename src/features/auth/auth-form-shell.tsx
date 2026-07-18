import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";


/**
 * Shared chrome for the two auth forms so the login and register pages stay
 * indistinguishable in everything but their fields.
 */
export function AuthFormShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <h1 className="font-heading text-3xl font-semibold tracking-wide text-balance">{title}</h1>
      <p className="mt-3 text-pretty text-muted-foreground">{lede}</p>
      <div className="mt-8">{children}</div>
      <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
    </div>
  );
}

/** A field's error text. Reserves no space when empty — forms should not jitter. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-destructive">
      {message}
    </p>
  );
}

/** A form-wide message — the gate's answer, as opposed to a single field's. */
export function FormNotice({
  tone = "error",
  children,
}: {
  tone?: "error" | "info";
  children: ReactNode;
}) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-sakura/30 bg-sakura/10 text-foreground"
      )}
    >
      {children}
    </p>
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
        "rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground",
        className
      )}
    >
      This deployment has no Supabase keys set, so the gate cannot answer. The dojo needs no
      account —{" "}
      <Link href="/dojo" className="text-sakura underline-offset-4 hover:underline">
        train now
      </Link>
      .
    </p>
  );
}
