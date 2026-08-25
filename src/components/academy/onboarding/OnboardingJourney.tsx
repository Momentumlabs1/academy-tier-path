/**
 * OnboardingJourney — the dashboard's guided first-session state machine,
 * driven by the member's REAL deposit amount (not just funded yes/no).
 *
 * Core mechanic: we remember the last deposit amount the user was shown
 * (localStorage, per account). Whenever the live amount RISES above that,
 * a celebration fires — and its content is amount-aware:
 *   · amount < €100  → partial celebration: "€50 angekommen — noch €50 bis
 *     Foundation", progress bar, top-up CTA. No false unlock party.
 *   · amount ≥ €100  → full unlock/tier celebration with the staged tour
 *     (Telegram → Signals → Lessons → Tools) and the real tier name.
 *     Also fires again on later tier jumps (e.g. €100 → €2.000 Operator).
 *
 * Stages:
 *   "video"     — €0, intro not watched: Cosmo video integrated in the dashboard
 *   "ignite"    — €0, video done: pulsing next-step strip + deposit watcher
 *   "topup"     — €1–99: real-amount strip with progress to Foundation + watcher
 *   "celebrate" — amount rose: overlay (partial or full variant)
 *   "done"      — funded & everything acknowledged
 *
 * The deposit watcher polls the member row every 20 s and on tab focus, so the
 * dashboard reacts on its own when the broker webhook books the money.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight, BookOpen, Calculator, Loader2, PartyPopper, PiggyBank, PlayCircle, Radio, Send, Sparkles, X,
} from "lucide-react";
import { useMemberRefresh, useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { TIERS, tierForDeposit } from "@/lib/academy-data";
import { PRODUCTS } from "@/lib/products";
import { BROKER, BROKER_SWITCH, TELEGRAM_ENTRY } from "@/lib/broker";
import { BrokerPausedNotice } from "@/components/academy/tier/BrokerPausedNotice";
import { markDepositClick, depositClickedAt, clearDepositClick } from "@/lib/deposit-intent";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/academy/primitives/Card";
import { cn } from "@/lib/utils";

const FOUNDATION_MIN = TIERS[0].minDeposit; // €100

/* ── per-account persistence ────────────────────────────────────────────────── */
const k = (email: string, what: string) => `onb_${what}:${email.toLowerCase()}`;
const readFlag = (email: string, what: string) => {
  try { return localStorage.getItem(k(email, what)) === "1"; } catch { return false; }
};
const writeFlag = (email: string, what: string) => {
  try { localStorage.setItem(k(email, what), "1"); } catch { /* private mode */ }
};
const readSeen = (email: string) => {
  try { return Number(localStorage.getItem(k(email, "seen")) ?? 0) || 0; } catch { return 0; }
};
const writeSeen = (email: string, amount: number) => {
  try { localStorage.setItem(k(email, "seen"), String(amount)); } catch { /* private mode */ }
};

type Stage = "loading" | "video" | "ignite" | "verifying" | "topup" | "celebrate" | "done";

/* ── deposit watcher (poll + focus) ─────────────────────────────────────────── */
function useDepositWatcher(active: boolean) {
  const refresh = useMemberRefresh();
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(refresh, 20_000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [active, refresh]);
}

/* ── Stage 1: integrated welcome video ──────────────────────────────────────── */
function WelcomeVideoCard({ accent, onDone }: { accent: string; onDone: () => void }) {
  const [videoOk, setVideoOk] = useState(true);
  return (
    <Card variant="hero" className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: `color-mix(in oklch, ${COSMO.primaryColor} 22%, transparent)` }} />
      <div className="relative">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: COSMO.primaryColor }}>Step 1 of 2</div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">Welcome! Cosmo explains how everything works — in 30 seconds</h2>
        <p className="mt-1 text-sm text-foreground/65">
          In short: <span className="font-semibold text-foreground/85">you never pay us</span> — you fund your own account at a licensed, regulated broker — and that is what unlocks everything here.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
          {videoOk ? (
            <video controls playsInline className="aspect-video w-full object-cover" onEnded={onDone} onError={() => setVideoOk(false)}>
              <source src="/intro.mp4" type="video/mp4" />
            </video>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom}, ${COSMO.bgTo})` }}>
              <PlayCircle className="h-12 w-12 text-white/30" />
              <p className="max-w-md text-sm text-white/70">
                <b>How it works:</b> Your first deposit of {formatMoney(FOUNDATION_MIN, "€")}+ stays <b>your money</b> in <b>your own broker account</b> — it unlocks signals, lessons and tools. We earn from the broker, not from you.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={onDone} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-[#08111a] transition-transform hover:scale-[1.03]" style={{ background: accent }}>
            Got it — continue <ArrowRight className="h-4 w-4" />
          </button>
          <span className="text-xs text-foreground/50">Next we'll show you where to start.</span>
        </div>
      </div>
    </Card>
  );
}

/* ── Stage 2a: €0 ignite strip ──────────────────────────────────────────────── */
function IgniteStrip({ accent, href, onDeposit, onSaysDeposited }: { accent: string; href: string; onDeposit: () => void; onSaysDeposited: () => void }) {
  useDepositWatcher(true);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center" style={{ borderColor: `color-mix(in oklch, ${accent} 40%, transparent)`, background: `color-mix(in oklch, ${accent} 8%, transparent)` }}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: accent }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">Next step:</span>{" "}
        <span className="text-foreground/75">Everything starts on Telegram — we send you the broker link, walk you through opening the account, and your first deposit of {formatMoney(FOUNDATION_MIN, "€")}+ unlocks the rest.</span>
      </p>
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onDeposit} className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-[#08111a] transition-transform hover:scale-[1.03]" style={{ background: accent }}>
        Start on Telegram →
      </a>
      {/* Der ruhige zweite Weg. Wer schon eingezahlt hat, soll das sagen
          koennen, statt darauf zu warten, dass der Broker-Abgleich ihn
          irgendwann findet — der laeuft nur ein paar Mal am Tag. Bewusst
          unauffaellig: der Hauptweg ist und bleibt Telegram. */}
      <button
        type="button"
        onClick={onSaysDeposited}
        className="shrink-0 rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
      >
        I already deposited
      </button>
    </div>
  );
}

/* ── Stage 2a·II: "we're checking your deposit…" — after the member clicks
   Deposit, before the broker sync books it. The watcher flips this to the
   celebration automatically once members.deposit > 0.

   The broker database refreshes every 10 minutes, so this is a real wait and the
   member has to be told plainly — otherwise a blank dashboard reads as "it
   didn't work". The countdown runs from the CLICK, not from page load: someone
   who deposits and comes back six minutes later sees four minutes left. Once the
   window passes we stop counting and say we're still checking, rather than
   sitting at 0:00 or implying something broke. ─────────────────────────────── */
const VERIFY_WINDOW_MS = 10 * 60 * 1000;

function VerifyingCard({ accent, href, onDeposit, since }: {
  accent: string; href: string; onDeposit: () => void; since: number;
}) {
  useDepositWatcher(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const elapsed = since > 0 ? Math.max(0, now - since) : 0;
  const left = Math.max(0, VERIFY_WINDOW_MS - elapsed);
  const overdue = since > 0 && left === 0;
  const pct = Math.min(100, Math.round((elapsed / VERIFY_WINDOW_MS) * 100));
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);

  return (
    <Card variant="hero" className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl" style={{ background: `color-mix(in oklch, ${accent} 20%, transparent)` }} />
      <div className="relative">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `color-mix(in oklch, ${accent} 16%, transparent)`, color: accent }}>
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
              Deposit in progress
            </div>
            <h2 className="mt-0.5 font-display text-xl font-bold leading-tight sm:text-2xl">
              {overdue ? "Still checking with " + BROKER.name + "…" : "We're checking your deposit"}
            </h2>
            <p className="mt-1.5 text-sm text-foreground/70">
              {overdue ? (
                <>This is taking a little longer than usual. Your money is safe in your own broker account — we're still waiting for the confirmation and will unlock everything the moment it lands.</>
              ) : (
                <>The broker confirms deposits in batches, so this takes <b className="text-foreground">up to 10 minutes</b>. You don't have to wait here — everything unlocks automatically, and we'll email you as soon as it's done.</>
              )}
            </p>
          </div>
        </div>

        {/* Countdown + progress */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/55">
              {overdue ? "Checking every few seconds" : "Usually confirmed in"}
            </span>
            {!overdue && (
              <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: accent }}>
                {mm}:{String(ss).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn("h-full rounded-full transition-all duration-1000", overdue && "animate-pulse")}
              style={{ width: overdue ? "100%" : `${Math.max(4, pct)}%`, background: accent }}
            />
          </div>
        </div>

        <p className="mt-3 text-[11px] text-foreground/50">
          Not deposited yet?{" "}
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={onDeposit} className="underline hover:text-foreground">
            Ask us on Telegram →
          </a>
        </p>
      </div>
    </Card>
  );
}

/* ── Stage 2b: partial-deposit strip (real amount, progress to Foundation) ──── */
function TopupStrip({ accent, amount, href, onDeposit }: { accent: string; amount: number; href: string; onDeposit: () => void }) {
  useDepositWatcher(true);
  const missing = Math.max(0, FOUNDATION_MIN - amount);
  const pct = Math.min(100, Math.round((amount / FOUNDATION_MIN) * 100));
  return (
    <div className="rounded-2xl border px-4 py-3.5" style={{ borderColor: `color-mix(in oklch, ${accent} 45%, transparent)`, background: `color-mix(in oklch, ${accent} 8%, transparent)` }}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklch, ${accent} 16%, transparent)`, color: accent }}>
          <PiggyBank className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-bold">{formatMoney(amount, "€")} of {formatMoney(FOUNDATION_MIN, "€")}</span>{" "}
          <span className="text-foreground/75">— only <b style={{ color: accent }}>{formatMoney(missing, "€")}</b> to go until Foundation (signals, lessons & tools).</span>
        </p>
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={onDeposit} className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-[#08111a] transition-transform hover:scale-[1.03]" style={{ background: accent }}>
          Top up — ask on Telegram →
        </a>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: accent }} />
      </div>
    </div>
  );
}

/* ── Stage 3: celebration overlay (partial vs full) ─────────────────────────── */
const UNLOCKS = [
  { icon: Send, title: "Telegram group", body: "Live signals straight to your phone" },
  { icon: Radio, title: "Live signals", body: "Real-time calls from the desk" },
  { icon: BookOpen, title: "Academy lessons", body: "Your complete course" },
  { icon: Calculator, title: "Trader tools", body: "Size & risk calculators" },
];

function Confetti({ accent, count = 56 }: { accent: string; count?: number }) {
  const pieces = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      left: (i * 37) % 100, delay: ((i * 13) % 24) / 10, dur: 2.6 + ((i * 7) % 18) / 10,
      size: 6 + ((i * 11) % 8), hue: i % 3, spin: (i * 29) % 360,
    })), [count]);
  const colors = [accent, COSMO.primaryColor, "#ffcf5c"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p, i) => (
        <span key={i} className="onb-confetti absolute top-[-4%] block rounded-[2px]"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.45, background: colors[p.hue],
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.spin}deg)` }} />
      ))}
    </div>
  );
}

const KIND_ICON = { telegram: Send, lessons: BookOpen, page: Sparkles, service: Radio } as const;

function CelebrationOverlay({ accent, amount, href, onDeposit, prevAmount, tierName, onClose }: {
  accent: string; amount: number; href: string; onDeposit: () => void; prevAmount: number; tierName: string | undefined; onClose: () => void;
}) {
  const full = amount >= FOUNDATION_MIN;
  const missing = Math.max(0, FOUNDATION_MIN - amount);
  const pct = Math.min(100, Math.round((amount / FOUNDATION_MIN) * 100));
  const [step, setStep] = useState(0);
  const closed = useRef(false);

  // Tier UPGRADE (was already Foundation+): show the NEWLY unlocked perks of the
  // reached tier(s), not the base unlocks the member already had.
  const items = useMemo(() => {
    if (!full) return UNLOCKS;
    const prevRank = (() => { const t = tierForDeposit(prevAmount); return t ? TIERS.findIndex((x) => x.key === t.key) : -1; })();
    const newRank = (() => { const t = tierForDeposit(amount); return t ? TIERS.findIndex((x) => x.key === t.key) : -1; })();
    if (prevRank < 0 || newRank <= prevRank) return UNLOCKS; // first funding → base tour
    const fresh = PRODUCTS
      .filter((p) => { const r = TIERS.findIndex((t) => t.key === p.requires); return r > prevRank && r <= newRank; })
      .map((p) => ({ icon: KIND_ICON[p.kind] ?? Sparkles, title: p.name, body: p.description }));
    return fresh.length ? fresh : UNLOCKS;
  }, [full, amount, prevAmount]);

  useEffect(() => {
    if (!full) return;
    const timers = items.map((_, i) => setTimeout(() => setStep(i + 1), 900 + i * 550));
    return () => timers.forEach(clearTimeout);
  }, [full, items]);

  const close = () => { if (!closed.current) { closed.current = true; onClose(); } };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <Confetti accent={accent} count={full ? 56 : 26} />
      <div className="onb-pop-in relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1420] p-6 shadow-2xl sm:p-8">
        <button onClick={close} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground/50 hover:bg-white/10 hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `color-mix(in oklch, ${accent} 18%, transparent)`, color: accent }}>
            {full ? <PartyPopper className="h-6 w-6" /> : <PiggyBank className="h-6 w-6" />}
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Deposit detected</div>
            <h2 className="font-display text-2xl font-bold leading-tight">
              {full ? <>Welcome to the {tierName ?? "Foundation"} level! 🎉</> : <>{formatMoney(amount, "€")} just arrived!</>}
            </h2>
          </div>
        </div>

        {full ? (
          <>
            <p className="mt-3 text-sm text-foreground/70">
              Verified deposit: <b>{formatMoney(amount, "€")}</b> — all of this is yours now:
            </p>
            <div className="mt-4 grid gap-2.5">
              {items.map((u, i) => (
                <div key={u.title} className={cn("flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 transition-all", i < step ? "onb-unlock-pop opacity-100" : "opacity-0")}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklch, ${accent} 14%, transparent)`, color: accent }}>
                    <u.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold leading-tight">{u.title}</div>
                    <div className="text-[11px] text-foreground/55">{u.body}</div>
                  </div>
                  <span className="text-sm font-black" style={{ color: accent }}>✓</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/signals" onClick={close} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#08111a] transition-transform hover:scale-[1.02]" style={{ background: accent }}>
                <Send className="h-4 w-4" /> Connect Telegram
              </Link>
              <button onClick={close} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-foreground/80 hover:bg-white/5">
                Later — go to dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-foreground/70">
              Nice — your money landed in your broker account. You are only <b style={{ color: accent }}>{formatMoney(missing, "€")}</b> away from <b>Foundation</b> (signals, lessons, tools):
            </p>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between font-mono text-xs text-foreground/60">
                <span>{formatMoney(amount, "€")}</span><span>{formatMoney(FOUNDATION_MIN, "€")}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="onb-fill h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
              </div>
            </div>
            <div className="mt-4 grid gap-2 opacity-70">
              {UNLOCKS.slice(0, 3).map((u) => (
                <div key={u.title} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5">
                  <u.icon className="h-4 w-4 shrink-0 text-foreground/40" />
                  <span className="flex-1 text-sm text-foreground/60">{u.title}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">at {formatMoney(FOUNDATION_MIN, "€")}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => { onDeposit(); close(); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#08111a] transition-transform hover:scale-[1.02]" style={{ background: accent }}>
                <Sparkles className="h-4 w-4" /> Top up {formatMoney(missing, "€")} — start on Telegram
              </a>
              <button onClick={close} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-foreground/80 hover:bg-white/5">
                Okay
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes onb-fall { 0% { transform: translateY(-6vh) rotate(0deg); opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(108vh) rotate(540deg); opacity: 0; } }
        .onb-confetti { animation-name: onb-fall; animation-timing-function: linear; animation-iteration-count: 1; animation-fill-mode: forwards; }
        @keyframes onb-pop { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.02); } 100% { transform: scale(1); opacity: 1; } }
        .onb-pop-in { animation: onb-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes onb-unlock { 0% { transform: translateY(10px) scale(0.96); opacity: 0; } 60% { transform: translateY(-2px) scale(1.01); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        .onb-unlock-pop { animation: onb-unlock 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes onb-grow { from { width: 0; } }
        .onb-fill { animation: onb-grow 1s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>
    </div>
  );
}

/* ── Orchestrator ──────────────────────────────────────────────────────────── */
export function OnboardingJourney() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.primaryColor;
  // tick VALUE must be a memo dependency — advancing a stage writes localStorage
  // (invisible to React), so we re-derive off this counter.
  const [tick, setTick] = useState(0);
  const advance = () => setTick((n) => n + 1);
  // Session fallback if localStorage writes are blocked (private mode / policy):
  // remembers the last acknowledged amount + whether the intro video was watched,
  // so dismissing the celebration always sticks for the session.
  const ackSeen = useRef(0);
  const videoAck = useRef(false);

  const email = state.profile.email;
  const amount = state.lifetimeDeposits;
  // A partner-referred member deposits via the PARTNER's broker link, so the
  // broker attributes the client to them; master members use the default IB link.
  const brokerUrl = brand?.brokerUrl || BROKER.url;

  const stage: Stage = useMemo(() => {
    if (!state.loaded || !email) return "loading";
    const seen = Math.max(readSeen(email), ackSeen.current);
    if (amount > seen) return "celebrate";                 // money arrived (or grew) → party (amount-aware)
    if (amount <= 0) {
      const introDone = readFlag(email, "video") || videoAck.current;
      if (!introDone) return "video";
      // Clicked "Deposit" but nothing booked yet → show the verifying state.
      if (depositClickedAt(email) > 0) return "verifying";
      return "ignite";
    }
    if (amount < FOUNDATION_MIN) return "topup";           // partially funded → real-amount strip
    return "done";
  }, [state.loaded, email, amount, tick]);

  // Third arg is the partner's own link when they have one; the broker itself
  // decides the tracking parameter.
  // Telegram, not the broker — see TELEGRAM_ENTRY in broker.ts.
  const href = TELEGRAM_ENTRY.url;
  // EIN TELEGRAM-KLICK IST KEINE EINZAHLUNG.
  //
  // Hier stand `markDepositClick(email)` am Telegram-Knopf. Das schaltete die
  // Ansicht drei Stunden lang auf "We're checking your deposit" und ab Minute
  // zehn auf "Your money is safe in your HeroFX account" — bei jemandem, der
  // gerade erst auf einen Chat getippt hat und womoeglich noch gar kein
  // Broker-Konto besitzt. Eine Tatsachenbehauptung ueber fremdes Geld, die
  // nichts belegt. Aus derselben Codebasis wurden Regulierungs-Aussagen und
  // erfundene Zahlen aus genau diesem Grund entfernt.
  //
  // Schlimmer noch: im "verifying"-Zustand verschwand der Einzahl-Aufruf bis
  // auf einen 11px-Link. Wer bloss Telegram angetippt hatte, sah drei Stunden
  // lang keinen naechsten Schritt mehr.
  //
  // Der Telegram-Knopf oeffnet jetzt nur Telegram. Die Pruefung startet, wenn
  // ein Mensch sagt, dass er eingezahlt hat — siehe onSaysDeposited.
  const onDeposit = () => { advance(); };

  /** Erst DIESER Klick behauptet eine Einzahlung — weil ihn der Nutzer macht. */
  const onSaysDeposited = () => { markDepositClick(email); advance(); };

  if (stage === "loading" || stage === "done") return null;
  if (stage === "video") {
    return <WelcomeVideoCard accent={accent} onDone={() => { writeFlag(email, "video"); videoAck.current = true; advance(); }} />;
  }
  // Mid-switch: "ignite" and "topup" are the two stages that hand a member off to
  // the broker, so they become the notice. "verifying" is left alone — that member
  // already deposited, and the existing sync still books it. See BROKER_SWITCH.
  if (BROKER_SWITCH.paused && (stage === "ignite" || stage === "topup")) {
    return <BrokerPausedNotice className="mb-6" />;
  }
  if (stage === "ignite") return <IgniteStrip accent={accent} href={href} onDeposit={onDeposit} onSaysDeposited={onSaysDeposited} />;
  if (stage === "verifying") return <VerifyingCard accent={accent} href={href} onDeposit={onDeposit} since={depositClickedAt(email)} />;
  if (stage === "topup") return <TopupStrip accent={accent} amount={amount} href={href} onDeposit={onDeposit} />;
  return (
    <CelebrationOverlay
      accent={accent}
      amount={amount}
      href={href}
      onDeposit={onDeposit}
      prevAmount={readSeen(email)}
      tierName={state.currentTier?.name}
      onClose={() => { writeSeen(email, amount); writeFlag(email, "video"); clearDepositClick(email); ackSeen.current = amount; videoAck.current = true; advance(); }}
    />
  );
}
