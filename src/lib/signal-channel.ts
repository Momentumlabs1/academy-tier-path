import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { openTelegramApp } from "@/components/academy/signals/telegram-handoff";

/**
 * Der Weg in die SIGNALGRUPPE — an einer Stelle, weil es zwei Kanaele gibt
 * und die Verwechslung teuer ist.
 *
 * Es gibt die oeffentliche INFO-Gruppe (TELEGRAM_ENTRY, fuer Besucher) und die
 * SIGNALGRUPPE (bezahlt, persoenlicher Zugang). An mehreren Stellen der
 * Akademie stand der Info-Link auch fuer Mitglieder, die eingezahlt und ihre
 * Stufe freigeschaltet hatten — die landeten also genau dort, wo die Zahlen
 * NICHT stehen, und mussten selbst merken, dass sie falsch sind.
 *
 * Diese Funktion ist der einzige richtige Weg fuer ein freigeschaltetes
 * Mitglied: `create-telegram-link` gibt einen persoenlichen Zugang aus, an die
 * Sitzung gebunden, nicht an eine geteilte Adresse.
 *
 * SIE WEICHT BEWUSST NICHT AUS. Klappt es nicht, meldet sie das
 * (`{ ok: false }`) — statt ersatzweise die Info-Gruppe zu oeffnen. Lieber
 * ein ehrlicher Fehler als ein Kanal, in dem nichts fuer ihn ist.
 */
export type ChannelResult =
  | { ok: true }
  /** Telegram-App reagierte nicht — dieselbe URL fuer den Zweitversuch. */
  | { ok: false; url: string }
  | { ok: false; url: null };

export async function openPersonalSignalChannel(): Promise<ChannelResult> {
  const { data: sess } = await supabase.auth.getSession();
  const accessToken = sess.session?.access_token;
  if (!accessToken) return { ok: false, url: null };

  let url: string;
  try {
    const res = await fetch(functionUrl("create-telegram-link"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) return { ok: false, url: null };
    url = data.url as string;
  } catch {
    return { ok: false, url: null };
  }

  const opened = await openTelegramApp(url);
  return opened ? { ok: true } : { ok: false, url };
}
