import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/utils";

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
} as const;

type ContainerProps = ComponentProps<"div"> & {
  as?: ElementType;
  width?: keyof typeof widths;
};

/** Centres content and owns the responsive gutters, so sections never re-invent them. */
export function Container({
  as: Comp = "div",
  width = "default",
  className,
  ...props
}: ContainerProps) {
  return (
    <Comp
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[width], className)}
      {...props}
    />
  );
}
