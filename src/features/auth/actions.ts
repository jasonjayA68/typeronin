"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  forgotSchema,
  loginSchema,
  registerSchema,
  resetSchema,
} from "@/features/auth/schemas";
import { recordLogin, recordLogout } from "@/features/auth/tracking";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthResult =
  | { status: "success" }
  /** Signed up, but the account needs an emailed confirmation first. */
  | { status: "confirm"; email: string }
  | { status: "error"; message: string };

const NOT_CONFIGURED: AuthResult = {
  status: "error",
  message:
    "Accounts are not connected yet — Supabase keys are missing from this deployment. Training will open once they are set.",
};

/**
 * Supabase's messages are serviceable but generic. Translate the handful a
 * student will actually hit; pass anything else through rather than swallowing
 * a real error behind flavour text.
 */
function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password do not match an account.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first — the link is in your inbox.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "That email already has an account. Sign in instead.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Wait a moment before trying again.";
  }
  return message;
}

export async function signIn(
  values: unknown,
  /** The browser's timezone — the one thing no request header carries. */
  timezone?: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  // Never trust the client's validation — it is a convenience, not a control.
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Check the details and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { status: "error", message: readable(error.message) };

  // Record the sign-in from the request. Best-effort and non-blocking — a login
  // is not undone by its own bookkeeping (see features/auth/tracking.ts).
  if (data.user) {
    await recordLogin(data.user, typeof timezone === "string" ? timezone : undefined);
  }

  // The header renders the student's name from the session, so the cached
  // shell has to be dropped or it will keep showing "Sign in".
  revalidatePath("/", "layout");
  return { status: "success" };
}

export async function signUp(values: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Check the details and try again." };
  }

  const supabase = await createClient();

  // Build the confirmation target from the live request rather than a constant,
  // so previews and localhost send students back to themselves.
  const host = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Kept on the auth user so a profiles table is not yet required.
      data: { name: parsed.data.name },
      emailRedirectTo: host ? `${host}/auth/confirm` : undefined,
    },
  });

  if (error) return { status: "error", message: readable(error.message) };

  // With confirmations on, Supabase returns a user but no session.
  if (!data.session) {
    return { status: "confirm", email: parsed.data.email };
  }

  revalidatePath("/", "layout");
  return { status: "success" };
}

/**
 * Sends a recovery link.
 *
 * Always reports success, even for an address we have never seen. Supabase
 * behaves this way deliberately and so do we: a form that says "no such
 * account" is an oracle for testing which of your users has an account here.
 */
export async function requestPasswordReset(values: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "That does not look like an email address." };
  }

  const supabase = await createClient();
  const host = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // The link lands on the confirm route, which trades the token for a session
    // and then forwards to the form where a new password is chosen.
    redirectTo: host ? `${host}/auth/confirm?next=/reset` : undefined,
  });

  // Rate limiting is worth surfacing; existence is not.
  if (error && /rate limit|too many/i.test(error.message)) {
    return { status: "error", message: readable(error.message) };
  }

  return { status: "confirm", email: parsed.data.email };
}

/**
 * Sets a new password. Requires the session minted by the recovery link, which
 * is why this checks for a user rather than accepting an email.
 */
export async function updatePassword(values: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = resetSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Check the details and try again." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "That recovery link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: readable(error.message) };

  revalidatePath("/", "layout");
  return { status: "success" };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    // Stamp the logout while the session still resolves a user.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await recordLogout(user.id);

    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}
