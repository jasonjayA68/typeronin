import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/register-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Enter the Dojo",
  description: "Take a name and begin at Heimin. Every rank above it is earned.",
};

export default function RegisterPage() {
  return <RegisterForm configured={isSupabaseConfigured} />;
}
