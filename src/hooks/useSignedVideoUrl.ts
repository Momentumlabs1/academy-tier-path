import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useSignedVideoUrl — fetches a short-lived SIGNED URL for a gated academy
 * video from the `video-url` edge function, and ONLY when `load()` is called
 * (i.e. the member pressed play). Nothing is pre-loaded, so the page stays fast.
 *
 * The edge function verifies the member's tier server-side, so a locked member
 * never receives a URL — `error` carries the reason ("locked" etc.).
 *
 * WARUM HIER REFS STEHEN UND NICHT NUR ZUSTAENDE
 * Die Wachen standen frueher in den Abhaengigkeiten von useCallback:
 *     const load = useCallback(..., [object, url, loading]);
 * Damit bekam `load` bei JEDEM Wechsel von `loading` eine neue Identitaet.
 * Ruft ein useEffect diese Funktion auf und hat sie in seinen Abhaengigkeiten,
 * dreht sich das im Kreis: aufrufen -> loading true -> neue Identitaet ->
 * Effekt laeuft neu -> Wache greift -> loading false -> neue Identitaet ->
 * Effekt laeuft neu -> aufrufen. Ein Fehler bricht die Schleife nicht, weil
 * `url` dabei null bleibt.
 *
 * Am 24.08. war genau das zu sehen: bei einem 403 stapelten sich Dutzende
 * identischer POSTs auf /video-url in der Konsole — die Seite fragte, so
 * schnell React neu zeichnen konnte, dieselbe abgelehnte Datei nach.
 *
 * Refs aendern die Identitaet nicht, also bleibt `load` ueber die ganze
 * Lebensdauer dieselbe Funktion. Und ein Fehlschlag wird gemerkt: dieselbe
 * Datei wird nicht von selbst nachgefragt. `retry()` gibt es fuer den Fall,
 * dass ein Mensch es nochmal versuchen will — nach einer Freischaltung etwa.
 */
export function useSignedVideoUrl(object?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = useRef(false);
  const done = useRef(false);

  const load = useCallback(async () => {
    if (!object || busy.current || done.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("video-url", { body: { object } });
      let payload = data as { url?: string; error?: string } | null;

      // BEI 403 STEHT DER GRUND IM KOERPER, NICHT IN error.message.
      //
      // supabase-js wirft bei jedem Nicht-2xx einen FunctionsHttpError und
      // laesst `data` leer. Der Text, den der Nutzer dann sah, war
      // "Edge Function returned a non-2xx status code" — technisch korrekt und
      // fuer den Betroffenen wertlos. Genau das sah aus, als "wuerden die
      // Videos nicht laden", obwohl der Server sauber "locked" geantwortet hat.
      // Die Antwort liegt in error.context; wir holen sie da raus.
      if (error && !payload?.url) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try { payload = await ctx.clone().json(); } catch { /* kein JSON */ }
        }
      }

      if (error || !payload?.url) {
        // Auch ein Fehlschlag ist ein Ergebnis. Ohne diese Markierung fragt die
        // Seite eine abgelehnte Datei endlos nach.
        done.current = true;
        setError(payload?.error ?? error?.message ?? "The video could not be loaded.");
      } else {
        done.current = true;
        setUrl(payload.url);
      }
    } catch (e) {
      done.current = true;
      setError(e instanceof Error ? e.message : "The video could not be loaded.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [object]);

  /** Bewusst von Hand ausgeloest — z. B. nachdem eine Stufe freigeschaltet wurde. */
  const retry = useCallback(() => {
    done.current = false;
    setError(null);
    void load();
  }, [load]);

  return { url, loading, error, load, retry };
}
