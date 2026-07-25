import Link from "next/link";

import { SocialLinks, hasSocialLinks } from "@/features/social/social-links";
import { Container } from "@/shared/components/layout/container";
import { Logo } from "@/shared/components/logo";

/**
 * The footer, stripped to what a visitor actually uses.
 *
 * Gone: the four navigation columns (the header already carries the site), the
 * "one keystroke at a time" tagline, and the Japanese "The Way" line. What is
 * left is a single job — reach us — and the legal line every site needs.
 *
 * "Talk to us", the social icons directly beneath it (the support email is one
 * of them), then a thin legal row: copyright with Privacy and Terms inline.
 */
export async function SiteFooter() {
  const linked = await hasSocialLinks();

  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30">
      <Container>
        <div className="flex flex-col items-center gap-5 py-12 text-center">
          <Logo />

          <div className="space-y-3">
            <h2 className="font-heading text-sm font-semibold tracking-[0.15em] text-foreground uppercase">
              Talk to Us
            </h2>
            {linked ? (
              <SocialLinks className="justify-center" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Reach us any time at{" "}
                <Link
                  href="/contact"
                  className="underline decoration-sakura/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-sakura"
                >
                  our contact page
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        {/* The legal line: copyright, then Privacy and Terms inline beside it. */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
          <span>© 2026 TypeRonin. All Rights Reserved.</span>
          <span aria-hidden="true" className="text-border">|</span>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <span aria-hidden="true" className="text-border">|</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </Container>
    </footer>
  );
}
