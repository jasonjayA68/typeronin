import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/shared/components/logo";
import { ThemeToggle } from "@/shared/components/theme-toggle";

/**
 * The sign-in / sign-up screen. No marketing header — someone signing in has
 * already arrived. A simple two-panel layout: quiet branding on the left (which
 * steps aside on small screens), the form on the right.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col lg:grid lg:grid-cols-2">
      {/* Brand panel. Decorative, so it hides on small screens. */}
      <aside className="paper-texture relative hidden overflow-hidden border-r border-border/60 bg-card/30 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_30%_0%,color-mix(in_oklab,var(--color-sakura)_18%,transparent),transparent_70%)]"
        />

        <Logo />

        <div className="max-w-sm">
          <Image
            src="/brand/typeronin-logo-light.png"
            alt="TypeRonin"
            width={512}
            height={512}
            priority
            className="w-36 rounded-2xl ring-1 ring-border/50 dark:hidden"
          />
          <Image
            src="/brand/typeronin-logo-dark.png"
            alt="TypeRonin"
            width={512}
            height={512}
            priority
            className="hidden w-36 rounded-2xl ring-1 ring-border/50 dark:block"
          />
          <p className="mt-8 text-2xl font-semibold text-balance">
            Type faster. Learn English. Earn real rewards.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Free typing games you can play in your browser.
          </p>
        </div>

        <p className="font-heading text-xs tracking-[0.2em] text-sakura uppercase">
          Play · Learn · Earn
        </p>
      </aside>

      {/* Form side. */}
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
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
