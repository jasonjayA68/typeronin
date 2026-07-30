"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { AdminSection } from "@/features/admin/nav";

/**
 * The list of admin pages.
 *
 * Pages that are not built yet render as grey text with a reason, not as links.
 * The sidebar is the map of the admin area; a map that shows roads which do not
 * exist is worse than one that admits the gap.
 */
export function AdminSidebar({ sections }: { sections: AdminSection[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="px-3 font-heading text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {section.title}
          </h2>
          <ul className="mt-2 space-y-0.5">
            {section.modules.map((mod) => {
              // /admin must not match every child route.
              const active =
                mod.href === "/admin" ? pathname === "/admin" : pathname.startsWith(mod.href);

              if (mod.status === "planned") {
                return (
                  <li key={mod.slug}>
                    <span
                      title={mod.note ?? "Not built yet."}
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground/50"
                    >
                      {mod.label}
                      <span className="rounded-full border border-border px-1.5 py-px text-[0.6rem] tracking-wide">
                        soon
                      </span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={mod.slug}>
                  <Link
                    href={mod.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-sakura/10 font-medium text-sakura"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {mod.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
