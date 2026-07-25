import { z } from "zod";

import { PAYOUT_METHODS } from "@/features/withdrawals/model";

/**
 * Saved payout methods — the reusable address book, as validation.
 *
 * Pure (no database, no server-only), so the manage form and the server action
 * check the same rules. The fields mirror what a withdrawal captures — method,
 * holder, destination, extra — because a saved method is exactly a withdrawal
 * destination the user filled in once to reuse.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const payoutMethodSchema = z.object({
  method: z.enum(PAYOUT_METHODS),
  accountName: z.string().trim().min(2, "Give the account holder's name.").max(120),
  accountRef: z.string().trim().min(3, "Give the payout destination.").max(160),
  details: z.string().trim().max(200).default(""),
});

export type PayoutMethodInput = z.infer<typeof payoutMethodSchema>;

/** Which methods a QR code makes sense for — the wallet apps the client uses. */
export const QR_METHODS = ["GCASH", "MAYA", "BANK"] as const;

export function methodTakesQr(method: string): boolean {
  return (QR_METHODS as readonly string[]).includes(method);
}

/** A PayPal/Wise "email" destination must actually be an email. */
export function refLooksValid(method: string, ref: string): boolean {
  if (method === "PAYPAL" || method === "WISE") return EMAIL.test(ref);
  return ref.trim().length >= 3;
}

/** Images accepted for a QR, and the ceiling after client-side resizing. */
export const QR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const QR_MAX_BYTES = 2_000_000;
