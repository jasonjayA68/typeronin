"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  AuthFormShell,
  FieldError,
  FormNotice,
  NotConnectedNotice,
} from "@/features/auth/auth-form-shell";
import { signIn } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/password-input";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // A failed confirmation link sends the student back here with a reason.
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
    const result = await signIn(values);

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
      title="Return to the dojo"
      lede="Your Honor is where you left it."
      footer={
        <>
          No account yet?{" "}
          <Link href="/register" className="text-sakura underline-offset-4 hover:underline">
            Enter the dojo
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="student@dojo.jp"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="mt-2"
            {...register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgotten?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="mt-2"
            {...register("password")}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>

        <Button type="submit" variant="dojo" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRightIcon aria-hidden="true" />
            </>
          )}
        </Button>

        {configured ? null : <NotConnectedNotice />}
      </form>
    </AuthFormShell>
  );
}
