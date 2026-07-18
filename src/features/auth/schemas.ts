import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("That does not look like an email address."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Your name needs at least two characters.")
      .max(32, "Keep your name under 32 characters."),
    email: z.email("That does not look like an email address."),
    password: z
      .string()
      .min(10, "Ten characters at minimum. A weak gate guards nothing.")
      .max(128, "That is longer than we can store."),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "The two passwords do not match.",
    path: ["confirm"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({
  email: z.email("That does not look like an email address."),
});

export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    password: z
      .string()
      .min(10, "Ten characters at minimum. A weak gate guards nothing.")
      .max(128, "That is longer than we can store."),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "The two passwords do not match.",
    path: ["confirm"],
  });

export type ResetValues = z.infer<typeof resetSchema>;

/**
 * A rough strength read for the meter — length carries most of the weight
 * because it genuinely does, and we would rather not teach students that a
 * sprinkle of punctuation redeems a short password.
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

  const labels = ["Brittle", "Soft", "Serviceable", "Tempered", "Forged"] as const;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: labels[clamped] };
}
