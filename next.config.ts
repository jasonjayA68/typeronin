import type { NextConfig } from "next";

/**
 * Where next/image is allowed to fetch from.
 *
 * Derived from the configured project rather than written as a literal: this repo
 * is run against a personal Supabase project by anyone who clones it, and a
 * hardcoded hostname would optimise images for exactly one deployment and quietly
 * refuse every other.
 *
 * The pattern is deliberately narrow — the public media bucket, nothing else. A
 * loose one turns the image optimiser into an open proxy that will fetch, resize
 * and cache whatever URL a stranger appends to /_next/image.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/media/**`)]
      : [],
  },
};

export default nextConfig;
