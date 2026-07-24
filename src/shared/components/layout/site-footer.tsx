import Link from "next/link";

import { SocialLinks } from "@/features/social/social-links";
import { Container } from "@/shared/components/layout/container";
import { InkDivider } from "@/shared/components/ink-divider";
import { Logo } from "@/shared/components/logo";

const footerSections = [
  {
    title: "Train",
    links: [
      { href: "/dojo", label: "The Dojo" },
      { href: "/missions", label: "Missions" },
      { href: "/achievements", label: "Bushido Trials" },
    ],
  },
  {
    title: "Standing",
    links: [
      { href: "/leaderboard", label: "Hall of Legends" },
      { href: "/#ranks", label: "The Nine Ranks" },
    ],
  },
  {
    title: "Scrolls",
    links: [
      { href: "/#the-way", label: "The Way" },
      { href: "/#scrolls", label: "Questions" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export async function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo />
            {/* Tighter than the eyebrow elsewhere: this column is narrow enough
                that the default tracking strands "Mastery" on its own line. */}
            <p className="font-heading text-[0.7rem] tracking-[0.1em] text-sakura uppercase">
              Discipline · Precision · Mastery
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              The path of mastery is walked one keystroke at a time.
            </p>

            {/* Labelled, because these are the way to reach the house rather
                than a decorative row — an unnamed strip of glyphs reads as
                branding and nobody clicks it to ask a question. The heading
                stays even when no network is linked: /contact always carries the
                written addresses, so the invitation is never empty. Only the
                glyph row itself comes and goes with the admin's settings. */}
            <div className="space-y-2.5 pt-1">
              <h2 className="font-heading text-xs font-semibold tracking-[0.18em] text-foreground uppercase">
                Talk to us
              </h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                The house answers on social. <Link href="/contact" className="underline decoration-sakura/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-sakura">Every way to reach us</Link>.
              </p>
              <SocialLinks />
            </div>
          </div>

          {footerSections.map((section) => (
            <nav key={section.title} aria-label={section.title} className="space-y-3">
              <h2 className="font-heading text-xs font-semibold tracking-[0.18em] text-foreground uppercase">
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <InkDivider />

        <div className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TypeRonin. All rights reserved.
          </p>
          <p className="font-heading text-xs tracking-[0.2em] text-muted-foreground uppercase">
            道 · The Way
          </p>
        </div>
      </Container>
    </footer>
  );
}
