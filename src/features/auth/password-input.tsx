"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/shared/components/ui/input";

/**
 * A password field that can show its own contents.
 *
 * The reveal exists because our own rules make mistyping expensive: passwords
 * are ten characters minimum and registration asks for the same one twice.
 *
 * `ref` is not forwarded explicitly — React 19 passes it through `props`, which
 * is what lets react-hook-form's `register()` spread onto this unchanged.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const hintId = useId();

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        // Room for the toggle, so a long password never runs under it.
        className={cn("pr-9", className)}
        {...props}
      />

      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Communicates the state to a screen reader; the icon alone cannot.
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-describedby={hintId}
        className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {visible ? (
          <EyeOffIcon aria-hidden="true" className="size-4" />
        ) : (
          <EyeIcon aria-hidden="true" className="size-4" />
        )}
      </button>

      <span id={hintId} className="sr-only">
        Revealing your password shows it to anyone who can see this screen.
      </span>
    </div>
  );
}
