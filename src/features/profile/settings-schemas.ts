import { z } from "zod";

/**
 * Account-settings validation, shared by the forms and the server actions.
 *
 * Pure — no database, no server-only — so the client form and the action it
 * calls check against exactly the same rules. The password rules mirror
 * registration (see features/auth/schemas.ts); kept here rather than imported so
 * a settings-only change never has to reason about the sign-up flow.
 */

export const profileInfoSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Your name needs at least two characters.")
    .max(32, "Keep your name under 32 characters."),
  bio: z.string().trim().max(300, "Keep your bio under 300 characters.").default(""),
});

export type ProfileInfoValues = z.infer<typeof profileInfoSchema>;

export const emailChangeSchema = z.object({
  email: z.email("That does not look like an email address."),
});

export type EmailChangeValues = z.infer<typeof emailChangeSchema>;

export const passwordChangeSchema = z
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

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

/** Images we accept for an avatar, and the ceiling after client-side resizing. */
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** 2MB — generous for a resized square, tight enough to stay under limits. */
export const AVATAR_MAX_BYTES = 2_000_000;
