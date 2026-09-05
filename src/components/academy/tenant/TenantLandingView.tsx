/**
 * TenantLandingView — the branded landing page and WHITE-LABEL TEMPLATE. Driven
 * by a resolved TenantConfig (static OR DB-backed), rendered by /t/:slug, /:slug
 * and the master "/" (Cosmos Candles) page.
 *
 * Art direction: the name is the concept. "Cosmos Candles" = a night-cosmos
 * built out of candlesticks, and Cosmo is the guide who lives in it. The page
 * commits to that world — a cinematic candle-field hero, oversized editorial
 * section numbers, and the lime "COSMO" coach-badge motif recurring throughout.
 * Every partner inherits the same world, skinned to their colors/broker/mascot.
 *
 * Surface system (20.08.2026): sections sit on alternating full-width bands —
 * base ground vs a raised `border-y border-white/[0.07] bg-white/[0.022]` —
 * the structure proven on /partner-program, so sections separate structurally
 * instead of typographically. Section heads are number + kicker + title with
 * NO lead paragraph, and each card/claim carries exactly one sentence. The
 * SECTION ORDER is researched and fixed; do not reorder or remove sections.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight, CheckCircle2, Lock, Shield, Star,
  PlayCircle, BadgeCheck, Wallet, Building2, Radio, GraduationCap, LineChart, Zap,
  Bot, Trophy, ListChecks, Layers,
} from "lucide-react";
import { TIERS, LESSONS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { stampAttribution, usePartnerBrand } from "@/lib/partner-brand";
import { supabase } from "@/integrations/supabase/client";
import type { TenantConfig } from "@/lib/tenants";
import { BROKER, BROKER_SWITCH, TELEGRAM_ENTRY } from "@/lib/broker";
import { RiskWarning } from "@/components/academy/legal/RiskWarning";
import { CommissionDisclosure } from "@/components/academy/legal/CommissionDisclosure";
import { DeskResults } from "@/components/academy/tenant/DeskResults";
import {
  SignalsPreview, BotPreview, AcademyPreview, QuizPreview, RewardsPreview, WhitelabelPreview,
} from "@/components/academy/tenant/LandingPreviews";


// ── Orbit engine (pure CSS 3D — GPU only, no z-index, no per-frame repaint) ──
// Candles sit on a real 3D ring around Cosmo. The ring spins on ONE animated
// transform (rotateY); the browser resolves front/back occlusion against Cosmo
// from 3D depth for free, and perspective handles the size falloff. Each candle
// billboards (counter-rotates) so it always faces the camera. Buttery + cheap.
const ORBIT_DUR = 34; // seconds per revolution (slow, calm)
const ORBIT_N = 12;

// Per-candle: fixed angle on the ring + varied size, height and wick/body
// proportions so no two look alike. SSR-safe (deterministic).
const ORBIT_ITEMS = Array.from({ length: ORBIT_N }, (_, i) => {
  const angle = (i * 360) / ORBIT_N;
  const h = 30 + ((i * 17) % 9) * 4.5;        // 30 → 66 px
  const w = Math.max(6, h * 0.2);
  const y = (((i * 7) % 5) - 2) * 9;          // −18 → 18 px height offset
  const bh = 40 + ((i * 11) % 5) * 6;         // body height 40 → 64 %
  const bt = Math.min(80 - bh, Math.max(6, (100 - bh) / 2 + (((i * 3) % 3) - 1) * 9));
  const isUp = (i * 5) % 3 !== 0;
  return { angle, h, w, y, bh, bt: Number(bt.toFixed(1)), isUp };
});

function CandleShape({ up, down, isUp, bt, bh, growDelay }: { up: string; down: string; isUp: boolean; bt: number; bh: number; growDelay?: number }) {
  const c = isUp ? up : down;
  const lit = `color-mix(in oklch, ${c} 55%, white)`;
  const shade = `color-mix(in oklch, ${c} 82%, black)`;
  return (
    // Staggered grow-in: the ring assembles candle by candle instead of
    // popping in whole. The class lives on this span because it carries no
    // inline transform — the sizing wrapper above does, and candleGrow's
    // scaleY would fight it there.
    <span className={"relative block h-full w-full" + (growDelay != null ? " candle-grow" : "")}
          style={growDelay != null ? { animationDelay: `${growDelay.toFixed(2)}s` } : undefined}>
      {/* wick — thin, rounded caps, faintly lit */}
      <span className="absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-full" style={{ width: "14%", minWidth: 1.5, background: `linear-gradient(180deg, ${lit}, color-mix(in oklch, ${c} 55%, transparent))` }} />
      {/* body — rounded, top-lit gradient, crisp edge + colour glow */}
      <span className="absolute left-0 w-full rounded-[3px]" style={{
        top: `${bt}%`, height: `${bh}%`,
        background: `linear-gradient(165deg, ${lit} 0%, ${c} 42%, ${shade} 100%)`,
        boxShadow: `0 0 16px -4px ${c}, 0 1px 2px rgba(0,0,0,.35), inset 0 1px 0 color-mix(in oklch, ${c} 30%, white), inset 0 0 0 0.5px color-mix(in oklch, ${c} 55%, white)`,
      }} />
    </span>
  );
}

export function TenantLandingView({ tenant }: { tenant: TenantConfig }) {
  const navigate = useNavigate();

  // Poster-Overlay fuer das Pitch-Video: weicht beim Start, kehrt am Ende zurueck.
  const pitchRef = useRef<HTMLVideoElement>(null);
  const [pitchPlaying, setPitchPlaying] = useState(false);
  // ZWEI Merker, nicht einer.
  //
  // `pitchPlaying` steuert nur das Poster-Overlay und kippt bei Pause und am
  // Ende zurueck. Die Knoepfe duerfen das NICHT tun: im Film sagt Cosmo "drueck
  // unten auf die Knoepfe" — wer an dieser Stelle pausiert, um genau das zu
  // tun, saehe sie sonst wieder verschwinden. Einmal gestartet heisst: ab
  // jetzt sichtbar.
  const [pitchStarted, setPitchStarted] = useState(false);
  const [pitchEnded, setPitchEnded] = useState(false);
  /* Die weiche Einblendung der Knoepfe haengt an DIESEM Zustand, nicht an
     einer CSS-Animation.
     Erst lief sie ueber `animation` mit Verzoegerung und fill-mode. Live
     nachgemessen war der Knopf zwei Sekunden nach dem Start immer noch auf
     opacity 0: laeuft die Animation gar nicht erst an — gedrosselter Tab,
     Seite im Hintergrund, Engine fuehrt sie nicht aus —, haelt die Fuellung
     den Startwert fest und der einzige Knopf unter dem Film bleibt
     unsichtbar. Auch `backwards` hilft da nicht.
     Jetzt schaltet ein Timer nach 450 ms den Zustand um, und die Klassen
     tragen den Ruhezustand SICHTBAR. Bleibt der Uebergang aus, springt der
     Knopf einfach hin — nie weg. */
  const [ctaIn, setCtaIn] = useState(false);

  /**
   * Wohin der Knopf unter dem Film fuehrt.
   *
   * NICHT mehr zur Registrierung. Der Besucher hat gerade den Film gesehen und
   * ist so warm, wie er auf dieser Seite je wird — ihn jetzt ein Formular
   * ausfuellen zu lassen, kostet genau an dieser Stelle. Ab hier laeuft alles
   * ueber Telegram; das Konto entsteht spaeter aus der Einzahlung.
   *
   * Die Reihenfolge der Quellen ist die Herkunftskette:
   *   1. Der Partner aus dem cosmo_brand-Cookie — er hat den Besucher gebracht,
   *      und sein Einladungslink ist das, woran der Bot ihn spaeter erkennt.
   *      Faellt der weg, gehoert der Kunde dem Haus statt dem Partner, und das
   *      ist nach dem Anlegen nicht mehr zu reparieren.
   *   2. Der Kanal des Mandanten, dessen Seite gerade laeuft.
   *   3. Unser eigener Eingang.
   */
  const brand = usePartnerBrand();
  const telegramZiel = brand?.telegramChannel || tenant.telegramChannel || TELEGRAM_ENTRY.url;

  /**
   * JEDER Hauptknopf dieser Seite fuehrt nach Telegram, nicht in ein Formular.
   *
   * Bis zum 05.09. musste man sich zuerst registrieren, damit man das gesperrte
   * Dashboard sieht und dadurch Lust auf Telegram bekommt. Der Weg war: Video,
   * Formular, nochmal Video, dann Telegram — vier Schritte fuer eine Sache, die
   * einer ist. Das Konto entsteht jetzt am Ende von selbst, aus der Einzahlung
   * (bot-unlock), und der Kunde wird genau einmal nach einer Adresse gefragt.
   *
   * Anmelden koennen sich bestehende Mitglieder weiterhin — der "Sign in"-Link
   * daneben bleibt. Nur der Weg HINEIN geht nicht mehr ueber ein Formular.
   */
  const goTelegram = () => {
    if (typeof window !== "undefined") window.open(telegramZiel, "_blank", "noopener,noreferrer");
  };

  const showCosmo = tenant.slug === "cosmos-candles";
  // Der Hero traegt das Maskottchen nur noch, wenn es KEIN Kopfzeilen-Portrait
  // gibt. Zekos Bild sass vorher an beiden Stellen; im Hero fraß es auf dem
  // Telefon die halbe erste Bildschirmhoehe und schob Ueberschrift, Knopf und
  // Video unter die Kante. Cosmo bleibt dort — sein Kreis aus Kerzen IST der
  // Hero unserer eigenen Seite, kein Profilbild.
  const heroHasMascot = showCosmo || (tenant.mascot === "zeko" && !tenant.mascotHeadUrl);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Eine Regel, an einer Stelle: das Haus ueberschreibt nie einen Partner.
    stampAttribution(tenant);
    // The partner dashboard's headline number counts affiliate_clicks — and
    // until 21.08. nothing ever wrote that table, so every partner would have
    // stared at a zero forever. One click per tab session, recorded through a
    // definer RPC that resolves the slug server-side; fire-and-forget, a
    // failed insert must never touch the visitor.
    const key = `cc_click_${tenant.slug}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      const params = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      for (const [k, v] of params) if (k.startsWith("utm_") || k === "ref") utm[k] = v;
      void supabase.rpc("record_affiliate_click", {
        p_slug: tenant.slug,
        p_referrer: document.referrer || null,
        p_utm: Object.keys(utm).length ? utm : null,
        p_user_agent: navigator.userAgent.slice(0, 300),
      }).then(({ error }) => { if (error) console.warn("[click]", error.message); });
    }
  }, [tenant]);

  const primary = tenant.primaryColor;
  const accent = tenant.accentColor;
  const up = "oklch(0.82 0.17 150)";
  const down = "oklch(0.66 0.2 22)";

  /* Ein Knopf-Look fuer die ganze Seite. Vorher war jeder Knopf eine flache
     Flaeche in Markenfarbe mit einem weichen Schlagschatten darunter — auf dem
     Handy, wo sie fast die ganze Breite einnehmen, sah das aus wie ein
     unveraendertes Framework-Standardteil. Der leichte Verlauf und die helle
     Innenkante geben der Flaeche eine Oberflaeche; der Schatten wird dafuer
     kleiner, damit der Knopf nicht schwebt. */
  const cta = {
    background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 86%, white), ${primary})`,
    boxShadow: `0 8px 22px -12px ${primary}, inset 0 1px 0 rgba(255,255,255,0.45)`,
    color: "#000",
  } as const;

  // Traegt der Hero kein Maskottchen, traegt er den Film. Zekos Portrait sitzt
  // in der Kopfzeile, weshalb die rechte Hero-Spalte leer blieb und auf dem
  // Desktop als schwarze Flaeche neben der Ueberschrift stand.
  const heroHasVideo = !heroHasMascot && Boolean(tenant.pitchVideo);

  const pitchPlayer = (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
        <div className="relative aspect-video bg-black">
          {/* Der Platzhalter lag mit `pointer-events-none absolute inset-0`
              dauerhaft ueber dem Player — das Video war auch mit Datei nie
              zu sehen. Jetzt traegt das Poster diese Rolle, und der
              Play-Knopf verschwindet beim Start. */}
          <video
            ref={pitchRef}
            controls
            playsInline
            // metadata statt none: laedt beim Seitenaufruf NUR den Video-Index
            // (faststart legt ihn an den Dateianfang, wenige hundert KB) —
            // der Klick startet dadurch sofort, gestreamt wird progressiv.
            preload="metadata"
            poster={tenant.pitchPoster ?? "/pitch-poster.jpg?v=7"}
            onPlay={() => {
              setPitchPlaying(true); setPitchStarted(true); setPitchEnded(false);
              // Kurz warten, damit die Knoepfe in die Aufmerksamkeit
              // hineinwachsen statt sie im selben Bild zu unterbrechen.
              setTimeout(() => setCtaIn(true), 450);
            }}
            onEnded={() => { setPitchPlaying(false); setPitchEnded(true); }}
            // object-contain, nicht cover: im Vollbild (16:10-Displays)
            // schnitt cover links und rechts ab — genau dort sitzen im
            // Video die Einblendungen.
            className="h-full w-full object-contain"
          >
            <source src={tenant.pitchVideo} type="video/mp4" />
          </video>
          {!pitchPlaying && (
            <button
              type="button"
              onClick={() => pitchRef.current?.play()}
              aria-label="Play video"
              className="group absolute inset-0 flex cursor-pointer items-center justify-center bg-black/25"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105" style={{ background: primary }}>
                <PlayCircle className="h-8 w-8 text-black" />
              </span>
            </button>
          )}
        </div>
      </div>
  );

  return (
    <div className="relative min-h-screen overflow-clip bg-[#05070e] font-sans text-white">
      <style>{`
        @keyframes cosmoFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
        .cosmo-float { animation: cosmoFloat 6s ease-in-out infinite; will-change: transform; }
        @keyframes cosmoBob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        .cosmo-bob { animation: cosmoBob 6.5s ease-in-out infinite; }
        @keyframes chipFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-11px); } }
        .chip-float { animation: chipFloat 4.5s ease-in-out infinite; }
        @keyframes candleGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .candle-grow { transform-origin: bottom; animation: candleGrow .9s cubic-bezier(.2,.8,.2,1) both; } }
        /* ── Apple-grade material system ─────────────────────────────────
           Sheen: headlines carry a vertical metallic gradient instead of flat
           white — the single cheapest "expensive" move on dark grounds. A
           child span that sets its own color (the brand-colored word) stays
           opaque and simply floats on top.
           Glass: cards get a top-edge highlight + vertical falloff, so they
           read as material, not as outlined rectangles.
           Exit: the hero eases out as you scroll away — scroll-driven, so it
           tracks the finger, not a timer; @supports keeps it progressive. */
        .apl-sheen { background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,.92) 55%, rgba(255,255,255,.55) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .apl-card { background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.02)); box-shadow: inset 0 1px 0 rgba(255,255,255,.07); }
        .cta-btn { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1); }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 44px -12px color-mix(in oklch, ${primary} 65%, transparent); }
        /* Die Einblendung der Knoepfe unter dem Film liegt NICHT hier, sondern
           am Zustand "ctaIn" — siehe dort. Eine CSS-Animation mit Verzoegerung
           hat den Knopf live nachweislich unsichtbar gelassen, wenn sie gar
           nicht erst anlief. Hier bleibt nur der Pfeil, der beim Zeigen
           mitgeht: ein Schmuck, dessen Ausfall niemandem etwas nimmt. */
        .cta-arrow { transition: transform .25s cubic-bezier(.22,1,.36,1); }
        .cta-btn:hover .cta-arrow { transform: translateX(3px); }
        @media (prefers-reduced-motion: reduce) { .cta-arrow { transition: none; } }
        @keyframes heroExit { to { opacity:.3; transform: translateY(-28px) scale(.985); } }
        @supports (animation-timeline: scroll()) {
          .hero-exit { animation: heroExit linear both; animation-timeline: scroll(root); animation-range: 0 70vh; }
        }
        /* Most visitors are on phones: one thumb-height CTA that slides in
           once the hero's own buttons have scrolled away. Scroll-driven, so
           it arrives exactly when the hero CTA leaves — not on a timer. */
        @keyframes mCtaIn { from { opacity:0; transform: translateY(110%); } to { opacity:1; transform: translateY(0); } }
        @supports (animation-timeline: scroll()) {
          .m-cta { animation: mCtaIn linear both; animation-timeline: scroll(root); animation-range: 55vh 85vh; }
        }
        @keyframes twinkle { 0%,100% { opacity:.15; } 50% { opacity:.8; } }
        .twinkle { animation: twinkle 4s ease-in-out infinite; }
        /* One orchestrated load for the hero, and a scroll reveal for the bands.
           Same system as /partner-program: pure CSS, so SSR paints the final
           state and browsers without animation-timeline just show the section. */
        @keyframes lvRise { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
        .lv-in  { animation: lvRise .7s cubic-bezier(.22,1,.36,1) both; }
        .lv-in2 { animation: lvRise .7s cubic-bezier(.22,1,.36,1) .12s both; }
        .lv-in3 { animation: lvRise .7s cubic-bezier(.22,1,.36,1) .24s both; }
        .lv-in4 { animation: lvRise .7s cubic-bezier(.22,1,.36,1) .36s both; }
        @supports (animation-timeline: view()) {
          .lv-reveal { animation: lvRise .8s cubic-bezier(.22,1,.36,1) both;
                       animation-timeline: view(); animation-range: entry 0% entry 38%; }
        }
        /* ── Kapitel-Choreografie (Scroll-gescrubbt) ─────────────────────
           Jedes Showcase-Kapitel baut sich beim Reinscrollen auf: das
           Watermark-Numeral driftet langsamer als der Inhalt (Parallax ueber
           die gesamte Sichtbarkeit), das Vorschau-Fenster kippt aus einer
           leichten 3D-Neigung ein, Text und Punkte-Chips folgen gestaffelt.
           Alles endet auf transform:none, damit nach dem Aufbau KEINE
           Transform-Reste auf interaktiven Kindern (Video, Quiz) liegen.
           Nur innerhalb @supports — ohne view()-Unterstuetzung steht sofort
           der Endzustand, exakt wie beim lv-reveal-System darueber. */
        /* Die Fenster sind bewusst SPAET gelegt (entry 25%+): frueher lagen
           sie bei entry 0-50%, und auf einem grossen Monitor war der Aufbau
           fertig, waehrend die Karte noch am unteren Bildrand klebte — beim
           Hinschauen stand alles, "keine Animationen beim Scrollen". Jetzt
           passiert die Bewegung dort, wo der Blick ist, und die Wege sind
           gross genug, um unuebersehbar zu sein. */
        @keyframes scNum   { from { transform: translateY(72px); } to { transform: translateY(-48px); } }
        @keyframes scFrame { from { opacity: 0; transform: perspective(900px) rotateX(7deg) translateY(64px) scale(.95); } }
        @keyframes scCopy  { from { opacity: 0; transform: translateY(42px); } }
        @supports (animation-timeline: view()) {
          .sc-num   { animation: scNum linear both; animation-timeline: view(); animation-range: cover 0% cover 100%; }
          .sc-frame { animation: scFrame cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 20% entry 75%; }
          .sc-copy  { animation: scCopy  cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 30% entry 82%; }
          .sc-chips > :nth-child(1) { animation: scCopy cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 38% entry 88%; }
          .sc-chips > :nth-child(2) { animation: scCopy cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 46% entry 94%; }
          .sc-chips > :nth-child(3) { animation: scCopy cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 54% entry 100%; }
        }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        .spin-slow { animation: spinSlow 48s linear infinite; }
        .spin-rev { animation: spinSlow 60s linear infinite reverse; }
        @keyframes auraPulse { 0%,100% { opacity:.55; transform:scale(1);} 50% { opacity:.85; transform:scale(1.06);} }
        .aura-pulse { animation: auraPulse 7s ease-in-out infinite; }
        /* 3D orbit — one GPU transform drives the whole ring, no z-index/repaint */
        @keyframes cosmoRingSpin { to { transform: rotateY(360deg); } }
        @keyframes cosmoRingSpinRev { to { transform: rotateY(-360deg); } }
        /* Kein left/top+translate(-50%) mehr: auf dem iPhone schob genau diese
           Kette Cosmo aus der Ringmitte nach rechts. Grid zentriert ihn
           layoutseitig; die Animation traegt nur noch Schwebeweg + Z-Tiefe. */
        @keyframes cosmoLotusFloat { 0%,100% { transform: translateZ(0.01px) translateY(0); } 50% { transform: translateZ(0.01px) translateY(-14px); } }
        /* Radius des Kerzenrings.
           Stand vorher als 30cqw direkt im translateZ(). Container-Einheiten
           INNERHALB einer 3D-Transformation loest iOS-Safari unzuverlässig auf:
           faellt der Wert auf 0, sitzen alle zwoelf Kerzen im Mittelpunkt statt
           auf einer Bahn, und die Gruppe kippt sichtbar aus der Mitte — genau
           das war auf dem iPhone zu sehen, waehrend Chrome bei exakt 0px
           Versatz mass. Feste Pixel je Breite sind ueberall gleich. Die Werte
           sind 30 % der jeweiligen Buehnenbreite (290 / 420 / 500). */
        .orbit-stage { perspective: 640px; --orbit-r: 87px; }
        @media (min-width: 640px)  { .orbit-stage { --orbit-r: 126px; } }
        @media (min-width: 1024px) { .orbit-stage { --orbit-r: 150px; } }
        .orbit-scene { position:absolute; inset:0; transform-style:preserve-3d; display:grid; place-items:center; }
        .orbit-ring { position:absolute; inset:0; transform-style:preserve-3d; animation: cosmoRingSpin ${ORBIT_DUR}s linear infinite; will-change: transform; }
        .orbit-pos { position:absolute; left:50%; top:50%; transform-style:preserve-3d; }
        /* Depth cue: a candle passing behind Cosmo dims and desaturates. The
           ring spins linearly, so a linear keyframe with a per-candle negative
           delay of -(angle/360)*duration stays in phase with it forever. Only
           opacity+filter animate here — the billboard transform is inline. */
        @keyframes orbitDepth { 0%,100% { opacity:1; filter:none; } 50% { opacity:.4; filter:saturate(.7) brightness(.65); } }
        .orbit-bill { transform-style:preserve-3d; }
        .orbit-depth { animation: orbitDepth ${ORBIT_DUR}s linear infinite; }
        .orbit-spin { animation: cosmoRingSpinRev ${ORBIT_DUR}s linear infinite; will-change: transform; }
        .cosmo-lotus { position:relative; transform: translateZ(0.01px); animation: cosmoLotusFloat 6s ease-in-out infinite; transition: filter .4s ease; backface-visibility:hidden; }
        /* hover: Cosmo brightens, candles speed up — cheap filter/timing only */
        .orbit-stage:hover .cosmo-lotus { filter: brightness(1.05) drop-shadow(0 0 26px color-mix(in oklch, ${accent} 45%, transparent)); }
        .orbit-stage:hover .orbit-ring, .orbit-stage:hover .orbit-spin, .orbit-stage:hover .orbit-depth { animation-duration: ${Math.round(ORBIT_DUR * 0.6)}s; }
        @media (prefers-reduced-motion: reduce) {
          .cosmo-float,.cosmo-bob,.chip-float,.candle-grow,.twinkle,.spin-slow,.spin-rev,.aura-pulse,.orbit-ring,.orbit-spin,.orbit-depth,.cosmo-lotus,.lv-in,.lv-in2,.lv-in3,.lv-in4,.lv-reveal,.hero-exit,.m-cta,.sc-num,.sc-frame,.sc-copy,.sc-chips > * { animation: none !important; }
        }
      `}</style>

      {/* ─────────────────────────── NAV ─────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#05070e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            {showCosmo ? (
              <img src="/cosmos-logo.png" alt="Cosmos Candles Academy" className="h-9 w-auto" />
            ) : (
              <>
                {/* Das Portrait gehoert HIERHIN, nicht in den Hero.
                    Dort nahm es die halbe erste Bildschirmhoehe ein und
                    schob Ueberschrift, Knopf und Video unter die Kante —
                    also genau das weg, wofuer jemand die Seite oeffnet. Hier
                    tut es, wofuer ein Profilbild da ist: den Namen an ein
                    Gesicht binden, in der Groesse eines Logos. Ohne eigenes
                    Bild bleiben die Initialen. */}
                {tenant.mascotHeadUrl ? (
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-xl"
                        style={{ border: `1.5px solid color-mix(in oklch, ${primary} 55%, transparent)` }}>
                    <img src={tenant.mascotHeadUrl} alt={tenant.name}
                         className="h-full w-full object-cover" style={{ objectPosition: "50% 22%" }} />
                  </span>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-black" style={{ background: primary }}>
                    {tenant.logoInitials}
                  </span>
                )}
                <span className="font-display text-lg font-bold tracking-tight">{tenant.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Points at /signup, not /login: /login is the admin Command Center,
                so a returning member who tapped this used to land on a door their
                credentials cannot open. /signup signs existing members straight in.
                Never hidden on mobile either — that left a phone visitor with no
                way back into their own account at all. */}
            <Link to="/signup" className="inline-flex min-h-[44px] items-center rounded-full px-3 py-2 text-sm font-medium text-white/70 hover:text-white sm:px-4">Sign in</Link>
            <button onClick={goTelegram}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-black shadow-lg transition-transform hover:-translate-y-0.5"
              style={cta}>
              Join on Telegram <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        {/* cosmos backdrop: stars + nebula glows */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-[15%] h-[620px] w-[620px] rounded-full blur-[130px]" style={{ background: `color-mix(in oklch, ${accent} 26%, transparent)` }} />
          <div className="absolute top-10 right-[5%] h-[520px] w-[520px] rounded-full blur-[130px]" style={{ background: `color-mix(in oklch, ${primary} 16%, transparent)` }} />
          {/* Sternenfeld NUR auf unserer eigenen Seite.
              "Cosmos Candles" heisst Nachthimmel aus Kerzen — dort tragen die
              Punkte die Idee. Auf Zekos gruener Seite sind es einfach
              blinkende Punkte, die mit Trading nichts zu tun haben und die
              Seite unruhig machen. Fuer Partner bleiben nur die weichen
              Farbschleier, in IHRER Farbe. */}
          {showCosmo && [["12%","18%"],["28%","62%"],["44%","28%"],["70%","70%"],["82%","20%"],["58%","48%"],["36%","82%"],["90%","54%"],["20%","40%"],["66%","12%"]].map(([t,l],i) => (
            <span key={i} className="twinkle absolute h-1 w-1 rounded-full bg-white" style={{ top:t, left:l, animationDelay:`${i*0.5}s` }} />
          ))}
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pb-8 pt-6 sm:gap-10 sm:pb-16 sm:px-8 sm:pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:pb-24 lg:pt-16">
          {/* Left: copy */}
          <div className="hero-exit relative z-20 text-center lg:text-left">
            {/* Auf der EIGENEN Seite keine Namens-Pille: Logo oben links sagt
                es schon, und zwischen Cosmo und der Headline war sie nur ein
                Stolperstein ("macht keinen Sinn"). Partner-Seiten behalten die
                Powered-by-Attribution — dort ist sie Information. */}
            {!showCosmo && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 sm:mb-6 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: primary }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: primary }} /></span>
                Powered by Cosmos Candles
              </div>
            )}

            <h1 className="lv-in2 apl-sheen font-display text-[2.1rem] font-black leading-[1.02] tracking-tight [text-wrap:balance] sm:text-5xl sm:leading-[0.98] lg:text-6xl xl:text-[4.25rem] lg:leading-[0.95]">
              {showCosmo ? (
                <>Learn to trade<br />the <span style={{ color: primary }}>whole cosmos.</span></>
              ) : (tenant.headline ?? tenant.tagline)}
            </h1>
            <p className="lv-in3 mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/65 sm:mt-5 sm:max-w-lg sm:text-lg lg:mx-0">
              {showCosmo
                ? "Live signals, a course from zero, and pro orderflow tools. Free — Cosmo reads every candle with you."
                : (tenant.subhead ?? tenant.description)}
            </p>

            <div className="lv-in4 mt-6 flex flex-col items-stretch gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 lg:justify-start">
              <button onClick={goTelegram}
                className="cta-btn group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[13px] font-black text-black sm:py-3"
                style={cta}>
                Start free — €0 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              {/* KEIN Weg von einer oeffentlichen Seite direkt nach Telegram.
                  Weder hier noch auf einer Partnerseite — der Kanal kommt
                  IMMER erst nach der Registrierung.

                  Hier stand zuerst tenant.telegramChannel (Zekos leerer Info-
                  Kanal), dann unser Kanal. Beides hatte dasselbe Loch: wer
                  vor der Registrierung nach Telegram abbiegt, verlaesst den
                  Browser, in dem sein cosmo_ref-Cookie liegt. Kommt er spaeter
                  ueber einen Link IM Kanal zurueck, oeffnet Telegram seinen
                  eigenen In-App-Browser — anderer Cookie-Topf, kein Cookie,
                  keine Herkunft. Der Kunde zaehlt dann als Haus statt als
                  Zekos, und zwar endgueltig (members.referred_by_tenant ist
                  nach dem Anlegen gesperrt, Migration 024).

                  Also: registrieren, dann Kanal. Nach der Anmeldung ist der
                  Weg offen — /welcome, /signals und das Willkommensfenster
                  fuehren dorthin, und der bezahlte Signalkanal kommt ohnehin
                  partnerweise aus create-telegram-link. */}
              <button onClick={goTelegram}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-[13px] font-semibold hover:bg-white/10 sm:px-6 sm:py-3">
                Watch the signals <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-white/50 sm:mt-7 sm:gap-x-6 sm:text-xs lg:justify-start">
              {/* These three used to read "4.9 broker rating", "Regulated broker"
                  and "200+ members live". The rating and the regulator belonged to
                  TradeQuo, who is no longer our broker — repeating them beside a
                  different firm's sign-up is a false claim about a licensed
                  business, not a copy detail. The member count was not true either.
                  What replaced them is only what the model itself guarantees. */}
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" style={{ color: primary }} /> No course fees</span>
              <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" style={{ color: primary }} /> Your money stays yours</span>
              <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-current" style={{ color: accent }} /> Withdraw anytime</span>
            </div>
          </div>

          {/* Right: Cosmo floating at the centre of his own cosmos, individual
              chart candles orbiting him. (Swap cosmo-full.png for the meditating
              cross-legged render when it's produced — same slot.) */}
          {heroHasMascot && (
            <div className="hero-exit lv-in order-first relative z-10 mx-auto -mb-2 w-full max-w-[240px] sm:-mb-10 sm:max-w-[420px] lg:order-none lg:mb-0 lg:max-w-[500px]" style={{ containerType: "inline-size" }}>
              {showCosmo ? (
                <div className="orbit-stage relative mx-auto aspect-square w-full">
                  {/* lotus aura — the glow he radiates */}
                  <div className="aura-pulse absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]" style={{ background:`color-mix(in oklch, ${accent} 60%, transparent)` }} aria-hidden />
                  <div className="absolute left-1/2 top-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[55px]" style={{ background:`color-mix(in oklch, ${primary} 32%, transparent)` }} aria-hidden />

                  {/* 3D scene: the ring and Cosmo share one preserve-3d space so the
                      browser resolves who's in front of whom from depth alone. */}
                  <div className="orbit-scene">
                    <div className="orbit-ring">
                      {ORBIT_ITEMS.map((it, i) => (
                        <div key={i} className="orbit-pos" style={{ transform: `rotateY(${it.angle}deg) translateZ(var(--orbit-r)) translateY(${it.y}px)` }}>
                          <div className="orbit-bill" style={{ transform: `rotateY(${-it.angle}deg)` }}>
                            <div className="orbit-spin">
                              <div className="orbit-depth" style={{ height: it.h, width: it.w, transform: "translate(-50%,-50%)", animationDelay: `-${((it.angle / 360) * ORBIT_DUR).toFixed(2)}s` }}>
                                <CandleShape up={up} down={down} isUp={it.isUp} bt={it.bt} bh={it.bh} growDelay={0.15 + i * 0.09} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Cosmo at the centre (z ≈ 0): near-side candles occlude him, far-side pass behind. */}
                    <img src="/cosmo/cosmo-meditate.png" alt="Cosmo meditating, the Cosmos Candles Academy guide"
                      className="cosmo-lotus h-[76%] w-auto object-contain drop-shadow-2xl" />
                  </div>
                </div>
              ) : (
                <div className="relative mx-auto aspect-square w-full max-w-[150px] overflow-hidden rounded-full ring-4 ring-white/10 sm:max-w-[280px] lg:max-w-[360px] shadow-2xl">
                  <div className="absolute inset-2 rounded-full blur-3xl" style={{ background:`color-mix(in oklch, ${primary} 40%, transparent)` }} aria-hidden />
                  <img src="/zeko-hero.png" alt="Zeko" className="relative h-full w-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* Rechte Hero-Spalte, wenn kein Maskottchen dort sitzt: der Film.
              Zekos Portrait steht in der Kopfzeile, also rendete diese Spalte
              gar nichts — auf dem Desktop lag neben der Ueberschrift eine leere
              schwarze Haelfte. Der Player haengt an GENAU EINER Stelle (hier
              oder unten im eigenen Abschnitt, nie beides): zwei <video>-Knoten
              teilten sich sonst pitchRef und der zweite ueberschriebe den ersten. */}
          {heroHasVideo && (
            <div className="hero-exit lv-in relative z-10 mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none">
              {pitchPlayer}
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────── DEMO VIDEO ─────────────────────── */}
      {tenant.pitchVideo && !heroHasVideo && (
      <Band tone="raised" max="max-w-4xl" className="py-8 sm:py-12">
        {/* Das Video laeuft 1:19 — "60 seconds" stand hier noch aus der Zeit
            vor dem fertigen Schnitt. */}
        <SectionHead kicker="Watch first" title={showCosmo ? "The whole thing in 70 seconds" : "The whole thing in 73 seconds"} primary={primary} />
        <div className="relative mt-8">
          {/* KEIN nachgebautes Browserfenster mehr.
              Hier sassen Ampelpunkte und eine Adresszeile — die Seite tat so,
              als zeige sie einen Screenshot von sich selbst. Auf der echten
              Seite ist das eine Attrappe: sie kostet oben Hoehe, verkleinert
              das Bild, und jeder sieht sofort, dass das Fenster keins ist.
              Das Video traegt sich allein. */}
          {pitchPlayer}
        </div>

          {/* DIE KNOEPFE, VON DENEN COSMO IM FILM SPRICHT.
              Im Video sagt er "drueck unten auf die Knoepfe" — auf der
              Landingpage gab es darunter aber nichts, der Satz lief ins Leere.
              Sie erscheinen beim PLAY, nicht am Ende: die meisten sehen einen
              Film nicht zu Ende, und wer nach dreissig Sekunden ueberzeugt ist,
              soll nicht warten muessen. Einmal sichtbar, bleiben sie sichtbar. */}
          {pitchStarted && (
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              {/* Der Schein unter dem Knopf sitzt hinter ihm, nicht auf ihm:
                  eine weich ausgelaufene Flaeche in Markenfarbe, die ihn vom
                  dunklen Grund abhebt, ohne dass der Knopf selbst leuchtet. */}
              <div
                className={cn(
                  "relative flex-1 transition-all duration-500 ease-out",
                  ctaIn ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-6 -bottom-1 h-7 rounded-full blur-2xl"
                  style={{ background: primary, opacity: 0.35 }}
                />
                <a
                  href={telegramZiel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-btn relative flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black"
                  style={cta}
                >
                  Unlock everything on Telegram <ArrowRight className="cta-arrow h-4 w-4" />
                </a>
              </div>
              {/* "Nochmal ansehen" erst, wenn es etwas nochmal zu sehen gibt. */}
              {pitchEnded && (
                <button
                  onClick={() => { const v = pitchRef.current; if (v) { v.currentTime = 0; void v.play(); } }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-foreground/80 transition-all duration-500 ease-out hover:bg-white/10 sm:flex-none",
                    ctaIn ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                  )}
                >
                  <PlayCircle className="h-4 w-4" /> Watch again
                </button>
              )}
            </div>
          )}
          {/* WARUM TELEGRAM — als Satz, nicht als Fussnote.
              "Alles laeuft ueber Telegram" ohne Grund liest sich wie eine
              Huerde, die wir uns ausgedacht haben. Mit dem Grund ist es ein
              Argument: ein Signal, das zehn Minuten alt ist, ist wertlos.
              Deshalb steht der Satz in Lesegroesse unter dem Knopf und nicht
              klein darunter — wer ihn ueberliest, klickt aus Misstrauen nicht. */}
          {pitchStarted && (
            <p className={cn(
              "mt-4 max-w-xl text-sm leading-relaxed text-foreground/60 transition-all duration-500 ease-out",
              ctaIn ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
            )}>
              Everything runs on Telegram — that's where a call lands the second our desk
              makes it. A trade you see ten minutes late is a trade you missed. One tap and
              you're in.
            </p>
          )}
      </Band>
      )}

      {/* KEIN TICKER MEHR.
          Das Laufband trug zuletzt nur noch allgemeine Aussagen ("Course fee
          0 EUR", "Academy 5 lessons") — die Kurszahlen waren schon frueher
          raus, weil sie handgetippt und damit erfunden waren. Was blieb, war
          Bewegung ohne Inhalt: auf dem Handy ein abgeschnittener Streifen
          halber Woerter, der die Seite billig aussehen liess. Dieselben
          Aussagen stehen ohnehin im Hero und in den Abschnitten darunter. */}



      {/* ─────────────────── CAPABILITIES SHOWCASE ───────────────────
          Fuenf eigenstaendige Kapitel-Zonen statt einer Band mit Abstaenden:
          Flaechen alternieren, der Marken-Wash springt mit der Preview-Seite. */}
      <Band className="pb-2 sm:pb-4">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHead kicker="Everything included · free" title="Signals, academy, tools. One platform, free." primary={primary} center />
        </div>
      </Band>

      <ChapterZone tone="base" washSide="right" strength={7} primary={primary}>
        <Showcase n="01" primary={primary} icon={Radio} tag="Live signals"
          title="Every call from the desk — on your phone in seconds"
          body="Entry, stop-loss and targets, pushed the moment the desk fires them."
          points={["Real-time Telegram delivery", "Entry · SL · multiple targets", "Win/loss tracked openly"]}
          preview={<SignalsPreview primary={primary} showCosmo={showCosmo} />} />
      </ChapterZone>

      <ChapterZone tone="raised" washSide="left" strength={9} primary={primary}>
        <Showcase n="02" primary={primary} reversed icon={Bot} tag="Auto-Trader"
          title="Copy the master account — hands-off"
          body="Mirror the desk's trades automatically into your own broker account. Switch it off anytime."
          points={["One-tap copy of the master desk", "Risk scaled to your account", "Full transparency on every position"]}
          preview={<BotPreview primary={primary} />} />
      </ChapterZone>

      <ChapterZone tone="base" washSide="right" strength={7} primary={primary}>
        <Showcase n="03" primary={primary} icon={GraduationCap} tag="The Academy"
          title="From your first candle to a funded month"
          body={`${LESSONS.length} structured video lessons that take you from zero to a repeatable edge.`}
          points={[`${LESSONS.length} video lessons, zero to pro`, "Progress + completion tracking", "Orderflow tools most traders never see"]}
          preview={<AcademyPreview primary={primary} accent={accent} />} />
      </ChapterZone>

      <ChapterZone tone="raised" washSide="left" strength={10} primary={primary}>
        <Showcase n="04" primary={primary} reversed icon={ListChecks} tag="Live quizzes"
          title="Learn it, then prove it — and get paid XP"
          body="Short quizzes lock in each lesson — answer right, bank XP, climb the ladder."
          points={["Quiz after every lesson", "Instant XP on correct answers", "Reinforces the exact rules that matter"]}
          preview={<QuizPreview primary={primary} />} />
      </ChapterZone>

      <ChapterZone tone="base" washSide="right" strength={8} primary={primary}>
        <Showcase n="05" primary={primary} icon={Trophy} tag="Earn & level up"
          title="Every action earns — every level unlocks"
          body="XP, streaks and levels keep you coming back."
          points={["XP, streaks & levels", "Tier ladder tied to real progress", "Unlock the live room, auto-trader & more"]}
          preview={<RewardsPreview primary={primary} accent={accent} showCosmo={showCosmo} />} />
      </ChapterZone>

      {/* ───────────────── BEWEIS: echte Ergebnisse ─────────────────
          Zahlen vor Preisen. Rendert nichts, wenn keine Daten da sind — darum
          bleibt sie AUSSERHALB der Band-Abfolge: eine leere erhabene Flaeche
          waere schlimmer als gar keine Sektion. */}
      <DeskResults primary={primary} />

      {/* ─────────────────────── HOW IT WORKS ─────────────────────── */}
      <Band tone="raised">
        <div className="flex flex-col items-center gap-4 text-center">
          {showCosmo && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl" style={{ background:`color-mix(in oklch, ${accent} 40%, transparent)` }} />
              <img src="/cosmo/cosmo-avatar.png" alt="Cosmo" className="cosmo-float relative h-16 w-16 rounded-full object-cover ring-2 ring-white/10" />
            </div>
          )}
          <SectionHead kicker="Three steps" title="How it works" primary={primary} center />
        </div>
        {/* A descending staircase instead of three identical boxes: each card
            steps down (lg), a gradient line runs through the numbered nodes,
            and the number sits IN a brand ring instead of as pale decor. The
            shape itself now says "sequence, downhill, easy". */}
        <div className="relative mt-10 grid gap-10 sm:gap-4 sm:grid-cols-3">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-[26px] hidden h-px lg:block"
               style={{ background: `linear-gradient(90deg, transparent, color-mix(in oklch, ${primary} 45%, transparent), transparent)` }} />
          {[
            { step: "01", icon: GraduationCap, you: "1 minute", title: "Create your free account", body: "Takes a minute. No card, no subscription, nothing to cancel." },
            { step: "02", icon: Radio, you: "guided in chat", title: "Connect Telegram", body: "We walk you through the setup in the chat and send your personal invite." },
            { step: "03", icon: LineChart, you: "at your pace", title: "Trade with confidence", body: "Follow the signals, work through the lessons, and level up tier by tier." },
          ].map((s, i) => (
            <div key={s.step} className={cn("relative", i === 1 && "lg:translate-y-6", i === 2 && "lg:translate-y-12")}>
              <div className="relative z-10 mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full font-display text-sm font-black"
                   style={{ background: "#0b1220", border: `1.5px solid color-mix(in oklch, ${primary} 55%, transparent)`, color: primary, boxShadow: `0 0 24px -6px color-mix(in oklch, ${primary} 60%, transparent)` }}>
                {s.step}
              </div>
              <div className="apl-card relative rounded-3xl border border-white/[0.07] p-6 text-center">
                <s.icon className="mx-auto h-6 w-6" style={{ color: primary }} />
                <h3 className="mt-3 font-display text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/65">{s.body}</p>
                <span className="mt-4 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ background:`color-mix(in oklch, ${primary} 12%, transparent)`, color: primary }}>{s.you}</span>
              </div>
            </div>
          ))}
        </div>
      </Band>

      <Band>
        <SectionHead kicker="How far you can go" title="Member tiers" primary={primary} />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((t, idx) => (
            <div key={t.key} className={"apl-card relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] p-6" + (idx === 1 ? " sm:-translate-y-2" : "")}
              style={idx === 1 ? { borderColor:`color-mix(in oklch, ${primary} 45%, transparent)`, background:`linear-gradient(180deg, color-mix(in oklch, ${primary} 8%, transparent), transparent)`, boxShadow:`0 24px 60px -28px color-mix(in oklch, ${primary} 55%, transparent)` } : {}}>
              {/* Each tier wears its colour as a top edge — three cards, three
                  identities, readable before a single word. */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }} />
              {idx === 1 && <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg px-3 py-1 text-[10px] font-bold uppercase text-black" style={{ background: primary }}>Most popular</span>}
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color, boxShadow: `0 0 12px ${t.color}` }} /><span className="font-display text-lg font-bold" style={{ color: t.color }}>{t.name}</span></div>
              <div className="apl-sheen mt-3 font-display text-4xl font-black">{formatMoney(t.minDeposit, "€")}<span className="text-base font-normal">+</span></div>
              <div className="mb-4 text-[11px] uppercase tracking-[0.14em] text-white/45">verified account</div>
              <ul className="flex flex-1 flex-col gap-2">
                {t.perks.map((perk) => <li key={perk} className="flex items-start gap-2 text-sm text-white/80"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.color }} />{perk}</li>)}
              </ul>
              <button onClick={goTelegram} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-opacity hover:opacity-90"
                style={idx === 1 ? cta : { background: "rgba(255,255,255,0.08)", color: "white" }}>Get started <ArrowRight className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Band>

      {/* ─────────────────────── TESTIMONIALS ─────────────────────── */}
      {tenant.testimonials && tenant.testimonials.length > 0 && (
        <Band tone="raised">
          <SectionHead kicker="Proof" title="Real members, real results" primary={primary} />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {tenant.testimonials.map((t) => (
              <div key={t.handle} className="flex flex-col rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6">
                <div className="mb-3 flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: accent }} />)}</div>
                <p className="flex-1 text-sm text-white/80">"{t.text}"</p>
                <div className="mt-4 flex items-center justify-between">
                  <div><div className="text-sm font-bold">{t.name}</div><div className="text-[11px] text-white/45">{t.handle}</div></div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background:`color-mix(in oklch, ${primary} 16%, transparent)`, color: primary }}>{t.result}</span>
                </div>
              </div>
            ))}
          </div>
        </Band>
      )}

      {/* ─────────────────────── FAQ ─────────────────────── */}
      {tenant.faq && tenant.faq.length > 0 && (
        <Band tone="raised" max="max-w-3xl">
          <SectionHead kicker="Questions" title="Good to know" primary={primary} />
          <div className="mt-8 space-y-3">
            {tenant.faq.map((f) => (
              <details key={f.q} className="apl-card group rounded-2xl border border-white/[0.07] px-5 py-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold marker:content-['']">{f.q}<span className="ml-4 text-lg text-white/40 transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm text-white/65">{f.a}</p>
              </details>
            ))}
          </div>
        </Band>
      )}

      {/* ─────────────────────── BROKER BAND ─────────────────────── */}
      <Band>
        <div className="overflow-hidden rounded-[2rem] border border-white/10" style={{ background:`radial-gradient(120% 120% at 0% 0%, color-mix(in oklch, ${primary} 12%, transparent), transparent 55%)` }}>
          <div className="grid gap-10 p-6 sm:p-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: primary }}><Building2 className="h-4 w-4" /> How the money works</p>
              <h2 className="apl-sheen font-display text-3xl font-black leading-tight sm:text-4xl">Your money<br />stays your money.</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65">
                {/* "a licensed, award-winning global broker" was written for
                    TradeQuo and then left attached to whatever tenant.brokerName
                    happens to say. We are mid-switch and have verified neither
                    licence nor award for the incoming broker — which is exactly
                    why BROKERS[x].trust is deliberately empty in broker.ts. */}
                Your trading account is opened in your <span className="font-semibold text-white/90">own</span> name. We earn from the broker, not from you — that's why everything here is free.
              </p>
              {/* Both of these existed, were correct, and were imported by nothing.
                  The loss warning belongs next to the deposit ask, not in a footer,
                  and the fact that we are paid per lot has to be said to the member
                  — not only to the partner. */}
              <RiskWarning className="mt-5" />
              <CommissionDisclosure className="mt-3" />
              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {/* Model facts, not broker claims: these three hold no matter
                    which broker clears the trades, which is why they can stand
                    here while BROKER.trust stays deliberately empty. */}
                {[
                  { icon: Shield, label: "Account opened in your own name" },
                  { icon: Wallet, label: "Withdraw anytime — it's your account" },
                  { icon: Zap, label: "We never hold a cent of your funds" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                    <f.icon className="h-4 w-4 shrink-0" style={{ color: primary }} />
                    <span className="text-xs font-medium text-white/75">{f.label}</span>
                  </div>
                ))}
                {(BROKER_SWITCH.paused ? [] : BROKER.trust).map((t) => (
                  <div key={t.label} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                    <span className="text-base" style={{ color: primary }}>{t.icon}</span>
                    <span className="text-xs font-medium text-white/75">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              {/* Hier stand der Brokername in einem weissen Kasten, in 24px Black.
                  Die lauteste Stelle der Sektion war damit genau die Information,
                  die oeffentlich nicht mehr auftauchen soll. */}
              <div className="flex w-full max-w-[300px] flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-8">
                <Wallet className="h-7 w-7" style={{ color: primary }} />
                <span className="text-center text-sm font-semibold text-white/80">Your own account, in your own name</span>
              </div>
              {/* No direct broker link from a public page. The broker sign-up is the step
                  people drop out of, and a link here sends them there alone — see
                  TELEGRAM_ENTRY in broker.ts. The route is Telegram, where a person
                  walks them through it.

                  Der Kanal des TENANTS, nicht unserer. Hier stand fest
                  TELEGRAM_ENTRY.url — auf Zekos Seite fuehrte der Knopf also in
                  den Cosmos-Kanal, und sein Besucher landete bei uns statt bei
                  ihm. Dieselbe Absicherung wie oben im Hero (Zeile ~319):
                  ihm.

                  KEIN Rueckfall auf unseren Kanal. Erst stand hier fest
                  TELEGRAM_ENTRY.url, dann "eigener Kanal, sonst unserer" — und
                  beim echten Durchlauf von Louis' Seite fuehrten trotzdem BEIDE
                  Knoepfe zu t.me/cosmoscandles, weil buildTenantConfig genau
                  diesen Wert als Vorgabe setzte. Hat ein Partner keinen Kanal,
                  gehoert hier nichts hin.

                  ENTSCHEIDUNG 31.08.2026, zweite Stufe: von hier fuehrt gar
                  kein Weg mehr direkt nach Telegram — auf keiner Seite, auch
                  nicht auf unserer eigenen. Erst Registrierung, dann Kanal.
                  Begruendung steht beim Hero-Knopf (Cookie-Topf, Herkunft).
                  Der bezahlte Signalkanal bleibt partnerweise. */}
              <button onClick={goTelegram} className="inline-flex min-h-[44px] items-center gap-1.5 py-3 text-xs font-medium text-white/60 underline-offset-4 hover:text-white hover:underline">Get the signals <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      </Band>

      {/* ─────────────────────── FINAL CTA ─────────────────────── */}
      <Band>
        <div className="relative overflow-hidden rounded-[2rem] border p-8 text-center sm:p-16"
          style={{ borderColor:`color-mix(in oklch, ${primary} 22%, transparent)`, background:`radial-gradient(120% 140% at 50% 0%, color-mix(in oklch, ${primary} 16%, transparent), color-mix(in oklch, ${accent} 8%, transparent) 60%, transparent)` }}>
          {/* The close quotes the open: the hero's twinkle field returns, so
              the page ends in the same sky it started in. */}
          {[["12%","10%"],["30%","88%"],["55%","6%"],["70%","93%"],["20%","55%"],["82%","30%"],["45%","72%"],["88%","62%"]].map(([tp,lf],i)=>(
            <span key={i} aria-hidden className="twinkle absolute h-1 w-1 rounded-full bg-white" style={{ top: tp, left: lf, animationDelay: `${i*0.55}s` }} />
          ))}
          {showCosmo && (
            <div className="relative mx-auto mb-4 h-28 w-28">
              <div className="absolute inset-0 rounded-full blur-2xl" style={{ background:`color-mix(in oklch, ${accent} 50%, transparent)` }} />
              <img src="/cosmo/cosmo-head.png" alt="Cosmo" className="cosmo-float relative h-28 w-28 object-contain" />
            </div>
          )}
          {tenant.mascot === "zeko" && <img src="/zeko-point.png" alt="" className="mx-auto mb-2 h-28 w-28 rounded-full object-cover" />}
          <h2 className="apl-sheen font-display text-3xl font-black sm:text-5xl">Your first candle<br />starts today.</h2>
          <p className="mx-auto mt-4 max-w-md text-white/65">Join {tenant.name}, connect Telegram, and we take it from there.</p>
          <div className="mt-7 flex justify-center">
            <button onClick={goTelegram} className="cta-btn inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[13px] font-black text-black" style={cta}>Start free — €0 <ArrowRight className="h-4 w-4" /></button>
          </div>
          {/* Objections resurface at the moment of action, so the answer
              stands next to the button — not only up in the hero. */}
          <p className="mt-4 text-[11px] font-medium text-white/55">No card · No course fee · Your money stays yours</p>
          <p className="mt-2 text-[11px] text-white/45">Questions? <a href={`mailto:${tenant.affiliateEmail}`} className="underline hover:text-white">{tenant.affiliateEmail}</a></p>
        </div>
      </Band>

      {/* ─────────────────────── WHITE-LABEL ─────────────────────── */}
      {showCosmo && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.02]">
            <div className="grid items-center gap-10 p-6 sm:p-12 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: primary }}>
                  <Layers className="h-4 w-4" /> For creators & communities
                </p>
                <h2 className="apl-sheen mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">Run this exact academy<br />under your own brand.</h2>
                <p className="mt-4 max-w-md text-sm text-white/65">
                  Everything you just scrolled — signals, auto-trader, academy, quizzes, rewards — is a white-label engine. Bring your audience; we handle the desk, the tech and the broker deal.
                </p>
                <ul className="mt-5 space-y-2">
                  {["Your branding, live in a day", "We run the signals & the platform", "You earn from the broker partnership"].map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-white/80"><CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: primary }} />{p}</li>
                  ))}
                </ul>
                <Link to="/partner-program" className="cta-btn mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[13px] font-black text-black" style={cta}>Become a partner <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <WhitelabelPreview primary={primary} />
            </div>
          </div>
        </section>
      )}

      {/* Mobile-only sticky CTA. sm:hidden keeps desktop clean; the footer
          below reserves room so the last lines are never covered. */}
      <div className="m-cta fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#05070e]/90 px-4 pt-2.5 backdrop-blur-xl sm:hidden"
           style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-bold">{tenant.name}</div>
            <div className="truncate text-[10px] text-white/50">Free — no card, your money stays yours</div>
          </div>
          <button onClick={goTelegram} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-3 text-[13px] font-black text-black" style={cta}>
            Start free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <footer className="border-t border-white/[0.06] px-4 pt-6 pb-24 text-center text-[11px] text-white/40 sm:pb-6">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link to="/impressum" className="hover:text-white">Legal notice</Link>
          <span aria-hidden>·</span>
          <Link to="/datenschutz" className="hover:text-white">Privacy</Link>
        </div>
        <div className="mt-2">
          {tenant.name} · Powered by <Link to="/" className="underline hover:text-white">Cosmos Candles Academy</Link>
        </div>
        <div className="mt-1 inline-flex items-center gap-1">
          <Lock className="inline h-2.5 w-2.5" /> Trading involves risk — 74–89% of retail CFD accounts lose money.
        </div>
      </footer>
    </div>
  );
}

/**
 * A full-width surface change between sections — the same Band as
 * /partner-program. Alternating the ground (base vs raised) separates the
 * sections structurally, so the heads no longer carry that job typographically.
 * Inner max-width varies per section (video 4xl, FAQ 3xl), hence the prop.
 * Tenant colors never touch the band surfaces — they are neutral white-alpha,
 * so every white-label partner inherits them unchanged.
 */
function Band({ tone = "base", max = "max-w-6xl", className, children }: {
  tone?: "base" | "raised"; max?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={cn(
      "px-4 py-14 sm:px-8 sm:py-20",
      tone === "raised" && "border-y border-white/[0.07] bg-white/[0.022]",
      className,
    )}>
      <div className={cn("lv-reveal mx-auto", max)}>{children}</div>
    </section>
  );
}

/**
 * Eine Kapitel-Zone: eigene Flaeche + Richtungs-Wash in Markenfarbe.
 *
 * Vorher sassen alle fuenf Showcases in EINER base-Band, getrennt nur durch
 * Abstand — "die Komponenten sehen zu gleich aus, Trennung zu schwach". Jetzt
 * ist jedes Kapitel eine eigene Full-Bleed-Sektion: die Flaeche alterniert
 * (base/raised), und ein radialer Wash in der Markenfarbe sitzt auf der Seite,
 * auf der die Preview liegt — die Lichtquelle springt beim Scrollen von Seite
 * zu Seite. White-Label-sicher: nur primary-Prop + Transparenz.
 */
function ChapterZone({ tone = "base", washSide, strength, primary, children }: {
  tone?: "base" | "raised"; washSide: "left" | "right"; strength: number;
  primary: string; children: React.ReactNode;
}) {
  return (
    <section className={cn(
      "relative overflow-clip px-4 py-16 sm:px-8 sm:py-24",
      tone === "raised" && "border-y border-white/[0.07] bg-white/[0.022]",
    )}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        background: `radial-gradient(80% 65% at ${washSide === "left" ? "8%" : "92%"} 18%, color-mix(in oklch, ${primary} ${strength}%, transparent), transparent 62%)`,
      }} />
      <div className="relative mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

/* Number, kicker, title — and nothing else. Same head as /partner-program:
   the optional `sub` lead paragraph is gone, because a title that needs
   restating below itself is a title that isn't doing its job. */
/**
 * Kicker + Titel — OHNE Nummer.
 *
 * Vorher trugen auch diese Koepfe Nummern und Watermark-Ziffern; zusammen mit
 * den fuenf Produkt-Kapiteln ergab das ZWEI konkurrierende Zaehlungen auf einer
 * Seite ("dann faengt aber nochmal Punkt eins an ... komplett ueberlappend und
 * doppelt"). Die grosse Ziffern-Illustration gehoert jetzt EXKLUSIV den
 * Kapiteln 01-05; alle anderen Sektionen sprechen nur mit Kicker und Titel.
 */
function SectionHead({ kicker, title, primary, center }: { kicker: string; title: string; primary: string; center?: boolean }) {
  return (
    <div className={cn("relative", center && "text-center")}>
      <div className={cn("relative flex items-center gap-3", center && "justify-center")}>
        <span className="h-px w-6" style={{ background: `color-mix(in oklch, ${primary} 55%, transparent)` }} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: primary }}>{kicker}</span>
        {center && <span className="h-px w-6" style={{ background: `color-mix(in oklch, ${primary} 55%, transparent)` }} aria-hidden />}
      </div>
      <h2 className="apl-sheen relative mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
    </div>
  );
}

/**
 * One product chapter. Rebuilt 21.08. because five of these in a row read as
 * "generic blocks with text" — the user's words, and he was right:
 *
 *   · The PREVIEW is the product, so it leads. On the phone it renders first
 *     (show, then tell — same instinct as Cosmo opening the hero), and it
 *     sits in an app-window frame: traffic lights, tag in the title bar, a
 *     brand glow behind. The same window metaphor the demo video already
 *     uses, so the page speaks one visual language for "this is the app".
 *   · A giant watermark numeral gives each chapter an identity at a glance —
 *     you can tell 03 from 04 while scrolling fast, without reading a word.
 *   · The checklist became chips: three short claims wrap in a row instead
 *     of stacking as another block of list-text.
 */
function Showcase({ n, tag, title, body, points, preview, primary, icon: Icon, reversed }: {
  n: string; tag: string; title: string; body: string; points: string[]; preview: React.ReactNode;
  primary: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; reversed?: boolean;
}) {
  return (
    <div className="relative grid items-center gap-6 lg:grid-cols-2 lg:gap-14">
      {/* Das Wasserzeichen stand auf 4,5 % Weiss — auf einem Telefon im Dunkeln
          ist das schlicht unsichtbar, und die Idee, jedem Kapitel eine Nummer
          zum Wiedererkennen zu geben, lief damit ins Leere. Jetzt in der
          Markenfarbe (bleibt blau) und als KONTUR statt Fläche: eine gefüllte
          Zahl dieser Grösse würde mit dem Text konkurrieren, eine Umrisszahl
          liest sich als Grafik und bleibt trotzdem erkennbar. Sie wandert
          ausserdem auf die Seite, die dem Vorschaufenster gegenüberliegt —
          damit entsteht beim Scrollen ein Links-Rechts-Rhythmus statt fünfmal
          derselben Anordnung. */}

      {/* Kapitelmarke über die volle Breite. Beim schnellen Durchwischen sahen
          die fünf Abschnitte gleich aus — gleiche Anordnung, gleiche Farbe,
          kein Anfang. Diese Zeile ist der Schnitt dazwischen: Nummer, Linie,
          Name. Man erkennt sie im Vorbeiscrollen, ohne ein Wort zu lesen. */}
      <div aria-hidden className="flex items-center gap-3 lg:col-span-2">
        <span className="font-mono text-[15px] font-black tabular-nums" style={{ color: primary }}>{n}</span>
        {/* Nur Nummer und Linie. Der Name steht direkt darunter im Chip — ihn
            hier zu wiederholen las sich wie ein Fehler, nicht wie Gestaltung. */}
        <span className="h-px flex-1" style={{ background: `linear-gradient(to right, color-mix(in oklch, ${primary} 45%, transparent), transparent)` }} />
        {/* Mobil lebt die grosse Ziffer HIER, rechtsbuendig — Illustration
            ohne Ueberlagerung. Ab sm uebernimmt das grosse Watermark unten. */}
        <span className="select-none font-display text-[2.6rem] font-black leading-none sm:hidden" style={{ color: "transparent", WebkitTextStroke: `1.5px color-mix(in oklch, ${primary} 40%, transparent)` }}>{n}</span>
      </div>

      <div className={cn("sc-copy relative", reversed && "lg:order-2")}>
        {/* Die Kapitelzahl liegt HINTER der Überschrift, nicht über dem
            Vorschaufenster. Am Raster aufgehängt landete sie auf dem Telefon
            quer auf der Produktkachel, weil dort die Vorschau zuerst kommt.
            Hier ist immer Platz, und die Zahl liest sich als Hintergrund der
            Kapitelüberschrift — was sie ja sein soll. */}
        {/* Nur ab sm: bei 7rem lag die Ziffer auf dem Handy quer UEBER Chip
            und Headline — unlesbares Ineinander. Mobil sitzt sie stattdessen
            klein in der Kapitelmarken-Zeile (siehe oben). */}
        <span
          aria-hidden
          className="sc-num pointer-events-none absolute -z-10 hidden select-none font-display font-black leading-none sm:-top-14 sm:block sm:text-[10rem]"
          style={{
            [reversed ? "right" : "left"]: "-0.06em",
            color: "transparent",
            WebkitTextStroke: `2px color-mix(in oklch, ${primary} 30%, transparent)`,
          }}
        >
          {n}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: primary }}>
          <Icon className="h-3.5 w-3.5" /> {tag}
        </span>
        <h3 className="apl-sheen mt-4 font-display text-2xl font-black leading-tight sm:text-3xl">{title}</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">{body}</p>
        <div className="sc-chips mt-5 flex flex-wrap gap-2">
          {points.map((p) => (
            <span key={p} className="apl-card inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-white/80">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: primary }} /> {p}
            </span>
          ))}
        </div>
      </div>

      {/* The previews already ship inside their own app-window Frame (see
          LandingPreviews.tsx) — wrapping them in a second window here doubled
          the traffic lights. This wrapper only adds what the Frame lacks: the
          brand glow, and preview-first order on the phone. */}
      <div className={cn("order-first lg:order-none", reversed && "lg:order-1")}>
        <div className="sc-frame relative">
          <div aria-hidden className="absolute -inset-4 rounded-[2rem] blur-2xl" style={{ background: `color-mix(in oklch, ${primary} 12%, transparent)` }} />
          <div className="relative">{preview}</div>
        </div>
      </div>
    </div>
  );
}
