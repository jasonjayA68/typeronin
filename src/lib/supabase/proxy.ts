import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, supabaseEnv } from "@/lib/supabase/env";

/**
 * Signed-in students have no business at the gate.
 *
 * `/reset` must never be added here. A recovery link signs the student in on its
 * way to that page, so bouncing signed-in users off it would make setting a new
 * password impossible — and the failure would look like a redirect loop rather
 * than a permissions bug.
 */
const GATE_ROUTES = ["/login", "/register", "/forgot"];

/**
 * Refreshes the auth session on every navigation and writes the rotated tokens
 * back onto the response.
 *
 * This has to live in the proxy: Server Components cannot set cookies, so
 * without this the refreshed token is computed and then thrown away, which
 * surfaces later as random logouts that are miserable to debug.
 */
export async function updateSession(request: NextRequest) {
  // Nothing to refresh, and no keys to do it with.
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  const { url, key } = supabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Mirror onto the request so the render downstream sees fresh tokens...
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        // ...and onto the response so the browser stores them.
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Supabase hands us no-store headers alongside the cookies. They are not
        // optional: a cached response carrying Set-Cookie would hand one
        // student's session to the next.
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Must be getUser(), not getSession(): this call revalidates the token with
  // the auth server and is what actually triggers the refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (user && GATE_ROUTES.some((route) => pathname.startsWith(route))) {
    const dojo = request.nextUrl.clone();
    dojo.pathname = "/dojo";
    dojo.search = "";
    return NextResponse.redirect(dojo);
  }

  return response;
}
