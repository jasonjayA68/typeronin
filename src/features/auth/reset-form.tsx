"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
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
  authFieldClass,
  authLinkClass,
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
      footer={
        <>
          <span>Link expired?</span>
          <Link href="/forgot" className={authLinkClass}>
            Get a new one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormNotice tone="error">{error}</FormNotice>

        <div className="space-y-5">
          <div>
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "password-hint password-error" : "password-hint"
              }
              className={authFieldClass}
              {...register("password")}
            />
            <p id="password-hint" className="mt-2 text-xs text-muted-foreground">
              Use at least 10 characters.
            </p>
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
            <Label htmlFor="confirm">Type your new password again</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm)}
              aria-describedby={errors.confirm ? "confirm-error" : undefined}
              className={authFieldClass}
              {...register("confirm")}
            />
            <FieldError id="confirm-error" message={errors.confirm?.message} />
          </div>

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
                Saving…
              </>
            ) : (
              "Save new password"
            )}
          </Button>
        </div>
      </form>
    </AuthFormShell>
  );
}
