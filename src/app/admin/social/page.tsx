import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import { AdminPage, Panel } from "@/features/admin/ui";
import { SocialEditor } from "@/features/social/social-editor";
import { getSocialLinks } from "@/features/social/service";

export const metadata: Metadata = {
  title: "Social media",
  robots: { index: false, follow: false },
};

export default async function SocialPage() {
  await requirePermission("settings:write");

  const links = await getSocialLinks();

  return (
    <AdminPage
      title="Social media"
      description="The social accounts linked at the bottom of every page. Leave a box empty and that one is hidden."
    >
      <Panel title="Links">
        <SocialEditor initial={links} />
      </Panel>
    </AdminPage>
  );
}
