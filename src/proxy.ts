import type { NextRequest } from "next/server";

import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS } from "@/features/security/cookie";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 renamed Middleware to Proxy; the behaviour is unchanged. It lives in
 * `src/` because that is where `app/` lives — at the repo root it would simply
 * never run.
 *
 * Two small jobs: refresh the session cookie (via updateSession), and mint the
 * persistent device id for anyone who does not have one yet, so the anti-abuse
 * anchor predates the first sign-in. Authorization decisions belong next to the
 * data they protect, not here.
 */
export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  if (!request.cookies.get(DEVICE_COOKIE)) {
    response.cookies.set(DEVICE_COOKIE, crypto.randomUUID(), DEVICE_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and images. Auth cookies are irrelevant
     * to a favicon, and running on them would cost a Supabase round trip each.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
