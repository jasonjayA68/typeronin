// Prisma reads env itself — Next's loader is not involved here.
// `dotenv/config` only picks up `.env`, but our secrets live in `.env.local`
// (gitignored, and where the Supabase keys already are), so load that too and
// let it win.
import "dotenv/config";
import { promises as dns } from "node:dns";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", override: true, quiet: true });

/**
 * Work around Prisma's migration engine on IPv6-only hosts.
 *
 * Supabase's direct database host (db.<ref>.supabase.co) publishes an AAAA
 * record and no A record. Prisma's Rust schema engine resolves IPv4 only, finds
 * nothing, and reports `P1001: Can't reach database server` — which reads like a
 * firewall or a wrong password and is neither. Handed a literal IPv6 address it
 * connects immediately, so we do the resolution the engine won't.
 *
 * This affects migrations only. The app runtime goes through @prisma/adapter-pg
 * (node-postgres), which resolves IPv6 correctly on its own.
 *
 * Only applied when the host genuinely has no A record, so it is inert on IPv4
 * hosts, on poolers, and on any literal address already supplied.
 */
async function resolvableUrl(raw: string | undefined): Promise<string | undefined> {
  if (!raw) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw; // Not a URL we understand; let Prisma complain about it clearly.
  }

  if (url.hostname.startsWith("[")) return raw; // already literal

  try {
    await dns.resolve4(url.hostname);
    return raw; // IPv4 exists — the engine can cope.
  } catch {
    // No A record. Fall through and try IPv6.
  }

  try {
    const [address] = await dns.resolve6(url.hostname);
    if (!address) return raw;
    url.hostname = `[${address}]`;
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Migrations use the DIRECT connection (port 5432). They issue DDL and hold
 * long sessions, which a transaction pooler cannot carry — that failure looks
 * like a hang rather than an error. The app runtime uses the pooled
 * DATABASE_URL; see src/lib/prisma.ts.
 */
const migrationUrl = await resolvableUrl(process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 takes the seed command from config rather than package.json.
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
