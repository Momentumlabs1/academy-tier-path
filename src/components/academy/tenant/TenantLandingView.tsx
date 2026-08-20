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
  ArrowRight, ArrowUpRight, CheckCircle2, Lock, Shield, Star,
  PlayCircle, BadgeCheck, Wallet, Building2, Radio, GraduationCap, LineChart, Zap,
  Bot, Trophy, Sparkles,
} from "lucide-react";
import { TIERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { writePartnerBrand } from "@/lib/partner-brand";
import type { TenantConfig } from "@/lib/tenants";
import { BROKER, BROKER_SWITCH, TELEGRAM_ENTRY } from "@/lib/broker";
import { RiskWarning } from "@/components/academy/legal/RiskWarning";
import { CommissionDisclosure } from "@/components/academy/legal/CommissionDisclosure";
import { DeskResults } from "@/components/academy/tenant/DeskResults";
import {
  SignalsPreview, BotPreview, AcademyPreview, QuizPreview, RewardsPreview, WhitelabelPreview,
} from "@/components/academy/tenant/LandingPreviews";

const TICKER = [
  { s: "XAU/USD",  p: "2,318.4", d: "+0.62", up: true,  sym: "Au",  tone: "oklch(0.82 0.15 85)"  },
  { s: "BTC/USDT", p: "64,210",  d: "+1.84", up: true,  sym: "\u20BF", tone: "oklch(0.78 0.16 60)"  },
  { s: "NAS100",   p: "20,050",  d: "-0.41", up: false, sym: "NQ",  tone: "oklch(0.72 0.13 265)" },
  { s: "EUR/USD",  p: "1.0842",  d: "+0.18", up: true,  sym: "\u20AC",  tone: "oklch(0.74 0.14 250)" },
  { s: "US30",     p: "39,410",  d: "-0.27", up: false, sym: "DJ",  tone: "oklch(0.72 0.13 300)" },
  { s: "ETH/USDT", p: "3,142",   d: "+2.10", up: true,  sym: "\u039E",  tone: "oklch(0.76 0.13 285)" },
  { s: "GBP/JPY",  p: "199.84",  d: "+0.35", up: true,  sym: "\u00A3",  tone: "oklch(0.76 0.14 20)"  },
  { s: "SPX500",   p: "5,268",   d: "-0.12", up: false, sym: "SP",  tone: "oklch(0.74 0.13 200)" },
];

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
  const goRegister = () => navigate({ to: "/signup" });

  // Poster-Overlay fuer das Pitch-Video: weicht beim Start, kehrt am Ende zurueck.
  const pitchRef = useRef<HTMLVideoElement>(null);
  const [pitchPlaying, setPitchPlaying] = useState(false);

  const showCosmo = tenant.slug === "cosmos-candles";
  const heroHasMascot = tenant.mascot === "zeko" || showCosmo;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.cookie = `cosmo_ref=${encodeURIComponent(tenant.slug)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    writePartnerBrand(tenant);
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
  /* Nach dem Mount die echte Adresse, davor die des Hauptauftritts — sonst
     weicht der servergerenderte Text vom ersten Client-Render ab. */
  const [siteHost, setSiteHost] = useState("cosmos-candles.com");
  useEffect(() => { setSiteHost(window.location.host.replace(/^www\./, "")); }, []);

  const cta = {
    background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 86%, white), ${primary})`,
    boxShadow: `0 8px 22px -12px ${primary}, inset 0 1px 0 rgba(255,255,255,0.45)`,
    color: "#000",
  } as const;

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
        .candle-grow { transform-origin: bottom; animation: candleGrow .9s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-track { animation: tickerScroll 34s linear infinite; }
        @keyframes twinkle { 0%,100% { opacity:.15; } 50% { opacity:.8; } }
        .twinkle { animation: twinkle 4s ease-in-out infinite; }
        /* One orchestrated load for the hero, and a scroll reveal for the bands.
           Same system as /partner-program: pure CSS, so SSR paints the final
           state and browsers without animation-timeline just show the section. */
        @keyframes lvRise { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
        .lv-in  { animation: lvRise .7s cubic-bezier(.22,1,.36,1) both; }
        .lv-in2 { animation: lvRise .7s cubic-bezier(.22,1,.36,1) .12s both; }
        .lv-in3 { animation: lvRise .7s cubic-bezier(.22,1,.36,1) .24s both; }
        @supports (animation-timeline: view()) {
          .lv-reveal { animation: lvRise .8s cubic-bezier(.22,1,.36,1) both;
                       animation-timeline: view(); animation-range: entry 0% entry 38%; }
        }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        .spin-slow { animation: spinSlow 48s linear infinite; }
        .spin-rev { animation: spinSlow 60s linear infinite reverse; }
        @keyframes auraPulse { 0%,100% { opacity:.55; transform:scale(1);} 50% { opacity:.85; transform:scale(1.06);} }
        .aura-pulse { animation: auraPulse 7s ease-in-out infinite; }
        /* 3D orbit — one GPU transform drives the whole ring, no z-index/repaint */
        @keyframes cosmoRingSpin { to { transform: rotateY(360deg); } }
        @keyframes cosmoRingSpinRev { to { transform: rotateY(-360deg); } }
        @keyframes cosmoLotusFloat { 0%,100% { transform: translate(-50%,-50%) translateZ(0.01px) translateY(0); } 50% { transform: translate(-50%,-50%) translateZ(0.01px) translateY(-14px); } }
        .orbit-stage { perspective: 640px; }
        .orbit-scene { position:absolute; inset:0; transform-style:preserve-3d; }
        .orbit-ring { position:absolute; inset:0; transform-style:preserve-3d; animation: cosmoRingSpin ${ORBIT_DUR}s linear infinite; will-change: transform; }
        .orbit-pos { position:absolute; left:50%; top:50%; transform-style:preserve-3d; }
        /* Depth cue: a candle passing behind Cosmo dims and desaturates. The
           ring spins linearly, so a linear keyframe with a per-candle negative
           delay of -(angle/360)*duration stays in phase with it forever. Only
           opacity+filter animate here — the billboard transform is inline. */
        @keyframes orbitDepth { 0%,100% { opacity:1; filter:none; } 50% { opacity:.4; filter:saturate(.7) brightness(.65); } }
        .orbit-bill { transform-style:preserve-3d; animation: orbitDepth ${ORBIT_DUR}s linear infinite; }
        .orbit-spin { animation: cosmoRingSpinRev ${ORBIT_DUR}s linear infinite; will-change: transform; }
        .cosmo-lotus { position:absolute; left:50%; top:50%; transform: translate(-50%,-50%); animation: cosmoLotusFloat 6s ease-in-out infinite; transition: filter .4s ease; backface-visibility:hidden; }
        /* hover: Cosmo brightens, candles speed up — cheap filter/timing only */
        .orbit-stage:hover .cosmo-lotus { filter: brightness(1.05) drop-shadow(0 0 26px color-mix(in oklch, ${accent} 45%, transparent)); }
        .orbit-stage:hover .orbit-ring, .orbit-stage:hover .orbit-spin, .orbit-stage:hover .orbit-bill { animation-duration: ${Math.round(ORBIT_DUR * 0.6)}s; }
        @media (prefers-reduced-motion: reduce) {
          .cosmo-float,.cosmo-bob,.chip-float,.candle-grow,.ticker-track,.twinkle,.spin-slow,.spin-rev,.aura-pulse,.orbit-ring,.orbit-spin,.orbit-bill,.cosmo-lotus,.lv-in,.lv-in2,.lv-in3,.lv-reveal { animation: none !important; }
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
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-black" style={{ background: primary }}>
                  {tenant.logoInitials}
                </span>
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
            <Link to="/signup" className="rounded-full px-3 py-2 text-sm font-medium text-white/70 hover:text-white sm:px-4">Sign in</Link>
            <button onClick={goRegister}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-black shadow-lg transition-transform hover:-translate-y-0.5"
              style={cta}>
              Sign up free <ArrowRight className="h-3.5 w-3.5" />
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
          {[["12%","18%"],["28%","62%"],["44%","28%"],["70%","70%"],["82%","20%"],["58%","48%"],["36%","82%"],["90%","54%"],["20%","40%"],["66%","14%"]].map(([t,l],i)=>(
            <span key={i} className="twinkle absolute h-1 w-1 rounded-full bg-white" style={{ top:t, left:l, animationDelay:`${i*0.5}s` }} />
          ))}
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pb-8 pt-6 sm:gap-10 sm:pb-16 sm:px-8 sm:pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:pb-24 lg:pt-16">
          {/* Left: copy */}
          <div className="relative z-10 text-center lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 sm:mb-6 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: primary }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: primary }} /></span>
              {showCosmo ? "Cosmos Candles Academy" : `Powered by Cosmos Candles`}
            </div>

            <h1 className="lv-in font-display text-[2.75rem] font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              {showCosmo ? (
                <>Learn to trade<br />the <span style={{ color: primary }}>whole cosmos.</span></>
              ) : (tenant.headline ?? tenant.tagline)}
            </h1>
            <p className="lv-in2 mx-auto mt-4 max-w-lg text-[15px] text-white/65 sm:mt-5 sm:text-lg lg:mx-0">
              {showCosmo
                ? "Live signals, a course from zero, and pro orderflow tools. Free — Cosmo reads every candle with you."
                : (tenant.subhead ?? tenant.description)}
            </p>

            <div className="lv-in3 mt-6 flex flex-col items-stretch gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 lg:justify-start">
              <button onClick={goRegister}
                className="group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[13px] font-black text-black transition-transform hover:-translate-y-0.5 sm:py-3"
                style={cta}>
                Start free — €0 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              {tenant.telegramChannel && tenant.telegramChannel !== "#" && (
                <a href={tenant.telegramChannel} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-[13px] font-semibold hover:bg-white/10 sm:px-6 sm:py-3">
                  Watch the signals <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
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
            <div className="relative z-10 mx-auto w-full max-w-[200px] sm:max-w-[420px] lg:max-w-[500px]" style={{ containerType: "inline-size" }}>
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
                        <div key={i} className="orbit-pos" style={{ transform: `rotateY(${it.angle}deg) translateZ(30cqw) translateY(${it.y}px)` }}>
                          <div className="orbit-bill" style={{ transform: `rotateY(${-it.angle}deg)`, animationDelay: `-${((it.angle / 360) * ORBIT_DUR).toFixed(2)}s` }}>
                            <div className="orbit-spin">
                              <div style={{ height: it.h, width: it.w, transform: "translate(-50%,-50%)" }}>
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
        </div>
      </section>

      {/* ─────────────────────── DEMO VIDEO ─────────────────────── */}
      <Band tone="raised" max="max-w-4xl" className="py-8 sm:py-12">
        {/* Das Video laeuft 1:19 — "60 seconds" stand hier noch aus der Zeit
            vor dem fertigen Schnitt. */}
        <SectionHead n="01" kicker="Watch first" title="The whole thing in 80 seconds" primary={primary} />
        <div className="relative mt-8">
          {showCosmo && (
            <div className="absolute -top-12 right-2 z-20 hidden sm:block">
              <div className="relative"><div className="absolute inset-0 rounded-full blur-xl" style={{ background:`color-mix(in oklch, ${accent} 45%, transparent)` }} /><img src="/cosmo/cosmo-head.png" alt="" className="cosmo-bob relative h-24 w-24 object-contain drop-shadow-2xl" /></div>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f17] shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
              {/* Die Adresszeile setzte sich aus dem Markennamen plus ".academy"
                  zusammen und zeigte damit auf einer echten Seite eine frei
                  erfundene Domain — cosmoscandlesacademy.academy gibt es nicht.
                  Jetzt steht dort die Adresse, unter der die Seite wirklich
                  laeuft; vor der Hydration die des Hauptauftritts. */}
              <span className="ml-3 flex-1 truncate rounded-md bg-white/5 px-3 py-1 text-center text-[11px] text-white/40">{siteHost} — welcome</span>
            </div>
            <div className="relative aspect-video bg-black">
              {/* Der Platzhalter lag mit `pointer-events-none absolute inset-0`
                  dauerhaft ueber dem Player — das Video war auch mit Datei nie
                  zu sehen. Jetzt traegt das Poster diese Rolle, und der
                  Play-Knopf verschwindet beim Start. */}
              <video
                ref={pitchRef}
                controls
                playsInline
                preload="none"
                poster="/pitch-poster.jpg"
                onPlay={() => setPitchPlaying(true)}
                onEnded={() => setPitchPlaying(false)}
                className="h-full w-full object-cover"
              >
                <source src="/pitch.mp4" type="video/mp4" />
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
        </div>
      </Band>

      {/* ─────────────────────── TICKER ─────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/[0.07] bg-white/[0.022] py-3">
        <div className="ticker-track flex w-max items-center gap-3 whitespace-nowrap">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] py-1.5 pl-1.5 pr-3.5"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black"
                style={{ background: `color-mix(in oklch, ${t.tone} 22%, transparent)`, color: t.tone }}
                aria-hidden
              >
                {t.sym}
              </span>
              <span className="font-mono text-[11px] font-semibold tracking-tight text-white/85">{t.s}</span>
              <span className="font-mono text-[11px] tabular-nums text-white/55">{t.p}</span>
              <span
                className="font-mono text-[10px] font-semibold tabular-nums"
                style={{ color: t.up ? up : down }}
              >
                {t.up ? "\u25B2" : "\u25BC"} {t.d}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Der STATS-Banner ist raus. Vier Kacheln — 155K+ COMMUNITY, TELEGRAM,
          FROM €100, €0 — direkt unter dem Hero, bevor irgendetwas erklaert war.
          Zwei davon waren Behauptungen, die niemand nachprueft, eine nannte
          einen Betrag vor dem Gespraech, und alle vier standen zwischen dem
          Besucher und dem, wofuer er gekommen ist. */}


      {/* ─────────────────── CAPABILITIES SHOWCASE ─────────────────── */}
      <Band>
        <div className="mx-auto max-w-2xl text-center">
          <SectionHead n="02" kicker="Everything included · free" title="Not a course. A whole trading operating system." primary={primary} center />
        </div>

        <div className="mt-10 space-y-12 sm:mt-14 sm:space-y-24">
          <Showcase primary={primary} icon={Radio} tag="Live signals"
            title="Every call from the desk — on your phone in seconds"
            body="Entry, stop-loss and targets, pushed the moment the desk fires."
            points={["Real-time Telegram delivery", "Entry · SL · multiple targets", "Win/loss tracked openly"]}
            preview={<SignalsPreview primary={primary} />} />

          <Showcase primary={primary} reversed icon={Bot} tag="Auto-Trader"
            title="Copy the master account — hands-off"
            body="Mirror the desk's trades automatically into your own broker account — switch it off anytime."
            points={["One-tap copy of the master desk", "Risk scaled to your account", "Full transparency on every position"]}
            preview={<BotPreview primary={primary} />} />

          <Showcase primary={primary} icon={GraduationCap} tag="The Academy"
            title="From your first candle to a funded month"
            body="Twelve structured lessons with video, built to take you from zero to a repeatable edge."
            points={["12 video lessons, zero to pro", "Progress + completion tracking", "Orderflow tools most traders never see"]}
            preview={<AcademyPreview primary={primary} accent={accent} />} />

          <Showcase primary={primary} reversed icon={Sparkles} tag="Live quizzes"
            title="Learn it, then prove it — and get paid XP"
            body="Short quizzes lock in each lesson — answer right, bank XP, climb the ladder."
            points={["Quiz after every lesson", "Instant XP on correct answers", "Reinforces the exact rules that matter"]}
            preview={<QuizPreview primary={primary} />} />

          <Showcase primary={primary} icon={Trophy} tag="Earn & level up"
            title="Every action earns — every level unlocks"
            body="XP, streaks and levels turn progress into momentum."
            points={["XP, streaks & levels", "Tier ladder tied to real progress", "Unlock the live room, auto-trader & more"]}
            preview={<RewardsPreview primary={primary} accent={accent} />} />
        </div>
      </Band>

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
          <SectionHead n="03" kicker="Three steps" title="How it works" primary={primary} center />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { step: "01", icon: GraduationCap, you: "1 minute", title: "Create your free account", body: "Takes a minute. No card, no subscription, nothing to cancel." },
            { step: "02", icon: Radio, you: "guided in chat", title: "Connect Telegram", body: "We walk you through the setup in the chat and send your personal invite." },
            { step: "03", icon: LineChart, you: "at your pace", title: "Trade with confidence", body: "Follow the signals, work through the lessons, and level up tier by tier." },
          ].map((s, i) => (
            <div key={s.step} className="relative rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6">
              {/* The effort chip is the argument of this section — three steps,
                  none of which costs real work. Same mechanic as the partner
                  page's "nothing" chips. */}
              <div className="mb-3 flex items-center justify-between"><span className="font-display text-5xl font-black opacity-10">{s.step}</span><s.icon className="h-6 w-6" style={{ color: primary }} /></div>
              <h3 className="font-display text-base font-bold">{s.title}</h3><p className="mt-2 text-sm text-white/65">{s.body}</p>
              <span className="mt-4 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ background:`color-mix(in oklch, ${primary} 12%, transparent)`, color: primary }}>{s.you}</span>
              {/* Connector between the cards, so the row reads as a sequence
                  rather than three parallel offers. */}
              {i < 2 && <ArrowRight className="absolute -right-[22px] top-1/2 hidden h-5 w-5 -translate-y-1/2 text-white/25 sm:block" aria-hidden />}
            </div>
          ))}
        </div>
      </Band>

      <Band>
        <SectionHead n="04" kicker="How far you can go" title="Member tiers" primary={primary} />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((t, idx) => (
            <div key={t.key} className={"relative flex flex-col rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6" + (idx === 1 ? " sm:-translate-y-2" : "")}
              style={idx === 1 ? { borderColor:`color-mix(in oklch, ${primary} 45%, transparent)`, background:`linear-gradient(180deg, color-mix(in oklch, ${primary} 8%, transparent), transparent)`, boxShadow:`0 24px 60px -28px color-mix(in oklch, ${primary} 55%, transparent)` } : {}}>
              {idx === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase text-black" style={{ background: primary }}>Most popular</span>}
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} /><span className="font-display text-lg font-bold">{t.name}</span></div>
              <div className="mt-3 font-display text-4xl font-black">{formatMoney(t.minDeposit, "€")}<span className="text-base font-normal text-white/40">+</span></div>
              <div className="mb-4 text-[11px] uppercase tracking-[0.14em] text-white/45">verified account</div>
              <ul className="flex flex-1 flex-col gap-2">
                {t.perks.map((perk) => <li key={perk} className="flex items-start gap-2 text-sm text-white/80"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.color }} />{perk}</li>)}
              </ul>
              <button onClick={goRegister} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-opacity hover:opacity-90"
                style={idx === 1 ? cta : { background: "rgba(255,255,255,0.08)", color: "white" }}>Get started <ArrowRight className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Band>

      {/* ─────────────────────── TESTIMONIALS ─────────────────────── */}
      {tenant.testimonials && tenant.testimonials.length > 0 && (
        <Band tone="raised">
          <SectionHead n="05" kicker="Proof" title="Real members, real results" primary={primary} />
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
          <SectionHead n="06" kicker="Questions" title="Good to know" primary={primary} />
          <div className="mt-8 space-y-3">
            {tenant.faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-4">
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
              <h2 className="font-display text-3xl font-black leading-tight sm:text-4xl">Your money<br />stays your money.</h2>
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
                  walks them through it. */}
              <a href={TELEGRAM_ENTRY.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 underline-offset-4 hover:text-white hover:underline">{TELEGRAM_ENTRY.label} <ArrowUpRight className="h-3.5 w-3.5" /></a>
            </div>
          </div>
        </div>
      </Band>

      {/* ─────────────────────── FINAL CTA ─────────────────────── */}
      <Band>
        <div className="relative overflow-hidden rounded-[2rem] border p-8 text-center sm:p-16"
          style={{ borderColor:`color-mix(in oklch, ${primary} 22%, transparent)`, background:`radial-gradient(120% 140% at 50% 0%, color-mix(in oklch, ${primary} 16%, transparent), color-mix(in oklch, ${accent} 8%, transparent) 60%, transparent)` }}>
          {showCosmo && (
            <div className="relative mx-auto mb-4 h-28 w-28">
              <div className="absolute inset-0 rounded-full blur-2xl" style={{ background:`color-mix(in oklch, ${accent} 50%, transparent)` }} />
              <img src="/cosmo/cosmo-head.png" alt="Cosmo" className="cosmo-float relative h-28 w-28 object-contain" />
            </div>
          )}
          {tenant.mascot === "zeko" && <img src="/zeko-point.png" alt="" className="mx-auto mb-2 h-28 w-28 rounded-full object-cover" />}
          <h2 className="font-display text-3xl font-black sm:text-5xl">Your first candle<br />starts today.</h2>
          <p className="mx-auto mt-4 max-w-md text-white/65">Join {tenant.name}, connect Telegram, and we take it from there.</p>
          <div className="mt-7 flex justify-center">
            <button onClick={goRegister} className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[13px] font-black text-black transition-transform hover:-translate-y-0.5" style={cta}>Start free — €0 <ArrowRight className="h-4 w-4" /></button>
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
                  <Sparkles className="h-4 w-4" /> For creators & communities
                </p>
                <h2 className="mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">Run this exact academy<br />under your own brand.</h2>
                <p className="mt-4 max-w-md text-sm text-white/65">
                  Everything you just scrolled — signals, auto-trader, academy, quizzes, rewards — is a white-label engine. Bring your audience; we handle the desk, the tech and the broker deal.
                </p>
                <ul className="mt-5 space-y-2">
                  {["Your branding, live in a day", "We run the signals & the platform", "You earn from the broker partnership"].map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-white/80"><CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: primary }} />{p}</li>
                  ))}
                </ul>
                <Link to="/partner-program" className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[13px] font-black text-black transition-transform hover:-translate-y-0.5" style={cta}>Become a partner <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <WhitelabelPreview primary={primary} />
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-white/[0.06] px-4 py-6 text-center text-[11px] text-white/40">
        {tenant.name} · Powered by <Link to="/" className="underline hover:text-white">Cosmos Candles Academy</Link> · In partnership with {tenant.brokerName} · <Lock className="inline h-2.5 w-2.5" /> Trading involves risk — 74–89% of retail CFD accounts lose money.
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
      "px-4 py-12 sm:px-8 sm:py-16",
      tone === "raised" && "border-y border-white/[0.07] bg-white/[0.022]",
      className,
    )}>
      <div className={cn("lv-reveal mx-auto", max)}>{children}</div>
    </section>
  );
}

/* Number, kicker, title — and nothing else. Same head as /partner-program:
   the optional `sub` lead paragraph is gone, because a title that needs
   restating below itself is a title that isn't doing its job. */
function SectionHead({ n, kicker, title, primary, center }: { n: string; kicker: string; title: string; primary: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      <div className={cn("flex items-center gap-3", center && "justify-center")}>
        <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: primary }}>{n}</span>
        <span className="h-px w-6" style={{ background: `color-mix(in oklch, ${primary} 40%, transparent)` }} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{kicker}</span>
      </div>
      <h2 className="mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
    </div>
  );
}

function Showcase({ tag, title, body, points, preview, primary, icon: Icon, reversed }: {
  tag: string; title: string; body: string; points: string[]; preview: React.ReactNode;
  primary: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; reversed?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={cn(reversed && "lg:order-2")}>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: primary }}>
          <Icon className="h-3.5 w-3.5" /> {tag}
        </span>
        <h3 className="mt-4 font-display text-2xl font-black leading-tight sm:text-3xl">{title}</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">{body}</p>
        <ul className="mt-5 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-sm text-white/80">
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: primary }} /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={cn(reversed && "lg:order-1")}>{preview}</div>
    </div>
  );
}
