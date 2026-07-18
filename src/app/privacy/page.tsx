import type { Metadata } from "next";
import type { ReactNode } from "react";

import { InkDivider } from "@/shared/components/ink-divider";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What we record, why we record it, and the control you keep over it. Your training is yours.",
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
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <p>
          We collect only what the dojo needs to measure your progress honestly and keep
          your account secure.
        </p>

        <h3 className="pt-2 font-heading text-base font-semibold text-foreground">
          Account details
        </h3>
        <p>
          Your email address, your display name, and a cryptographic hash of your password.
          We never store your password itself. If you sign in through a third-party
          provider, we receive your email address and display name from that provider.
        </p>

        <h3 className="pt-2 font-heading text-base font-semibold text-foreground">
          Training records
        </h3>
        <p>
          Every kata you attempt produces measurements: words per minute, accuracy, Ma,
          Honor earned, rank, the passage trained, and the timing of your keystrokes within
          the session. Keystroke timing is what makes accuracy and Ma meaningful — it is
          recorded for the session you are training, not across the rest of the web.
        </p>

        <h3 className="pt-2 font-heading text-base font-semibold text-foreground">
          Device and technical information
        </h3>
        <p>
          Browser and operating system, screen size, time zone, keyboard layout, and IP
          address. This keeps the service working across devices, and helps us detect abuse
          and automated input.
        </p>

        <h3 className="pt-2 font-heading text-base font-semibold text-foreground">
          Advertising
        </h3>
        <p>
          Samurai Script is free and carries display advertising. We take no payments, so we
          hold no card details and no billing records of any kind.
        </p>
        <p>
          Where advertising is enabled, our advertising partner may set cookies or read
          device identifiers to select and measure the adverts you see, and may combine that
          with information gathered on other sites. We do not send them your email address,
          your typing sessions, or your Honor. You can opt out of personalised advertising
          through your Google Ads settings, and adverts will still appear — merely less
          relevant ones.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: (
      <>
        <ul className="list-disc space-y-2 pl-5 marker:text-sakura/60">
          <li>To measure your speed, accuracy, and Ma, and to award Honor and rank.</li>
          <li>To show your history and progress back to you over time.</li>
          <li>To place you on leaderboards, where you have chosen to appear.</li>
          <li>
            To keep play fair — detecting scripted or automated input that would corrupt
            the standings.
          </li>
          <li>To secure accounts, prevent abuse, and diagnose faults.</li>
          <li>
            To send you service messages about your account and material changes
            to this notice.
          </li>
          <li>To decide which kata to write next, using aggregated and de-identified data.</li>
        </ul>
        <p>
          We do not sell your personal data. We do not use your training records to build
          advertising profiles.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <>
        <p>
          We use a cookie to keep you signed in, and local storage to remember your
          preferences — your theme, and your last chosen discipline. These are necessary
          for the service to function as you expect.
        </p>
        <p>
          Where advertising is enabled, our advertising partner sets its own cookies to
          select and measure adverts, as described above. Those are the only third-party
          cookies here, and you may refuse them through your browser or your Google Ads
          settings; the dojo works either way.
        </p>
        <p>
          Any analytics we run are limited to understanding how the product is used, and are
          configured to avoid identifying you personally where possible.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <>
        <p>
          Account details and training records are kept for as long as your account is
          open. Your history is the record of your practice; deleting it by default would
          defeat the purpose of keeping it.
        </p>
        <p>
          When you close your account, we delete or anonymise your personal data within a
          reasonable period, except where we must retain records to meet legal, tax, or
          fraud-prevention obligations. Residual copies in encrypted backups are removed as
          those backups age out on their ordinary cycle.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Who else sees it",
    body: (
      <>
        <p>
          We rely on a small number of service providers to run the dojo: hosting and
          infrastructure, database storage, an email delivery service, and — where
          advertising is enabled — an advertising network. They process data only on our
          instructions, under contract, and only to provide their service to us. The
          advertising network is the one exception: it acts as its own controller for the
          adverts it selects, which is why its cookies are described above.
        </p>
        <p>
          We may disclose data where the law requires it, or where it is necessary to
          protect the rights and safety of our users. If ownership of the service changes,
          your data may transfer with it; this notice would continue to govern it until you
          are told otherwise.
        </p>
        <p>
          Leaderboard entries you opt into are public: they show your display name, rank,
          and the scores you have earned. Nothing else is published.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access your data, correct
          it, export it in a portable form, delete it, restrict or object to certain
          processing, and withdraw consent where we relied on it.
        </p>
        <p>
          You can export your training history and close your account from your settings at
          any time. For anything else, write to us at the address below and we will respond
          within the period the law allows. You may also complain to your local data
          protection authority.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The dojo is not intended for children under 13, and we do not knowingly collect
        their data. If you believe a child has given us personal data, write to us and we
        will remove it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this notice",
    body: (
      <p>
        We will revise this notice as the product changes. When a change is material, we
        will tell you by email or in the product before it takes effect. The date at the
        top of this page always reflects the current version.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about this notice, or about your data, go to{" "}
        <a
          href="mailto:privacy@samuraiscript.com"
          className="text-foreground underline decoration-gold/50 underline-offset-4 transition-colors hover:decoration-gold"
        >
          privacy@samuraiscript.com
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="The Scrolls"
          kanji="私事"
          title="Privacy"
          lede="What we record, why we record it, and how to have it removed. Your training is yours."
        />
        <Container width="narrow" className="py-12 sm:py-16">
          <p className="text-sm text-muted-foreground">
            Last updated <span className="tabular">{LAST_UPDATED}</span>
          </p>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-heading font-semibold text-foreground">Note.</span> This
              is a working template. It has not been reviewed by legal counsel and does not
              yet describe finalised practices. It must be reviewed and corrected before
              launch, and should not be relied on as it stands.
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
