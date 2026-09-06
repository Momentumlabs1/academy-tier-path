/**
 * /preview — das gesperrte Dashboard, ohne Anmeldung.
 *
 * WARUM ES DIESE SEITE GIBT
 * Die Registrierung vorne hatte genau EINEN echten Nutzen: danach sah der
 * Besucher das Dashboard, in dem alles auf ihn wartet und alles zu ist. Dieses
 * Bild — "ich bin schon drin, es fehlt nur noch ein Schritt" — hat gezogen. Das
 * Formular davor hat gekostet.
 *
 * Also beides trennen: das Bild bleibt, das Formular faellt weg. Wer hier
 * landet, sieht dasselbe gesperrte Dashboard wie ein registriertes Mitglied vor
 * seiner Einzahlung — nur dass er dafuer nichts ausfuellen musste.
 *
 * WAS HIER BEWUSST NICHT PASSIERT
 * Kein Konto, keine Adresse, kein Datensatz. Diese Seite liest nur das
 * Marken-Cookie, das die Partnerseite gesetzt hat, und schickt weiter. Das
 * Konto entsteht spaeter aus der Einzahlung (bot-unlock) — hier waere es ein
 * zweiter Weg zu demselben Ziel, und zwei Wege laufen irgendwann auseinander.
 *
 * DIE HERKUNFT WIRD HIER NICHT NEU GESETZT.
 * stampAttribution laeuft absichtlich NICHT: der Besucher kommt von der
 * Partnerseite, sein cosmo_ref steht bereits. Ein Stempel hier koennte ihn
 * hoechstens ueberschreiben — und das Haus darf einen Partner nie ueberschreiben.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, PlayCircle, Lock } from "lucide-react";
import { HeroBento } from "@/components/academy/hero/HeroBento";
import { LockedGate } from "@/components/academy/onboarding/LockedGate";
import { usePartnerBrand } from "@/lib/partner-brand";
import { TELEGRAM_ENTRY } from "@/lib/broker";
import { COSMOS_MASTER } from "@/lib/tenants";
import { cn } from "@/lib/utils";
import { LevelRail } from "@/components/academy/tenant/LevelRail";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Your academy — Cosmos Candles" },
      { name: "description", content: "Everything is ready. One step opens it." },
    ],
  }),
  component: Preview,
});

function Preview() {
  const brand = usePartnerBrand();
  const video = useRef<HTMLVideoElement>(null);
  const [gestartet, setGestartet] = useState(false);
  const [ctaDa, setCtaDa] = useState(false);

  const primary = brand?.primaryColor ?? COSMOS_MASTER.primaryColor;
  // Derselbe Vorrang wie auf der Landingpage: der Partner zuerst, sonst wir.
  // Faellt der Partner hier weg, gehoert der Kunde spaeter dem Haus.
  const telegram = brand?.telegramChannel || COSMOS_MASTER.telegramChannel || TELEGRAM_ENTRY.url;

  return (
    <div className="min-h-screen bg-[#05070e] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-20 blur-[120px]"
        style={{ background: primary }}
      />

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Wer den Besucher hergeschickt hat, bleibt sichtbar. Er hat wegen
            dieser Person geklickt, nicht wegen uns. */}
        <div className="flex items-center gap-2.5 text-sm">
          {brand ? (
            <>
              {brand.mascotHeadUrl ? (
                <img src={brand.mascotHeadUrl} alt={brand.name}
                     className="h-8 w-8 rounded-lg object-cover"
                     style={{ boxShadow: `0 0 0 1.5px ${primary}` }} />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-black text-black"
                      style={{ background: primary }}>{brand.logoInitials}</span>
              )}
              <span className="font-semibold">{brand.name}</span>
              <span className="text-white/30">×</span>
            </>
          ) : null}
          <span className="text-white/55">Cosmos Candles</span>
        </div>

        {/* Das kleine Spiel geht hier weiter: Level 1 (Akademie ansehen) ist
            mit dem Aufruf dieser Seite geschafft, Level 2 steht an. Dieselbe
            Leiste wie auf der Partnerseite — der Besucher erkennt sie wieder. */}
        <LevelRail current={2} primary={primary} compact className="mt-5" />

        <h1 className="mt-7 font-display text-[1.9rem] font-black leading-[1.1] tracking-tight sm:text-4xl">
          Everything is ready for you.
          <br />
          <span className="text-white/45">One step opens it.</span>
        </h1>

        {/* Der Film erklaert, was hinter den Kacheln liegt. Er laeuft hier und
            nicht auf der Partnerseite: dort ist er Cosmos' Werbung, hier ist er
            die Erklaerung zu dem, was der Besucher gerade vor sich sieht. */}
        <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <div className="relative aspect-video bg-black">
            <video
              ref={video}
              controls
              playsInline
              preload="metadata"
              poster={COSMOS_MASTER.pitchPoster}
              onPlay={() => { setGestartet(true); setTimeout(() => setCtaDa(true), 450); }}
              className="h-full w-full object-contain"
            >
              <source src={COSMOS_MASTER.pitchVideo} type="video/mp4" />
            </video>
            {!gestartet && (
              <button
                type="button"
                onClick={() => video.current?.play()}
                aria-label="Play video"
                className="group absolute inset-0 flex items-center justify-center bg-black/25"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg ring-1 ring-white/20 transition-transform group-hover:scale-105"
                      style={{ background: primary }}>
                  <PlayCircle className="h-8 w-8 text-black" />
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Der Knopf steht hier von Anfang an sichtbar.
            Auf der Landingpage erscheint er erst beim Play — dort ist der Film
            das Argument und der Knopf die Folge. HIER ist der Knopf der Zweck
            der Seite; wer schon ueberzeugt ist, soll nicht erst ein Video
            starten muessen, um ihn zu finden. Gemessen am 05.09.: unsichtbar
            hinterliess er ein handhohes Loch zwischen Film und Kacheln, das
            aussah wie eine kaputte Seite.
            Der Anflug bleibt als leichte Betonung beim Start. */}
        <div className={cn(
          "mt-6 transition-transform duration-500 ease-out",
          ctaDa ? "translate-y-0" : "translate-y-1",
        )}>
          <a
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-full px-8 text-[15px] font-black text-black transition-transform active:scale-[0.98] sm:w-auto"
            style={{
              background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 88%, white), ${primary})`,
              boxShadow: `0 10px 30px -14px ${primary}, inset 0 1px 0 rgba(255,255,255,0.45)`,
            }}
          >
            Level 2 · Connect Telegram
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            Everything runs on Telegram — that's where a call lands the second our desk
            makes it. A trade you see ten minutes late is a trade you missed. One tap and
            you're in.
          </p>
        </div>

        {/* DAS EIGENTLICHE ARGUMENT: nicht die Beschreibung, sondern der Blick
            auf das fertige Ding mit einem Schloss davor. */}
        <div className="mt-12 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          <Lock className="h-3.5 w-3.5" /> Waiting for you
        </div>
        <div className="mt-4">
          <LockedGate locked label="Unlock live signals, the academy and the tools on Telegram">
            <HeroBento />
          </LockedGate>
        </div>
      </div>
    </div>
  );
}
