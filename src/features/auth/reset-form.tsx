"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { cn } from "@/lib/utils";
import { updatePassword } from "@/features/auth/actions";
import {
  AuthFormShell,
  FieldError,
  FormNotice,
} from "@/features/auth/auth-form-shell";
import { PasswordInput } from "@/features/auth/password-input";
import { passwordStrength, resetSchema, type ResetValues } from "@/features/auth/schemas";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";

export function ResetForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const { score, label } = passwordStrength(password);

  async function onSubmit(values: ResetValues) {
    setError(null);
    const result = await updatePassword(values);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    router.refresh();
    router.push("/dojo");
  }

  return (
    <AuthFormShell
      title="Set a new password"
      lede="Enter a new password for your account."
      footer={
        <>
          Link expired?{" "}
          <Link href="/forgot" className="text-sakura underline-offset-4 hover:underline">
            Request another
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}

        <div>
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="mt-2"
            {...register("password")}
          />
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
          <FieldError id="password-error" message={errors.password?.message} />
        </div>

        <div>
          <Label htmlFor="confirm">Confirm new password</Label>
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
              Set password
              <ArrowRightIcon aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </AuthFormShell>
  );
}
