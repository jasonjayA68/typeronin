import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/shared/components/logo";
import { ThemeToggle } from "@/shared/components/theme-toggle";

/**
 * The gate. Deliberately without the marketing header — a student signing in has
 * already been sold, and the quiet is the product.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col lg:grid lg:grid-cols-2">
      {/* The creed panel. Decorative, so it steps aside on small screens. */}
      <aside className="paper-texture relative hidden overflow-hidden border-r border-border/60 bg-card/30 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_30%_0%,color-mix(in_oklab,var(--color-sakura)_22%,transparent),transparent_70%)]"
        />

        <Logo />

        <div className="max-w-sm">
          <Image
            src="/brand/typeronin-logo.png"
            alt="TypeRonin — Type fast. Earn honors."
            width={512}
            height={512}
            priority
            className="w-44 rounded-2xl ring-1 ring-border/50"
          />
          <blockquote className="mt-8">
            <p className="font-heading text-2xl leading-snug tracking-wide text-balance">
              A cut once made cannot be unmade.
            </p>
            <footer className="mt-4 text-sm text-muted-foreground">
              The first thing every student is told, and the last thing they understand.
            </footer>
          </blockquote>
        </div>

        <p className="font-heading text-xs tracking-[0.22em] text-sakura uppercase">
          Discipline · Precision · Mastery
        </p>
      </aside>

      {/* The form side. */}
      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 lg:justify-end">
          <span className="lg:hidden">
            <Logo />
          </span>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          {children}
        </div>

        <div className="p-4 text-center text-xs text-muted-foreground sm:p-6">
          <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
            Return to the home path
          </Link>
        </div>
      </main>
    </div>
  );
}
