import type { Metadata } from "next";

import { ForgotForm } from "@/features/auth/forgot-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Forgot your password?",
  description: "Get an email link and set a new password.",
};

export default function ForgotPage() {
  return <ForgotForm configured={isSupabaseConfigured} />;
}
