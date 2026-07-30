import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("That email address does not look right."),
  password: z.string().min(1, "Please type your password."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Please use at least 2 letters.")
      .max(32, "Please use 32 letters or fewer."),
    email: z.email("That email address does not look right."),
    password: z
      .string()
      .min(10, "Please use at least 10 characters.")
      .max(128, "Please use 128 characters or fewer."),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "The two passwords are not the same.",
    path: ["confirm"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({
  email: z.email("That email address does not look right."),
});

export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    password: z
      .string()
      .min(10, "Please use at least 10 characters.")
      .max(128, "Please use 128 characters or fewer."),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "The two passwords are not the same.",
    path: ["confirm"],
  });

export type ResetValues = z.infer<typeof resetSchema>;

/**
 * A rough strength read for the meter — length carries most of the weight
 * because it genuinely does, and we would rather not teach players that a
 * sprinkle of punctuation redeems a short password.
 *
 * The labels are the five plainest words that still rank. They were smithing
 * metaphors (Brittle, Soft, Serviceable, Tempered, Forged), which asked the
 * reader to know that a forged blade beats a tempered one before they could
 * tell whether their password was any good. This meter is read by someone
 * mid-signup, often not in their first language: it has to be understood at a
 * glance, or it is decoration.
 */
export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!password) return { score: 0, label: "—" };

  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) || /[^\w\s]/.test(password)) score++;

  const labels = ["Very weak", "Weak", "Okay", "Strong", "Very strong"] as const;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: labels[clamped] };
}
