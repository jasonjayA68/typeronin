import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SocialLinks } from "@/features/social/social-links";
import { InkDivider } from "@/shared/components/ink-divider";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The rules of the house: accounts, fair play, Honor, and the conduct expected of those who train here.",
};

const LAST_UPDATED = "15 July 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="text-xl font-semibold sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

const sections: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "acceptance",
    title: "Acceptance",
    body: (
      <>
        <p>
          These terms govern your use of TypeRonin. By creating an account or training
          here, you agree to them. If you do not agree, do not use the service.
        </p>
        <p>
          If you are entering these terms for an organisation, you confirm you have the
          authority to bind it. You must be at least 13 years old to hold an account.
        </p>
      </>
    ),
  },
  {
    id: "your-account",
    title: "Your account",
    body: (
      <>
        <p>
          One student, one account. You are responsible for your credentials and for
          everything done under your account. Keep your password to yourself, and tell us
          promptly if you believe it has been discovered.
        </p>
        <p>
          Give us accurate details and keep them current. We may refuse or reclaim a
          display name that impersonates another person, or that is offensive.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>While training here, you agree not to:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-sakura/60">
          <li>Break the law, or use the service to harm or harass another person.</li>
          <li>
            Submit a display name, or any other content, that is abusive, hateful, or
            obscene.
          </li>
          <li>
            Probe, scrape, overload, or attempt to gain unauthorised access to the service
            or its data.
          </li>
          <li>
            Reverse engineer the service, except to the extent the law expressly permits it.
          </li>
          <li>Resell, sublicense, or share access to your account.</li>
        </ul>
      </>
    ),
  },
  {
    id: "fair-play",
    title: "Fair play",
    body: (
      <>
        <p className="font-heading text-base text-foreground">
          A machine cannot earn Honor.
        </p>
        <p>
          Every keystroke you submit must come from your own hands, in real time. You may
          not use scripts, macros, key-repeat tools, automation, replay software, injected
          input, or any other means of producing keystrokes you did not strike yourself.
          You may not let another person train under your account, and you may not tamper
          with how results are measured or reported.
        </p>
        <p>
          Assistive technology used because you need it to type is welcome and is not a
          breach of this section. If you are unsure whether your setup is permitted, ask us
          first.
        </p>
        <p>
          Where we find that results were not honestly earned, we may void them, remove
          them from the leaderboards, reset the rank and Honor that grew from them, and
          suspend or close the account. Rank taken by a machine is not rank.
        </p>
      </>
    ),
  },
  {
    id: "honor-and-rank",
    title: "Honor and rank",
    body: (
      <>
        <p>
          Honor, rank, streaks, and every other mark of standing are a record of your
          practice. They are not property, not currency, and have no monetary value. They
          cannot be bought from us, sold, transferred, exchanged, or redeemed for cash or
          anything else of value.
        </p>
        <p>
          We may adjust, recalculate, or reset standing where results were not honestly
          earned, where a fault in our measurement is corrected, or where the progression
          system changes. We will not do so arbitrarily, and we will explain a change that
          affects you.
        </p>
      </>
    ),
  },
  {
    id: "cost",
    title: "What it costs",
    body: (
      <>
        <p>
          Nothing. Every game, every level and every article is free, and there is no paid
          plan to buy. We take no payments and hold no card details.
        </p>
        <p>
          The site is paid for by the ads on its pages. Ads never buy a place on the
          leaderboard, and no ad changes what you can play or how much Honor a game earns.
          Blocking ads will not lock you out.
        </p>
        <p>
          Some articles may ask you to watch a short ad to read them. That choice is always
          yours, and saying no costs you nothing but the article.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content and ours",
    body: (
      <>
        <p>
          The kata, passages, artwork, and software of TypeRonin belong to us and our
          licensors. We grant you a personal, non-exclusive, non-transferable, revocable
          licence to use the service for its intended purpose while your account is in good
          standing.
        </p>
        <p>
          What you submit remains yours. You give us the licence we need to host it, show
          it back to you, and publish it where you have chosen to appear — on a leaderboard,
          for example.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    body: (
      <>
        <p>
          You may close your account at any time. We may suspend or close an account that
          breaches these terms, that exposes us or other students to risk, or that the law
          requires us to act on. Where it is reasonable to do so, we will warn you first
          and give you a chance to put it right.
        </p>
        <p>
          Nothing is charged for, so nothing is owed back. The sections that by their
          nature should survive — Honor
          and rank, liability, and these terms as a whole — survive termination.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers and liability",
    body: (
      <>
        <p>
          The service is provided as it is. We do not warrant that it will be uninterrupted
          or free of faults, that measurements will be perfectly accurate, or that training
          here will produce any particular result. Your progress is your own work.
        </p>
        <p>
          To the fullest extent the law permits, we are not liable for indirect,
          incidental, or consequential loss, or for lost data, profits, or standing. Our
          total liability arising from the service is limited to the amount you paid us in
          the twelve months before the claim.
        </p>
        <p>
          Nothing here excludes liability that cannot be excluded by law, and if you deal
          with us as a consumer, your statutory rights are unaffected.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may revise these terms as the dojo changes. When a change is material, we will
        tell you by email or in the product before it takes effect. If you continue to
        train here after that, you accept the revised terms. The date at the top of this
        page always reflects the current version.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>
          Questions about these terms, and any formal notice, go to{" "}
          <a
            href="mailto:legal@typeronin.com"
            className="text-foreground underline decoration-gold/50 underline-offset-4 transition-colors hover:decoration-gold"
          >
            legal@typeronin.com
          </a>
          . A notice under these terms has to be in writing — a social message does not count as
          one, for either of us.
        </p>
        {/* An async server component nested in this static array — it reads the
            admin-set links at render. */}
        <p>Everything else is answered faster on social:</p>
        <SocialLinks variant="named" />
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="The Scrolls"
          title="Terms"
          lede="The rules of this house. Read them before you take your stance."
        />
        <Container width="narrow" className="py-12 sm:py-16">
          <p className="text-sm text-muted-foreground">
            Last updated <span className="tabular">{LAST_UPDATED}</span>
          </p>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-heading font-semibold text-foreground">Note.</span> This
              is a working template. It has not been reviewed by legal counsel and is not a
              finished agreement. It must be reviewed and corrected before launch, and
              should not be relied on as it stands.
            </p>
          </div>

          <div className="mt-12">
            {sections.map((section, index) => (
              <div key={section.id}>
                {index > 0 ? <InkDivider className="my-10" /> : null}
                <Section id={section.id} title={section.title}>
                  {section.body}
                </Section>
              </div>
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
