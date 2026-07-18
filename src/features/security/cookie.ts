/**
 * The persistent device cookie.
 *
 * Deliberately in its own tiny module with no database and no `server-only`, so
 * the proxy can mint the cookie without dragging Prisma into the middleware
 * bundle, and the server logic can read the same name and options.
 *
 * `httpOnly` because the client has no business reading it — it is an
 * anti-abuse anchor, not a feature flag. `secure` only in production, because a
 * secure cookie is never stored over plain http and dev runs on http localhost.
 * A year, because a device ID that expires weekly defeats the whole point.
 */
export const DEVICE_COOKIE = "sd_device";

export const DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};
