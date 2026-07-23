import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useSignedVideoUrl — fetches a short-lived SIGNED URL for a gated academy
 * video from the `video-url` edge function, and ONLY when `load()` is called
 * (i.e. the member pressed play). Nothing is pre-loaded, so the page stays fast.
 *
 * The edge function verifies the member's tier server-side, so a locked member
 * never receives a URL — `error` carries the reason ("locked" etc.).
 */
export function useSignedVideoUrl(object?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!object || url || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("video-url", { body: { object } });
      const payload = data as { url?: string; error?: string } | null;
      if (error || !payload?.url) {
        setError(payload?.error ?? error?.message ?? "Video konnte nicht geladen werden.");
      } else {
        setUrl(payload.url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [object, url, loading]);

  return { url, loading, error, load };
}
