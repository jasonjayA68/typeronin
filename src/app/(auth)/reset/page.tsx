import type { Metadata } from "next";

import { ResetForm } from "@/features/auth/reset-form";

export const metadata: Metadata = {
  title: "Set a new password",
  // A recovery page has no business in an index.
  robots: { index: false, follow: false },
};

export default function ResetPage() {
  // Deliberately unguarded: the recovery link mints a session on the way in, so
  // requiring one here would only race the cookie. updatePassword() enforces the
  // session server-side, which is where it actually matters.
  return <ResetForm />;
}
