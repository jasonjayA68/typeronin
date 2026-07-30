import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/shared/components/logo";
import { ThemeToggle } from "@/shared/components/theme-toggle";

/**
 * The sign-in / sign-up screen. No marketing header — someone signing in has
 * already arrived. A simple two-panel layout: quiet branding on the left (which
 * steps aside on small screens), the form on the right.
 *
 * The brand panel carries one mark and one line. It used to carry a logo, a
 * second logo, two paragraphs and a kicker, all of which read as competition
 * for the form rather than support for it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col lg:grid lg:grid-cols-2">
      {/* Brand panel. Decorative, so it hides on small screens. */}
      <aside className="paper-texture relative hidden overflow-hidden border-r border-border/60 bg-card/30 lg:flex lg:flex-col lg:justify-center lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_30%_0%,color-mix(in_oklab,var(--color-sakura)_18%,transparent),transparent_70%)]"
        />

        <div className="max-w-sm">
          {/* The lockup is the brand introduction here, so it replaces the old
              logo-plus-heading pair. Deliberately not `priority`: this panel is
              display:none below lg, and preloading it would spend a phone's
              first bytes on a picture it never shows.

              The artwork already says "TYPE FAST.", so the line under it picks
              up where the tagline stops instead of repeating it. */}
          <Logo variant="lockup" className="w-44" />
          <p className="mt-8 text-2xl font-semibold text-balance">
            Learn English and earn real rewards.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Free to play in your browser.</p>
        </div>
      </aside>

      {/* Form side. */}
      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 lg:justify-end">
          {/* The only brand on a phone, and it is above the fold. */}
          <span className="lg:hidden">
            <Logo priority />
          </span>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          {children}
        </div>

        <div className="flex justify-center p-4 text-sm text-muted-foreground sm:p-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md px-2 underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
