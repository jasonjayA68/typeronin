"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      // next-themes injects an anti-flash <script> during render. This Next.js
      // build errors on script tags produced on the client, so mark it
      // executable on the server (runs before first paint, no flash) and inert
      // on the client. suppressHydrationWarning on the script covers the type
      // mismatch. See node_modules/next/dist/docs/.../preventing-flash-before-hydration.md
      scriptProps={{
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
