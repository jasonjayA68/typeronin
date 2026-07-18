import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type InkDividerProps = Omit<ComponentProps<"div">, "children"> & {
  /** Renders a small diamond crest at the centre of the stroke. */
  crest?: boolean;
};

/**
 * A sumi-e brush stroke used to separate sections.
 * Decorative only — hidden from assistive technology.
 */
export function InkDivider({ crest = false, className, ...props }: InkDividerProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("relative flex w-full items-center justify-center", className)}
      {...props}
    >
      <span className="ink-divider w-full" />
      {crest ? (
        <span className="absolute size-2 rotate-45 border border-sakura/50 bg-background" />
      ) : null}
    </div>
  );
}
