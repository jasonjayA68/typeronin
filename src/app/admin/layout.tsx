import Link from "next/link";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { requireAnyAdmin, holds } from "@/features/admin/guard";
import { ADMIN_NAV } from "@/features/admin/nav";
import { Container } from "@/shared/components/layout/container";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await requireAnyAdmin();

  // Hide what this person cannot use. Each route re-checks its own permission —
  // hiding a link is courtesy, not security.
  const sections = ADMIN_NAV.map((section) => ({
    ...section,
    modules: section.modules.filter((m) => holds(context, m.permission)),
  })).filter((section) => section.modules.length > 0);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border/60 bg-card/30">
          <Container className="py-5">
            <p className="font-heading text-xs font-semibold tracking-[0.22em] text-sakura uppercase">
              Admin
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the game, the players and the site.{" "}
              <span aria-hidden="true">·</span>{" "}
              {/* Underlined at rest, not on hover: unhovered it read as the tail
                  of the sentence before it rather than as somewhere to go. */}
              <Link
                href="/"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Back to the site
              </Link>
            </p>
          </Container>
        </div>

        <Container className="py-8">
          <div className="grid gap-8 lg:grid-cols-[13rem_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <AdminSidebar sections={sections} />
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
