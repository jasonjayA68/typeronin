import Image from "next/image";
import Link from "next/link";

import { InkDivider } from "@/shared/components/ink-divider";
import { Button } from "@/shared/components/ui/button";

/**
 * Rendered inside the root layout, which already owns <html>/<body> and a flex
 * column — this <main> is the direct child that claims the remaining height.
 * Deliberately standalone: the header and footer would crowd the composition
 * below the fold, and a quiet, empty page suits a link that led nowhere.
 */
export default function NotFound() {
  return (
    <main className="paper-texture relative flex flex-1 items-center justify-center overflow-hidden px-4 py-20 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_-20%,color-mix(in_oklab,var(--color-sakura)_16%,transparent),transparent_70%)]"
      />

      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <Image
          src="/brand/typeronin-emblem-light.png"
          alt="TypeRonin"
          width={256}
          height={256}
          priority
          className="size-24 rounded-2xl ring-1 ring-border/50 sm:size-28 dark:hidden"
        />
        <Image
          src="/brand/typeronin-emblem-dark.png"
          alt="TypeRonin"
          width={256}
          height={256}
          priority
          className="hidden size-24 rounded-2xl ring-1 ring-border/50 sm:size-28 dark:block"
        />

        <p className="mt-8 font-heading text-xs font-semibold tracking-[0.22em] text-sakura uppercase">
          Page not found
        </p>

        <p
          aria-hidden="true"
          className="tabular mt-5 text-6xl leading-none font-medium tracking-[0.2em] text-foreground/70 select-none sm:text-7xl"
        >
          404
        </p>

        <h1 className="mt-6 text-3xl font-semibold text-balance sm:text-4xl">
          This page does not exist.
        </h1>

        <p className="mt-4 text-pretty text-muted-foreground sm:text-lg">
          The page you wanted is not here. It may have moved, or the link may be wrong. Use a button
          below to keep playing.
        </p>

        <InkDivider crest className="my-10" />

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild variant="dojo" size="xl">
            <Link href="/dojo">Go to The Dojo</Link>
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link href="/">Go to the home page</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
