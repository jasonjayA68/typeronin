import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-url";

/**
 * What a crawler may read.
 *
 * The blog is the point of this file: an ad-funded site earns from pages search
 * engines can find, so everything public is open and the sitemap is advertised
 * here rather than left to be discovered.
 *
 * The disallowed paths are the ones that are either private, per-account, or
 * worthless in an index. None of them is a security control — every one of them
 * is already guarded server-side, and robots.txt is a request, not a lock. It is
 * here so that crawl budget is spent on the blog instead of on login forms, and
 * so a signed-out crawler does not fill an index with redirect pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", // staff only, and 404s for everyone else anyway
        "/dashboard", // per-account
        "/withdrawals", // per-account, and money
        "/auth/", // confirmation callbacks, single-use
        "/login",
        "/register",
        "/forgot",
        "/reset",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
