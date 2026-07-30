import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/register-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Create free account",
  description: "Create a free TypeRonin account and start playing.",
};

export default function RegisterPage() {
  return <RegisterForm configured={isSupabaseConfigured} />;
}
