import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AvatarSettings,
  EmailForm,
  PasswordForm,
  ProfileInfoForm,
} from "@/features/profile/settings-form";
import { ensureProfile } from "@/features/profile/service";
import { getUser } from "@/lib/supabase/server";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import { Panel } from "@/features/profile/dashboard-panels";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile, photo, email, and password.",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(user);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Account"
          title="Settings"
          lede="Update your profile, photo, email, and password."
        />

        <Container width="narrow" className="py-10 sm:py-14">
          <div className="space-y-4">
            <Panel title="Profile photo">
              <AvatarSettings name={profile.displayName} avatarUrl={profile.avatarUrl} />
            </Panel>

            <Panel title="Your profile">
              <ProfileInfoForm displayName={profile.displayName} bio={profile.bio ?? ""} />
            </Panel>

            <Panel title="Email address">
              <EmailForm currentEmail={user.email ?? ""} />
            </Panel>

            <Panel title="Password">
              <PasswordForm />
            </Panel>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
