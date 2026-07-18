"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, LoaderCircleIcon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { cn } from "@/lib/utils";
import {
  AuthFormShell,
  FieldError,
  FormNotice,
  NotConnectedNotice,
} from "@/features/auth/auth-form-shell";
import { signUp } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/password-input";
import {
  passwordStrength,
  registerSchema,
  type RegisterValues,
} from "@/features/auth/schemas";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

function StrengthMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < score ? (score >= 3 ? "bg-sakura" : "bg-warning") : "bg-border"
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Strength: <span className="text-foreground">{label}</span>
      </p>
    </div>
  );
}

/** Shown once the account exists but the inbox has the last word. */
function ConfirmationSent({ email }: { email: string }) {
  return (
    <div className="w-full max-w-md text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-sakura/40 bg-sakura/10 text-sakura">
        <MailCheckIcon aria-hidden="true" className="size-5" />
      </span>
      <h1 className="mt-6 font-heading text-2xl font-semibold tracking-wide text-balance">
        The gate awaits your word
      </h1>
      <p className="mt-3 text-pretty text-muted-foreground">
        A confirmation was sent to <span className="text-foreground">{email}</span>. Follow it and
        the dojo will know you.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        The dojo needs no account to train —{" "}
        <Link href="/dojo" className="text-sakura underline-offset-4 hover:underline">
          take your stance now
        </Link>
        .
      </p>
    </div>
  );
}

export function RegisterForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  const password = useWatch({ control, name: "password" }) ?? "";

  async function onSubmit(values: RegisterValues) {
    setError(null);
    const result = await signUp(values);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    if (result.status === "confirm") {
      setSentTo(result.email);
      return;
    }

    router.refresh();
    router.push("/dojo");
  }

  if (sentTo) return <ConfirmationSent email={sentTo} />;

  return (
    <AuthFormShell
      title="Enter the dojo"
      lede="Take a name, and begin at Heimin like everyone before you."
      footer={
        <>
          Already training?{" "}
          <Link href="/login" className="text-sakura underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}

        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="The name the hall will know"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            className="mt-2"
            {...register("name")}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>

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
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="mt-2"
            {...register("password")}
          />
          <StrengthMeter password={password} />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>

        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? "confirm-error" : undefined}
            className="mt-2"
            {...register("confirm")}
          />
          <FieldError id="confirm-error" message={errors.confirm?.message} />
        </div>

        <Button type="submit" variant="dojo" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
          ) : (
            <>
              Enter the dojo
              <ArrowRightIcon aria-hidden="true" />
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          By entering you accept the{" "}
          <Link href="/terms" className="text-foreground underline-offset-4 hover:underline">
            Terms
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" className="text-foreground underline-offset-4 hover:underline">
            Privacy notice
          </Link>
          .
        </p>

        {configured ? null : <NotConnectedNotice />}
      </form>
    </AuthFormShell>
  );
}
