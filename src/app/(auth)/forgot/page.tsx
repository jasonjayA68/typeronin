import type { Metadata } from "next";

import { ForgotForm } from "@/features/auth/forgot-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Recover your account",
  description: "Send a recovery link and set a new password.",
};

export default function ForgotPage() {
  return <ForgotForm configured={isSupabaseConfigured} />;
}
