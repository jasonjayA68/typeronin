import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 renamed Middleware to Proxy; the behaviour is unchanged. It lives in
 * `src/` because that is where `app/` lives — at the repo root it would simply
 * never run.
 *
 * Its only job is refreshing the session cookie. Authorization decisions belong
 * next to the data they protect, not here.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
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
