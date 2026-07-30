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
import { BROKER } from "@/lib/broker";
import {
  SignalsPreview, BotPreview, AcademyPreview, QuizPreview, RewardsPreview, WhitelabelPreview,
} from "@/components/academy/tenant/LandingPreviews";

const TICKER = [
  { s: "XAU/USD", p: "2,318.4", up: true }, { s: "BTC/USDT", p: "64,210", up: true },
  { s: "NAS100", p: "20,050", up: false }, { s: "EUR/USD", p: "1.0842", up: true },
  { s: "US30", p: "39,410", up: false }, { s: "ETH/USDT", p: "3,142", up: true },
  { s: "GBP/JPY", p: "199.84", up: true }, { s: "SPX500", p: "5,268", up: false },
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

function CandleShape({ up, down, isUp, bt, bh }: { up: string; down: string; isUp: boolean; bt: number; bh: number }) {
  const c = isUp ? up : down;
  const lit = `color-mix(in oklch, ${c} 55%, white)`;
  const shade = `color-mix(in oklch, ${c} 82%, black)`;
  return (
    <span className="relative block h-full w-full">
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
  const goRegister = () => navigate({ to: "/registrieren" });

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
        .orbit-bill { transform-style:preserve-3d; }
        .orbit-spin { animation: cosmoRingSpinRev ${ORBIT_DUR}s linear infinite; will-change: transform; }
        .cosmo-lotus { position:absolute; left:50%; top:50%; transform: translate(-50%,-50%); animation: cosmoLotusFloat 6s ease-in-out infinite; transition: filter .4s ease; backface-visibility:hidden; }
        /* hover: Cosmo brightens, candles speed up — cheap filter/timing only */
        .orbit-stage:hover .cosmo-lotus { filter: brightness(1.05) drop-shadow(0 0 26px color-mix(in oklch, ${accent} 45%, transparent)); }
        .orbit-stage:hover .orbit-ring, .orbit-stage:hover .orbit-spin { animation-duration: ${Math.round(ORBIT_DUR * 0.6)}s; }
        @media (prefers-reduced-motion: reduce) {
          .cosmo-float,.cosmo-bob,.chip-float,.candle-grow,.ticker-track,.twinkle,.spin-slow,.spin-rev,.aura-pulse,.orbit-ring,.orbit-spin,.cosmo-lotus { animation: none !important; }
        }
      `}</style>

      {/* ─────────────────────────── NAV ─────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#05070e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            {showCosmo ? (
              <span className="relative flex h-9 w-9 items-center justify-center">
                <span className="absolute inset-0 rounded-full blur-md" style={{ background: `color-mix(in oklch, ${accent} 45%, transparent)` }} />
                <img src="/cosmo/cosmo-head.png" alt="" className="relative h-9 w-9 object-contain" />
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-black" style={{ background: primary }}>
                {tenant.logoInitials}
              </span>
            )}
            <span className="font-display text-lg font-bold tracking-tight">{tenant.name}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-white/70 hover:text-white sm:inline-block">Sign in</Link>
            <button onClick={goRegister}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-black shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: primary, boxShadow: `0 8px 30px -8px ${primary}` }}>
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

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:pb-24 lg:pt-16">
          {/* Left: copy */}
          <div className="relative z-10 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: primary }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: primary }} /></span>
              {showCosmo ? "Cosmos Candles Academy" : `Powered by Cosmos Candles`}
            </div>

            <h1 className="font-display text-[2.75rem] font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              {showCosmo ? (
                <>Learn to trade<br />the <span style={{ color: primary }}>whole cosmos.</span></>
              ) : (tenant.headline ?? tenant.tagline)}
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base text-white/65 sm:text-lg lg:mx-0">
              {showCosmo
                ? "Live signals, a course that starts from zero and pro orderflow tools — free. Cosmo reads every candle with you, from your first trade to your first funded month."
                : (tenant.subhead ?? tenant.description)}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <button onClick={goRegister}
                className="group inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-black text-black transition-transform hover:-translate-y-0.5"
                style={{ background: primary, boxShadow: `0 14px 40px -12px ${primary}` }}>
                Start free — €0 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              {tenant.telegramChannel && tenant.telegramChannel !== "#" && (
                <a href={tenant.telegramChannel} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold hover:bg-white/10">
                  Watch the signals <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/50 lg:justify-start">
              <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-current" style={{ color: accent }} /> 4.9 broker rating</span>
              <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" style={{ color: primary }} /> Regulated broker</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" style={{ color: primary }} /> 200+ members live</span>
            </div>
          </div>

          {/* Right: Cosmo floating at the centre of his own cosmos, individual
              chart candles orbiting him. (Swap cosmo-full.png for the meditating
              cross-legged render when it's produced — same slot.) */}
          {heroHasMascot && (
            <div className="relative z-10 mx-auto w-full max-w-[500px]" style={{ containerType: "inline-size" }}>
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
                          <div className="orbit-bill" style={{ transform: `rotateY(${-it.angle}deg)` }}>
                            <div className="orbit-spin">
                              <div style={{ height: it.h, width: it.w, transform: "translate(-50%,-50%)" }}>
                                <CandleShape up={up} down={down} isUp={it.isUp} bt={it.bt} bh={it.bh} />
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
                <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-full ring-4 ring-white/10 shadow-2xl">
                  <div className="absolute inset-2 rounded-full blur-3xl" style={{ background:`color-mix(in oklch, ${primary} 40%, transparent)` }} aria-hidden />
                  <img src="/zeko-hero.png" alt="Zeko" className="relative h-full w-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────── TICKER ─────────────────────── */}
      <div className="relative overflow-hidden border-y border-white/[0.06] bg-white/[0.02] py-3">
        <div className="ticker-track flex w-max gap-10 whitespace-nowrap">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 font-mono text-xs text-white/55">
              <span className="font-semibold text-white/80">{t.s}</span>
              <span className="tabular-nums">{t.p}</span>
              <span style={{ color: t.up ? up : down }}>{t.up ? "▲" : "▼"}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─────────────────────── STATS ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-4">
          {tenant.stats.map((s) => (
            <div key={s.label} className="bg-[#070a13] px-5 py-7 text-center">
              <div className="font-display text-3xl font-black sm:text-4xl" style={{ color: primary }}>{s.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/45">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── DEMO VIDEO ─────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
        {/* Das Video laeuft 1:19 — "60 seconds" stand hier noch aus der Zeit
            vor dem fertigen Schnitt. */}
        <SectionHead n="01" kicker="Watch first · 80 seconds" title="See the whole thing in 80 seconds" primary={primary} />
        <div className="relative mt-8">
          {showCosmo && (
            <div className="absolute -top-12 right-2 z-20 hidden sm:block">
              <div className="relative"><div className="absolute inset-0 rounded-full blur-xl" style={{ background:`color-mix(in oklch, ${accent} 45%, transparent)` }} /><img src="/cosmo/cosmo-head.png" alt="" className="cosmo-bob relative h-24 w-24 object-contain drop-shadow-2xl" /></div>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f17] shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 flex-1 truncate rounded-md bg-white/5 px-3 py-1 text-center text-[11px] text-white/40">{tenant.name.toLowerCase().replace(/\s+/g,"")}.academy — welcome</span>
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
      </section>

      {/* ─────────────────────── BROKER BAND ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/10" style={{ background:`radial-gradient(120% 120% at 0% 0%, color-mix(in oklch, ${primary} 12%, transparent), transparent 55%)` }}>
          <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: primary }}><Building2 className="h-4 w-4" /> Our broker partner</p>
              <h2 className="font-display text-3xl font-black leading-tight sm:text-4xl">You never<br />deposit with us.</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65">
                You fund your <span className="font-semibold text-white/90">own</span> account at <span className="font-semibold text-white/90">{tenant.brokerName}</span> — a licensed, award-winning global broker. The money stays in your name and you can withdraw anytime. We earn from the broker, not from you — that's why everything here is free.
              </p>
              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {BROKER.trust.map((t) => (
                  <div key={t.label} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                    <span className="text-base" style={{ color: primary }}>{t.icon}</span>
                    <span className="text-xs font-medium text-white/75">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex w-full max-w-[300px] items-center justify-center gap-2 rounded-2xl bg-white px-8 py-8 shadow-2xl">
                <Building2 className="h-7 w-7 text-[#0b1220]" /><span className="font-display text-2xl font-black tracking-tight text-[#0b1220]">{tenant.brokerName}</span>
              </div>
              <a href={BROKER.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 underline-offset-4 hover:text-white hover:underline">Visit {tenant.brokerName} <ArrowUpRight className="h-3.5 w-3.5" /></a>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"><Wallet className="h-4 w-4" style={{ color: primary }} /><span className="text-xs font-medium text-white/75">Your money stays in your name</span></div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Lock, title: "Unlock for free", body: "Sign up, deposit — and all signals, lessons & trader tools open up." },
            { icon: Wallet, title: "Your money stays yours", body: "The deposit sits in your own broker account. You can withdraw anytime." },
            { icon: BadgeCheck, title: "We earn from the broker", body: "The broker pays us — not you. A fair, transparent partnership." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"><c.icon className="mb-3 h-5 w-5" style={{ color: primary }} /><div className="font-display text-base font-bold">{c.title}</div><p className="mt-1.5 text-sm text-white/60">{c.body}</p></div>
          ))}
        </div>
      </section>

      {/* ─────────────────── CAPABILITIES SHOWCASE ─────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHead n="02" kicker="Everything included · free" title="Not a course. A whole trading operating system." primary={primary} center
            sub="Live signals, an auto-trader, a full academy, quizzes that pay XP, a rewards ladder — and a white-label engine partners run under their own brand. Here's the real thing, not screenshots." />
        </div>

        <div className="mt-14 space-y-16 sm:space-y-24">
          <Showcase primary={primary} icon={Radio} tag="Live signals"
            title="Every call from the desk — on your phone in seconds"
            body="Entry, stop-loss and targets, pushed the moment the desk fires. Nothing to interpret, no hindsight, no screenshots — just the trade."
            points={["Real-time Telegram delivery", "Entry · SL · multiple targets", "Win/loss tracked openly"]}
            preview={<SignalsPreview primary={primary} />} />

          <Showcase primary={primary} reversed icon={Bot} tag="Auto-Trader"
            title="Copy the master account — hands-off"
            body="Mirror the desk's trades automatically into your own broker account. Position sizing scales to your balance; you stay in control and can switch it off anytime."
            points={["One-tap copy of the master desk", "Risk scaled to your account", "Full transparency on every position"]}
            preview={<BotPreview primary={primary} />} />

          <Showcase primary={primary} icon={GraduationCap} tag="The Academy"
            title="From your first candle to a funded month"
            body="Twelve structured lessons with video, built to take you from zero to a repeatable edge. Progress is tracked and every lesson pays XP."
            points={["12 video lessons, zero to pro", "Progress + completion tracking", "Orderflow tools most traders never see"]}
            preview={<AcademyPreview primary={primary} accent={accent} />} />

          <Showcase primary={primary} reversed icon={Sparkles} tag="Live quizzes"
            title="Learn it, then prove it — and get paid XP"
            body="Short quizzes lock in each lesson. Answer right, bank XP, climb the ladder. It turns passive watching into skills that stick."
            points={["Quiz after every lesson", "Instant XP on correct answers", "Reinforces the exact rules that matter"]}
            preview={<QuizPreview primary={primary} />} />

          <Showcase primary={primary} icon={Trophy} tag="Earn & level up"
            title="Every action earns — every level unlocks"
            body="XP, streaks and levels turn progress into momentum. Verified deposits and completed lessons push you up the tiers, each one unlocking more of the platform."
            points={["XP, streaks & levels", "Tier ladder tied to real progress", "Unlock the live room, auto-trader & more"]}
            preview={<RewardsPreview primary={primary} accent={accent} />} />
        </div>
      </section>

      {/* ─────────────────────── TIERS ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <SectionHead n="04" kicker="Deposit more, unlock more" title="Member tiers" primary={primary} />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((t, idx) => (
            <div key={t.key} className="relative flex flex-col rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6"
              style={idx === 1 ? { borderColor:`color-mix(in oklch, ${primary} 45%, transparent)`, background:`linear-gradient(180deg, color-mix(in oklch, ${primary} 8%, transparent), transparent)` } : {}}>
              {idx === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase text-black" style={{ background: primary }}>Most popular</span>}
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} /><span className="font-display text-lg font-bold">{t.name}</span></div>
              <div className="mt-3 font-display text-4xl font-black">{formatMoney(t.minDeposit, "€")}<span className="text-base font-normal text-white/40">+</span></div>
              <div className="mb-4 text-[11px] uppercase tracking-[0.14em] text-white/45">verified deposit</div>
              <ul className="flex flex-1 flex-col gap-2">
                {t.perks.map((perk) => <li key={perk} className="flex items-start gap-2 text-sm text-white/80"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.color }} />{perk}</li>)}
              </ul>
              <button onClick={goRegister} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-opacity hover:opacity-90"
                style={idx === 1 ? { background: primary, color: "black" } : { background: "rgba(255,255,255,0.08)", color: "white" }}>Get started <ArrowRight className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── TESTIMONIALS ─────────────────────── */}
      {tenant.testimonials && tenant.testimonials.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
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
        </section>
      )}

      {/* ─────────────────────── HOW IT WORKS ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {showCosmo && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl" style={{ background:`color-mix(in oklch, ${accent} 40%, transparent)` }} />
              <img src="/cosmo/cosmo-avatar.png" alt="Cosmo" className="cosmo-float relative h-16 w-16 rounded-full object-cover ring-2 ring-white/10" />
            </div>
          )}
          <SectionHead n="06" kicker="Three steps" title="How it works" primary={primary} center />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { step: "01", icon: GraduationCap, title: "Sign up & fund your account", body: `Create your free account and deposit €100 or more at ${tenant.brokerName}.` },
            { step: "02", icon: Radio, title: "Connect Telegram", body: "Connect your Telegram — our bot verifies your deposit automatically and sends your personal invite." },
            { step: "03", icon: LineChart, title: "Trade with confidence", body: "Follow the signals, work through the lessons, and level up tier by tier." },
          ].map((s) => (
            <div key={s.step} className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6">
              <div className="mb-3 flex items-center justify-between"><span className="font-display text-5xl font-black opacity-10">{s.step}</span><s.icon className="h-6 w-6" style={{ color: primary }} /></div>
              <h3 className="font-display text-base font-bold">{s.title}</h3><p className="mt-2 text-sm text-white/65">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── FAQ ─────────────────────── */}
      {tenant.faq && tenant.faq.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
          <SectionHead n="07" kicker="Questions" title="Good to know" primary={primary} />
          <div className="mt-8 space-y-3">
            {tenant.faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold marker:content-['']">{f.q}<span className="ml-4 text-lg text-white/40 transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm text-white/65">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────── FINAL CTA ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border p-10 text-center sm:p-16"
          style={{ borderColor:`color-mix(in oklch, ${primary} 22%, transparent)`, background:`radial-gradient(120% 140% at 50% 0%, color-mix(in oklch, ${primary} 16%, transparent), color-mix(in oklch, ${accent} 8%, transparent) 60%, transparent)` }}>
          {showCosmo && (
            <div className="relative mx-auto mb-4 h-28 w-28">
              <div className="absolute inset-0 rounded-full blur-2xl" style={{ background:`color-mix(in oklch, ${accent} 50%, transparent)` }} />
              <img src="/cosmo/cosmo-head.png" alt="Cosmo" className="cosmo-float relative h-28 w-28 object-contain" />
            </div>
          )}
          {tenant.mascot === "zeko" && <img src="/zeko-point.png" alt="" className="mx-auto mb-2 h-28 w-28 rounded-full object-cover object-top" />}
          <h2 className="font-display text-3xl font-black sm:text-5xl">Your first candle<br />starts today.</h2>
          <p className="mx-auto mt-4 max-w-md text-white/65">Join {tenant.name}. Deposit at {tenant.brokerName}, verify via Telegram, and unlock your first signals in minutes.</p>
          <div className="mt-7 flex justify-center">
            <button onClick={goRegister} className="inline-flex items-center gap-2 rounded-full px-9 py-4 text-sm font-black text-black transition-transform hover:-translate-y-0.5" style={{ background: primary, boxShadow:`0 14px 40px -12px ${primary}` }}>Start free — €0 <ArrowRight className="h-4 w-4" /></button>
          </div>
          <p className="mt-4 text-[11px] text-white/45">Questions? <a href={`mailto:${tenant.affiliateEmail}`} className="underline hover:text-white">{tenant.affiliateEmail}</a></p>
        </div>
      </section>

      {/* ─────────────────────── WHITE-LABEL ─────────────────────── */}
      {showCosmo && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.02]">
            <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: primary }}>
                  <Sparkles className="h-4 w-4" /> For creators & communities
                </p>
                <h2 className="mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">Run this exact academy<br />under your own brand.</h2>
                <p className="mt-4 max-w-md text-sm text-white/65">
                  Everything you just scrolled — signals, auto-trader, academy, quizzes, rewards — is a white-label engine. Bring your audience; we handle the desk, the tech and the broker deal. Your colours, your name, your mascot.
                </p>
                <ul className="mt-5 space-y-2">
                  {["Your branding, live in a day", "We run the signals & the platform", "You earn from the broker partnership"].map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-white/80"><CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: primary }} />{p}</li>
                  ))}
                </ul>
                <Link to="/partner-programm" className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-black transition-transform hover:-translate-y-0.5" style={{ background: primary, boxShadow: `0 12px 36px -12px ${primary}` }}>Become a partner <ArrowRight className="h-4 w-4" /></Link>
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

function SectionHead({ n, kicker, title, sub, primary, center }: { n: string; kicker: string; title: string; sub?: string; primary: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      <div className={cn("flex items-baseline gap-3", center && "justify-center")}>
        <span className="font-display text-sm font-black tabular-nums" style={{ color: primary }}>{n}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">{kicker}</span>
      </div>
      <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
      {sub && <p className={cn("mt-3 max-w-2xl text-sm text-white/60", center && "mx-auto")}>{sub}</p>}
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
