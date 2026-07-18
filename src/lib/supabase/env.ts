/**
 * Supabase configuration, resolved once.
 *
 * These must be referenced as full `process.env.NEXT_PUBLIC_*` literals —
 * Next inlines them at build time by textual substitution, so destructuring or
 * dynamic lookup would leave them undefined in the browser bundle.
 *
 * Supabase renamed the anon key to the "publishable" key; accept either so the
 * project works against both a new and an older dashboard.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether auth can work at all. When false the app still builds and the dojo
 * still trains — only the gate is closed, and it says so rather than failing
 * with an opaque error.
 */
export const isSupabaseConfigured = Boolean(url && key);

export function supabaseEnv(): { url: string; key: string } {
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or _ANON_KEY) in .env.local. " +
        "See .env.example."
    );
  }
  return { url, key };
}
