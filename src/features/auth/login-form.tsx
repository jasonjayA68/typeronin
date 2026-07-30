"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  AuthFormShell,
  FieldError,
  FormNotice,
  LinkDivider,
  NotConnectedNotice,
  authFieldClass,
  authLinkClass,
} from "@/features/auth/auth-form-shell";
import { signIn } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/password-input";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * Sign in. Two fields, one button, and nothing else above it — a returning
 * player should be able to read this screen in a glance. "Forgot password" and
 * "Create account" are real needs but rare ones, so they sit below the button
 * as one quiet row rather than as choices beside the fields.
 */
export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // A failed confirmation link sends the player back here with a reason.
  const [error, setError] = useState<string | null>(searchParams.get("error"));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setError(null);
    // The browser's own timezone — the one signal the server cannot read from a
    // header. Resolved defensively; an old browser that lacks it just sends none.
    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timezone = undefined;
    }
    const result = await signIn(values, timezone);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    // refresh() so the server re-renders the header with the session before we
    // land; push() alone would show a signed-out header on the dojo.
    router.refresh();
    router.push("/dojo");
  }

  return (
    <AuthFormShell
      title="Welcome back"
      footer={
        <>
          <Link href="/forgot" className={authLinkClass}>
            Forgot password?
          </Link>
          <LinkDivider />
          <Link href="/register" className={authLinkClass}>
            Create free account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormNotice tone="error">{error}</FormNotice>

        <div className="space-y-5">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={authFieldClass}
              {...register("email")}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={authFieldClass}
              {...register("password")}
            />
            <FieldError id="password-error" message={errors.password?.message} />
          </div>

          {/* The one thing to do on this screen. Full width, 48px tall, and it
              keeps its label while pending so nobody wonders what is spinning. */}
          <Button
            type="submit"
            variant="dojo"
            size="xl"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          {configured ? null : <NotConnectedNotice />}
        </div>
      </form>
    </AuthFormShell>
  );
}
