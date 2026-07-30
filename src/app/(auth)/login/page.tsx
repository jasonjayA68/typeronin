import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your free TypeRonin account.",
};

export default function LoginPage() {
  // The form reads ?error from a failed confirmation link, so it needs a
  // boundary to render inside.
  return (
    <Suspense fallback={<div className="w-full max-w-sm" />}>
      <LoginForm configured={isSupabaseConfigured} />
    </Suspense>
  );
}
