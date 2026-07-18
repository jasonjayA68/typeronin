import "server-only";

import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";

import { parseUserAgent } from "@/features/auth/user-agent";
import { ensureProfile } from "@/features/profile/service";
import { linkDevice } from "@/features/security/device";
import { prisma } from "@/lib/prisma";

/**
 * Recording who came and went.
 *
 * The location is read from request headers rather than asked for — the platform
 * (Vercel, Cloudflare) attaches geo headers to the edge request, and where it
 * does not, the fields stay null. The IP is kept for fraud monitoring and lives
 * only in the LoginEvent row; it is never returned to the account holder. The
 * one thing the browser must volunteer is its timezone, which no header carries.
 *
 * None of this is allowed to fail a sign-in. A login whose bookkeeping throws is
 * still a successful login — the whole block is best-effort and swallows its own
 * errors.
 */

/** Whatever the edge attached, read defensively. Two-letter country, upper-cased. */
async function requestContext() {
  const h = await headers();

  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  const country =
    h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? h.get("x-country-code") ?? null;
  const region = h.get("x-vercel-ip-country-region") ?? h.get("x-vercel-ip-city") ?? null;

  return {
    ip,
    country: country ? country.slice(0, 2).toUpperCase() : null,
    region: region || null,
    userAgent: h.get("user-agent"),
    acceptLanguage: h.get("accept-language"),
  };
}

/**
 * Record a sign-in.
 *
 * Writes one LoginEvent and freshens the profile's last-seen fields. The
 * timezone is the browser's, passed from the login form; the rest is derived
 * from the request. `registrationSource` is set once, on the first login that
 * finds it empty, from the auth provider.
 */
export async function recordLogin(user: User, timezone?: string): Promise<void> {
  try {
    const profile = await ensureProfile(user);
    const ctx = await requestContext();
    const client = parseUserAgent(ctx.userAgent);

    await prisma.$transaction([
      prisma.loginEvent.create({
        data: {
          profileId: profile.id,
          ip: ctx.ip,
          browser: client.browser,
          os: client.os,
          device: client.device,
          country: ctx.country,
          region: ctx.region,
        },
      }),
      prisma.profile.update({
        where: { id: profile.id },
        data: {
          lastLoginAt: new Date(),
          // Only overwrite location when we actually learned something, so a
          // header-less login does not wipe a country a previous one captured.
          ...(timezone ? { timezone } : {}),
          ...(ctx.country ? { countryCode: ctx.country } : {}),
          ...(ctx.region ? { region: ctx.region } : {}),
          // Set once, never rewritten.
          ...(profile.registrationSource
            ? {}
            : { registrationSource: providerOf(user) }),
        },
      }),
    ]);

    // Tie this account to its device. Flags a shared device for review; never
    // blocks. Best-effort — see features/security/device.ts.
    await linkDevice(profile.id, {
      userAgent: ctx.userAgent,
      acceptLanguage: ctx.acceptLanguage,
      timezone,
      ip: ctx.ip,
    });
  } catch (error) {
    console.error("recordLogin failed (non-fatal)", error);
  }
}

/** Stamp the logout time. Best-effort, and never blocks signing out. */
export async function recordLogout(userId: string): Promise<void> {
  try {
    await prisma.profile.update({
      where: { id: userId },
      data: { lastLogoutAt: new Date() },
      select: { id: true },
    });
  } catch (error) {
    // A logout for a profile that never got created is a no-op, not an error.
    if ((error as { code?: string }).code !== "P2025") {
      console.error("recordLogout failed (non-fatal)", error);
    }
  }
}

/** How they authenticated: "email", "google", … Supabase carries this. */
function providerOf(user: User): string {
  const provider = user.app_metadata?.provider;
  return typeof provider === "string" && provider ? provider : "email";
}
