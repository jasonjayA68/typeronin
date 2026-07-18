import Link from "next/link";

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
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export function SiteFooter() {
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
            © {new Date().getFullYear()} Samurai Script. All rights reserved.
          </p>
          <p className="font-heading text-xs tracking-[0.2em] text-muted-foreground uppercase">
            道 · The Way
          </p>
        </div>
      </Container>
    </footer>
  );
}
