// Derives the Edge Functions base URL from the SAME Supabase project the rest
// of the app is configured for (via VITE_SUPABASE_URL / SUPABASE_URL), instead
// of a hardcoded project ref. Fixes the earlier mismatch where three files
// pointed at a stale project.
const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
  "";

if (!SUPABASE_URL) {
  console.error(
    "[Supabase] Missing VITE_SUPABASE_URL / SUPABASE_URL — edge function calls will fail.",
  );
}

/** Full URL of a deployed Edge Function, e.g. functionUrl("admin-tenants"). */
export function functionUrl(name: string): string {
  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${name}`;
}
