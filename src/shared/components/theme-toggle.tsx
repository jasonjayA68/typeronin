"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/shared/components/ui/button";

/**
 * Toggles between the washi-paper day theme and the dusk dojo.
 *
 * Which icon shows is decided by CSS off the `.dark` class rather than by React
 * state: the server cannot know the resolved theme, and next-themes applies the
 * class before first paint, so this stays hydration-safe and flash-free.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon aria-hidden="true" className="hidden dark:block" />
      <MoonIcon aria-hidden="true" className="block dark:hidden" />
    </Button>
  );
}
