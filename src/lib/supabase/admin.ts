import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * The service-role client — the one key in this project that bypasses Row Level
 * Security.
 *
 * `server-only` is not decoration here. Every other Supabase client in this repo
 * is safe in a browser bundle because the publishable key is guarded by RLS
 * rather than by secrecy. This one is guarded by secrecy alone: it can read and
 * write every row in every table, and a single accidental client import would
 * ship it to anyone who opens devtools. The import above turns that mistake into
 * a build error instead of a breach.
 *
 * It exists for exactly one job: minting upload tickets for the media bucket, and
 * deleting the objects behind them. Uploading is a *permission* in this product —
 * `media:write`, granted from a table an admin edits — and RLS cannot see that
 * table's answer from inside a storage policy without a security-definer function
 * that would then be its own thing to keep correct. So authorization is decided
 * where every other admin action decides it, in `requirePermission`, and the
 * storage layer is simply not reachable except through code that has already
 * asked. Nothing but this module writes to the bucket.
 *
 * Supabase renamed `service_role` to the "secret" key; accept either so the
 * project works against both a new and an older dashboard.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Whether privileged storage work can happen at all.
 *
 * The media library reads this and says so plainly rather than throwing: someone
 * who cloned the repo without secrets should meet an explanation, not a stack
 * trace. The rest of the panel keeps working without it.
 */
export const isAdminKeyConfigured = Boolean(url && secret);

/**
 * A fresh privileged client.
 *
 * Built per call and never cached across requests — a module-level singleton
 * holding an RLS-bypassing key is the kind of thing that survives a refactor
 * into somewhere it should not be. Session persistence is off because there is
 * no session: the key *is* the authority, and there is nothing to refresh.
 */
export function supabaseAdmin() {
  if (!url || !secret) {
    throw new Error(
      "Supabase service key is not configured. Set SUPABASE_SECRET_KEY (or " +
        "SUPABASE_SERVICE_ROLE_KEY) in .env.local — never in a NEXT_PUBLIC_ " +
        "variable. See .env.example."
    );
  }

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
