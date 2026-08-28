/**
 * setter-token — der Token aus dem Gespraech mit dem Einzahlungs-Bot.
 *
 * WOFUER
 * Der Setter-Bot begleitet jemanden durch die Einzahlung beim Broker und
 * schickt danach den Akademie-Link. Dieser Link traegt seit heute `?st=<token>`
 * (siehe /opt/cosmos-setter/db.py academy_link). Der Token ist die einzige
 * belastbare Verbindung zwischen dem Bot-Gespraech, dem Broker-Kunden und dem
 * Konto, das gleich entsteht.
 *
 * WARUM ES DEN TOKEN UEBERHAUPT BRAUCHT
 * Zugeordnet wurde bisher ueber die E-Mail-Adresse — mit der Bitte im
 * Bot-Skript, bei uns dieselbe zu nehmen wie beim Broker. Eine Bitte ist keine
 * Verbindung. Wer eine andere Adresse tippt, faellt lautlos durch: er zahlt
 * ein, und bei uns passiert nichts. Bei "Mit Apple anmelden" und verborgener
 * Adresse waere das nicht die Ausnahme, sondern der Normalfall.
 *
 * WARUM EIN COOKIE UND NICHT NUR DIE ADRESSZEILE
 * Zwischen Klick und Registrierung liegt oft noch etwas: erst umsehen, den
 * Film ansehen, spaeter wiederkommen — und bei Google/Apple faehrt die Seite
 * ohnehin ueber den Anbieter und kommt ohne die urspruenglichen Parameter
 * zurueck. Der Token muss diese Umwege ueberleben, sonst traegt er genau dann
 * nicht, wenn man ihn braucht.
 *
 * WARUM DAS UNBEDENKLICH IST
 * Der Token ist keine Vollmacht. Er sagt nur: dieser Browser hat den Link aus
 * dem Bot-Gespraech bekommen. Freischalten kann er nichts — das entscheidet
 * ausschliesslich die Datenbank, und members.setter_token ist gegen Schreiben
 * von aussen gesperrt (Migration 062/063).
 */

const KEY = "cosmo_st";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 Tage, wie cosmo_ref

/** Sieht aus wie ein Token des Bots? "st_" + 12 Hex-Zeichen. */
function looksLikeToken(v: string): boolean {
  return /^st_[a-f0-9]{12}$/i.test(v);
}

/**
 * Faengt `?st=` aus der Adresszeile ab und legt ihn im Cookie ab.
 * Beim ersten Aufruf auf der Seite ausfuehren, an der der Bot-Link landet.
 */
export function captureSetterToken(): void {
  if (typeof window === "undefined") return;
  const v = new URLSearchParams(window.location.search).get("st");
  // Nur was wie ein echter Token aussieht. Sonst landet jeder Tippfehler und
  // jeder fremde Parameter in einem Cookie, das wir spaeter ernst nehmen.
  if (!v || !looksLikeToken(v)) return;
  document.cookie = `${KEY}=${encodeURIComponent(v)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

/** Der gemerkte Token — Adresszeile zuerst, dann Cookie. */
export function readSetterToken(): string | null {
  if (typeof document === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("st");
  if (fromUrl && looksLikeToken(fromUrl)) return fromUrl;
  const m = document.cookie.match(new RegExp("(?:^|; )" + KEY + "=([^;]*)"));
  const v = m ? decodeURIComponent(m[1]) : null;
  return v && looksLikeToken(v) ? v : null;
}
