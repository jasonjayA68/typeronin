import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Where confirmation emails land.
 *
 * Supabase delivers the confirmation one of two ways depending on how the email
 * template is written: a PKCE `code`, or a `token_hash` + `type`. Both are
 * handled here so the route keeps working whichever template the project ends
 * up using.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const failed = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  if (!isSupabaseConfigured) return failed("Accounts are not connected yet.");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failed(error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failed(error.message);
  } else {
    return failed("That confirmation link is incomplete.");
  }

  // The cookies were written onto this response by the server client, so the
  // student arrives at the dojo already signed in.
  const next = searchParams.get("next");
  // Only ever redirect within our own origin — an attacker-supplied `next`
  // would otherwise turn this into an open redirect.
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/dojo";

  return NextResponse.redirect(`${origin}${destination}`);
}
