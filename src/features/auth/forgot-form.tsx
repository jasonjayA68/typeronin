"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, LoaderCircleIcon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { requestPasswordReset } from "@/features/auth/actions";
import {
  AuthFormShell,
  FieldError,
  FormNotice,
  NotConnectedNotice,
} from "@/features/auth/auth-form-shell";
import { forgotSchema, type ForgotValues } from "@/features/auth/schemas";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

function Sent({ email }: { email: string }) {
  return (
    <div className="w-full max-w-sm text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-sakura/40 bg-sakura/10 text-sakura">
        <MailCheckIcon aria-hidden="true" className="size-5" />
      </span>
      <h1 className="mt-6 font-sans text-2xl font-semibold tracking-normal text-balance">Check your email</h1>
      <p className="mt-3 text-pretty text-muted-foreground">
        If <span className="text-foreground">{email}</span> has an account, we&apos;ve sent a
        password reset link. It expires soon, so use it right away.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="text-sakura underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function ForgotForm({ configured }: { configured: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotValues) {
    setError(null);
    const result = await requestPasswordReset(values);

    if (result.status === "error") {
      setError(result.message);
      return;
    }
    if (result.status === "confirm") setSentTo(result.email);
  }

  if (sentTo) return <Sent email={sentTo} />;

  return (
    <AuthFormShell
      title="Reset your password"
      lede="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="text-sakura underline-offset-4 hover:underline">
            Sign in
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
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="mt-2"
            {...register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        <Button type="submit" variant="dojo" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
          ) : (
            <>
              Send a recovery link
              <ArrowRightIcon aria-hidden="true" />
            </>
          )}
        </Button>

        {configured ? null : <NotConnectedNotice />}
      </form>
    </AuthFormShell>
  );
}
