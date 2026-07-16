// Read-only access to the SPYSECRET product project — used EXCLUSIVELY to
// display business KPIs in the HQ dashboard via the pre-existing
// admin-dashboard-v3 edge function (admin-gated) and existing tables.
// No HQ/private data is stored here; the Life-OS backend lives in the
// separate "momentum-hq" project (src/integrations/hq/client.ts).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SPYSECRET_URL = "https://bqqmfajowxzkdcvmrtyd.supabase.co";
export const SPYSECRET_PUBLISHABLE_KEY = "sb_publishable_aD2hmKLvzn2tQ_JXt0p2LQ_4KMlJxXy";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpyClient = SupabaseClient<any, "public", any>;

let _client: SpyClient | undefined;

function create(): SpyClient {
  return createClient(SPYSECRET_URL, SPYSECRET_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      storageKey: "hq-spysecret-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const spysecret = new Proxy({} as SpyClient, {
  get(_, prop, receiver) {
    if (!_client) _client = create();
    return Reflect.get(_client, prop, receiver);
  },
});
