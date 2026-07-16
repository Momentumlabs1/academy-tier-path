// Supabase client for the dedicated "momentum-hq" project — Diego's private
// Life-OS backend (life_* tables + life-brief edge function). Deliberately a
// SEPARATE project from any product database: private data stays private.
// The publishable key is safe to ship in the bundle; all tables are
// RLS-guarded by the life_owners allowlist.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const HQ_URL = "https://qrgvltpakkubtkeukypa.supabase.co";
export const HQ_PUBLISHABLE_KEY = "sb_publishable_XFuqCu4_791UuKSj_gAqgQ_YfWVMR-K";

// No generated types for the HQ schema — src/lib/hq/api.ts owns the typing
// at its boundaries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HqClient = SupabaseClient<any, "public", any>;

let _client: HqClient | undefined;

function create(): HqClient {
  return createClient(HQ_URL, HQ_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      storageKey: "hq-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const hq = new Proxy({} as HqClient, {
  get(_, prop, receiver) {
    if (!_client) _client = create();
    return Reflect.get(_client, prop, receiver);
  },
});
