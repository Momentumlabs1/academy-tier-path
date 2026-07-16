// Supabase client for the SPYSECRET project — the backend of the personal
// HQ / Life-OS dashboard (life_* tables, KPI RPCs, life-brief edge function).
// This is a separate project from the academy's Lovable Cloud instance, so it
// gets its own client. The publishable key is safe to ship in the bundle;
// all life_* tables are RLS-guarded by the life_owners allowlist.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SPYSECRET_URL = "https://bqqmfajowxzkdcvmrtyd.supabase.co";
const SPYSECRET_PUBLISHABLE_KEY = "sb_publishable_aD2hmKLvzn2tQ_JXt0p2LQ_4KMlJxXy";

// No generated types for the SPYSECRET schema — the HQ data layer
// (src/lib/hq/api.ts) owns the typing at its boundaries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HqClient = SupabaseClient<any, "public", any>;

let _client: HqClient | undefined;

function create(): HqClient {
  return createClient(SPYSECRET_URL, SPYSECRET_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      storageKey: "hq-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const spysecret = new Proxy({} as HqClient, {
  get(_, prop, receiver) {
    if (!_client) _client = create();
    return Reflect.get(_client, prop, receiver);
  },
});
