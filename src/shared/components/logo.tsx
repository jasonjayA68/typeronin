import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The full lockup: mark plus wordmark. Prefer this in navigation and footers;
 * reach for <BrandMark /> alone only where the name is already established.
 */
export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      aria-label="TypeRonin — home"
    >
      <Image
        src="/brand/typeronin-emblem.png"
        alt=""
        width={256}
        height={256}
        priority
        className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-border/50 transition-opacity duration-300 group-hover:opacity-90"
      />
      {showWordmark ? (
        // Below sm the mark stands alone: the lockup's tracking makes it too
        // wide to sit beside a CTA without forcing the page to scroll sideways.
        <span className="hidden font-heading text-base font-semibold tracking-[0.2em] whitespace-nowrap text-foreground uppercase sm:inline">
          Type
          <span className="text-gradient-gold">Ronin</span>
        </span>
      ) : null}
    </Link>
  );
}
