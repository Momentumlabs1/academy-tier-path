/**
 * CookieBanner — der DSGVO-Hinweis, der beim ersten Besuch unten erscheint.
 *
 * Die Seite setzt echte Cookies (Login-Session + `cosmo_ref` fuer die
 * Partner-Zuordnung), also ist der Hinweis rechtlich noetig, nicht Deko. Was
 * sie NICHT setzt: Tracking, Analytics, Werbe-Cookies. Deshalb ist der Text
 * ehrlich kurz — "nur funktional" — statt der ueblichen Einwilligungs-Wand fuer
 * Dinge, die es hier gar nicht gibt.
 *
 * Die Wahl liegt in localStorage, nicht in einem Cookie: sonst braeuchte der
 * Cookie-Hinweis selbst wieder einen Cookie. Einmal entschieden, bleibt er weg.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "cc_cookie_consent"; // "all" | "essential"

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* privater Modus: dann eben jedes Mal — besser als ein Absturz */
      setShow(true);
    }
  }, []);

  function choose(v: "all" | "essential") {
    try { localStorage.setItem(KEY, v); } catch { /* egal */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-Hinweis"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-[#080b12]/95 px-4 py-4 backdrop-blur-md sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-white/70">
          Wir verwenden nur <span className="font-semibold text-white/90">notwendige Cookies</span> —
          für deinen Login und um zu erkennen, über welchen Partner du gekommen bist.
          Kein Tracking, keine Werbung. Mehr in der{" "}
          <Link to="/datenschutz" className="underline underline-offset-2 hover:text-white">
            Datenschutzerklärung
          </Link>
          .
        </p>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button
            onClick={() => choose("essential")}
            className="flex-1 rounded-full border border-white/15 px-4 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/5 sm:flex-none"
          >
            Nur notwendige
          </button>
          <button
            onClick={() => choose("all")}
            className="flex-1 rounded-full bg-primary px-5 py-2 text-[13px] font-bold text-primary-foreground hover:opacity-90 sm:flex-none"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
