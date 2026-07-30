import type { Metadata } from "next";

import { SocialLinks, hasSocialLinks } from "@/features/social/social-links";
import { InkDivider } from "@/shared/components/ink-divider";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach us — on social media, or by email.",
};

/**
 * Where to reach us.
 *
 * Social is the front door: it is where the product is answered day to day, and
 * the links come from the admin panel rather than this file, so a network is
 * added without a deploy. The two email addresses stay because a private message
 * is not a durable channel for a data-protection request or a legal notice —
 * those need somewhere that can be evidenced later.
 *
 * There is deliberately no contact FORM. A form promises a queue somebody works,
 * and there is no inbox behind one here; a link to a channel that is genuinely
 * read is a better answer than a field that quietly drops messages.
 */

const WRITTEN = [
  {
    address: "privacy@typeronin.com",
    label: "Your data",
    note: "Ask to see, correct or delete your data. Also for questions about our privacy notice.",
  },
  {
    address: "legal@typeronin.com",
    label: "Legal",
    note: "Questions about our terms, and formal legal notices.",
  },
] as const;

export default async function ContactPage() {
  const linked = await hasSocialLinks();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Help"
          title="Contact"
          lede="We have no support phone line. We answer on social media, and by email when you need a written record."
        />
        <Container width="narrow" className="py-12 sm:py-16">
          <section aria-labelledby="social" className="scroll-mt-24">
            <h2 id="social" className="text-xl font-semibold sm:text-2xl">
              On social media
            </h2>
            <div className="mt-4 space-y-5 leading-relaxed text-muted-foreground">
              {linked ? (
                <>
                  <p>
                    This is the fastest way to reach us. We answer questions about the games, about
                    Honor — the points you earn by playing — and about payouts. Send a message on
                    whichever network you already use.
                  </p>
                  <SocialLinks variant="named" />
                </>
              ) : (
                <p>
                  We have not published any social media accounts yet. Until we do, use the email
                  addresses below.
                </p>
              )}
            </div>
          </section>

          <InkDivider className="my-10" />

          <section aria-labelledby="written" className="scroll-mt-24">
            <h2 id="written" className="text-xl font-semibold sm:text-2xl">
              By email
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Some things need a written record. Send an email for a request about your data, or
                for a legal notice.
              </p>
              <ul className="space-y-4">
                {WRITTEN.map((entry) => (
                  <li key={entry.address}>
                    <a
                      href={`mailto:${entry.address}`}
                      className="font-heading tracking-wide text-foreground underline decoration-gold/50 underline-offset-4 transition-colors hover:decoration-gold"
                    >
                      {entry.address}
                    </a>
                    <p className="mt-1 text-sm">
                      <span className="text-foreground">{entry.label}.</span> {entry.note}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
