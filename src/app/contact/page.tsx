import type { Metadata } from "next";

import { SocialLinks, hasSocialLinks } from "@/features/social/social-links";
import { InkDivider } from "@/shared/components/ink-divider";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the house — on social, or in writing.",
};

/**
 * Where to reach the house.
 *
 * Social is the front door: it is where the product is answered day to day, and
 * the links come from the admin panel rather than this file, so a network is
 * added without a deploy. The two written addresses stay because a DM is not a
 * durable channel for a data-protection request or a legal notice — those need
 * somewhere that can be evidenced later.
 *
 * There is deliberately no contact FORM. A form promises a queue somebody works,
 * and there is no inbox behind one here; a link to a channel that is genuinely
 * read is a better answer than a field that quietly drops messages.
 */

const WRITTEN = [
  {
    address: "privacy@typeronin.com",
    label: "Your data",
    note: "Access, correction and deletion requests, and anything about the privacy notice.",
  },
  {
    address: "legal@typeronin.com",
    label: "Legal",
    note: "Questions about the terms, and formal notices.",
  },
] as const;

export default async function ContactPage() {
  const linked = await hasSocialLinks();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="The Scrolls"
          kanji="連絡"
          title="Contact"
          lede="The house keeps no support desk. It answers on social, and in writing where a record is needed."
        />
        <Container width="narrow" className="py-12 sm:py-16">
          <section aria-labelledby="social" className="scroll-mt-24">
            <h2 id="social" className="text-xl font-semibold sm:text-2xl">
              On social
            </h2>
            <div className="mt-4 space-y-5 leading-relaxed text-muted-foreground">
              {linked ? (
                <>
                  <p>
                    The quickest way to reach us, and where questions about training, Honor and
                    payouts are answered. Send a message on whichever you already use.
                  </p>
                  <SocialLinks variant="named" />
                </>
              ) : (
                <p>
                  No social channels are published yet. Until they are, use the addresses below.
                </p>
              )}
            </div>
          </section>

          <InkDivider className="my-10" />

          <section aria-labelledby="written" className="scroll-mt-24">
            <h2 id="written" className="text-xl font-semibold sm:text-2xl">
              In writing
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">
              <p>
                For anything that should leave a record — a request about your data, or a legal
                notice — write rather than message.
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
