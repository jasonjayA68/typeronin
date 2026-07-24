"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { PetalProvider } from "@/shared/components/sakura/petal-context";
import { PetalField } from "@/shared/components/sakura/petal-field";
import { SakuraTree } from "@/shared/components/sakura/sakura-tree";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { TooltipProvider } from "@/shared/components/ui/tooltip";

/**
 * One QueryClient per browser session, created lazily in state so it is never
 * shared between requests during SSR.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        // Sakura is the identity; warm white is where it lives. Dark is the
        // same blossom at night, offered as a comfort setting.
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <PetalProvider>
          {/* Fixed and behind everything, so it costs one paint for the whole
              app rather than one per route. The tree sits behind the petals
              (-z-20 to -z-10) and the petals are born from its canopy. */}
          <SakuraTree />
          <PetalField />
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </PetalProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
