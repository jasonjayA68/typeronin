import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Container } from "@/shared/components/layout/container";

/**
 * The masthead every interior page opens with. Centralised so the eyebrow and
 * the measure of the lede stay identical across the app — consistency here is
 * most of what makes the product feel composed. Kept intentionally clean: no
 * decorative watermark competing with the title.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("paper-texture relative overflow-hidden border-b border-border/60", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_-20%,color-mix(in_oklab,var(--color-sakura)_16%,transparent),transparent_70%)]"
      />
      <Container className="relative py-14 sm:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="font-inter text-xs font-semibold tracking-[0.22em] text-sakura uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {lede ? (
              <p className="font-inter mt-4 text-pretty text-muted-foreground sm:text-lg">{lede}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
        </div>
      </Container>
    </section>
  );
}
