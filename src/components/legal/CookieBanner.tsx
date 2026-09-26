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
 *
 * ER DARF NICHTS VERDECKEN (Pruefung 26.09.): der Balken lag auf Ebene 100 ganz
 * unten — also ueber dem festen "Start Level 1" der Partnerseite, ueber der
 * "Start free"-Leiste der Landingpage und ueber der Menueleiste in /preview.
 * Auf einem 375-px-Telefon ist er rund 150 px hoch und deckte damit beim ERSTEN
 * Besuch genau den einen Knopf zu, um den es geht. Deshalb meldet er seine Hoehe
 * als --consent-h an das Wurzelelement; die festen Leisten ruecken um diesen
 * Wert nach oben und fallen zurueck, sobald die Wahl getroffen ist.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "cc_cookie_consent"; // "all" | "essential"

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Hoehe melden, solange der Hinweis steht (und beim Drehen des Geraets).
  useLayoutEffect(() => {
    const wurzel = document.documentElement;
    if (!show) { wurzel.style.setProperty("--consent-h", "0px"); return; }
    const melden = () => wurzel.style.setProperty("--consent-h", `${box.current?.offsetHeight ?? 0}px`);
    melden();
    window.addEventListener("resize", melden);
    return () => { window.removeEventListener("resize", melden); wurzel.style.setProperty("--consent-h", "0px"); };
  }, [show]);

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
      ref={box}
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-[#080b12]/95 px-4 py-4 backdrop-blur-md sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-white/70">
          We only use <span className="font-semibold text-white/90">necessary cookies</span> —
          to keep you signed in and to know which partner you came through.
          No tracking, no advertising. More in our{" "}
          <Link to="/datenschutz" className="underline underline-offset-2 hover:text-white">
            privacy policy
          </Link>
          .
        </p>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button
            onClick={() => choose("essential")}
            className="flex-1 rounded-full border border-white/15 px-4 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/5 sm:flex-none"
          >
            Necessary only
          </button>
          <button
            onClick={() => choose("all")}
            className="flex-1 rounded-full bg-primary px-5 py-2 text-[13px] font-bold text-primary-foreground hover:opacity-90 sm:flex-none"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
