import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The brand, in the two forms the product actually needs.
 *
 * `mark` (default) — the illustration beside a set wordmark. This is the
 * navigation form: the drawn lockup carries its own wordmark at a size that
 * would be unreadable in a 64px bar, so the header pairs the artwork with live
 * text instead. It renders at 44px rather than the more usual 36px because the
 * illustration is detailed and needs the extra pixels to stay legible.
 *
 * The blossom cut from this same artwork is the browser tab icon, and only
 * that — a 16px tab cannot show a girl at a laptop, but it can show a flower.
 * See public/brand/README.md.
 *
 * `lockup` — the drawn artwork entire, wordmark and tagline included. For the
 * places that introduce the brand rather than navigate it: the sign-in screen,
 * a hero, an empty state.
 *
 * Both cuts of every asset are transparent PNGs, so they sit on whatever is
 * behind them. CSS picks light or dark from the `.dark` class on <html>, which
 * means no flash on first paint and no client JS — the same reason the theme
 * toggle can be async without the mark ever being wrong.
 */
export function Logo({
  className,
  href = "/",
  showWordmark = true,
  variant = "mark",
  priority = false,
}: {
  className?: string;
  href?: string;
  /** Ignored when `variant` is "lockup" — that artwork carries its own wordmark. */
  showWordmark?: boolean;
  variant?: "mark" | "lockup";
  priority?: boolean;
}) {
  const label = "TypeRonin — home";

  if (variant === "lockup") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
        aria-label={label}
      >
        <Image
          src="/brand/typeronin-logo-light.png"
          alt=""
          width={984}
          height={1013}
          priority={priority}
          className="h-auto w-full dark:hidden"
        />
        <Image
          src="/brand/typeronin-logo-dark.png"
          alt=""
          width={984}
          height={1013}
          priority={priority}
          className="hidden h-auto w-full dark:block"
        />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      aria-label={label}
    >
      <Image
        src="/brand/typeronin-emblem-light.png"
        alt=""
        width={512}
        height={512}
        priority={priority}
        className="size-11 shrink-0 object-contain transition-opacity duration-300 group-hover:opacity-90 dark:hidden"
      />
      <Image
        src="/brand/typeronin-emblem-dark.png"
        alt=""
        width={512}
        height={512}
        priority={priority}
        className="hidden size-11 shrink-0 object-contain transition-opacity duration-300 group-hover:opacity-90 dark:block"
      />
      {showWordmark ? (
        // Below sm the emblem stands alone: the wordmark's tracking makes the
        // pair too wide to sit beside a call to action without pushing the page
        // sideways on a 360px phone.
        <span className="hidden font-heading text-base font-semibold tracking-[0.2em] whitespace-nowrap text-foreground uppercase sm:inline">
          Type
          <span className="text-sakura">Ronin</span>
        </span>
      ) : null}
    </Link>
  );
}
