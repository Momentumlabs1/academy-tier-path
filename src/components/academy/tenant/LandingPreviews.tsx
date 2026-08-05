/**
 * LandingPreviews — animated, self-contained product mockups shown on the
 * landing page. Each one is a faithful mini-slice of a real feature (signals,
 * auto-trader, academy, quizzes, rewards, white-label) so the page SHOWS the
 * product instead of describing it. Pure CSS/SVG animation — SSR-safe, no libs.
 *
 * All previews take the tenant's `primary`/`accent` so partner pages render
 * their own colors. Deterministic data only (no random) for hydration safety.
 */
import {
  TrendingUp, TrendingDown, Radio, CheckCircle2, PlayCircle, Bot, Flame,
  Trophy, Zap, Sparkles, Lock, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/tenants";

const UP = "oklch(0.82 0.17 150)";
const DOWN = "oklch(0.66 0.2 22)";

/** Shared keyframes for every preview — emitted once per preview instance
 *  (duplicate <style> tags are harmless and keep each preview drop-in). */
function PreviewStyles() {
  return (
    <style>{`
      @keyframes lpDraw { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
      @keyframes lpRise { 0% { transform: translateY(8px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      @keyframes lpFill { from { width: 0; } }
      @keyframes lpPulse { 0%,100% { opacity: .4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
      @keyframes lpPop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes lpSlide { 0% { transform: translateY(-120%); opacity: 0; } 12%,88% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-120%); opacity: 0; } }
      @keyframes lpFlash { 0%,45% { background: rgba(255,255,255,.03); } 55%,100% { background: color-mix(in oklch, ${UP} 16%, transparent); } }
      @keyframes lpCount { 0%,40% { opacity:0; transform: translateY(6px);} 55%,100% { opacity:1; transform: translateY(0);} }
      @keyframes lpFlame { 0%,100% { transform: rotate(-4deg) scale(1);} 50% { transform: rotate(4deg) scale(1.08);} }
      @media (prefers-reduced-motion: reduce) {
        .lp-draw,.lp-rise,.lp-fill,.lp-pulse,.lp-pop,.lp-slide,.lp-flash,.lp-count,.lp-flame { animation: none !important; }
        .lp-draw { stroke-dashoffset: 0 !important; } .lp-fill span { width: var(--w) !important; }
      }
    `}</style>
  );
}

function Frame({ label, children, primary }: { label: string; children: React.ReactNode; primary: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d16] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-white/8 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          <span className="lp-pulse h-1.5 w-1.5 rounded-full" style={{ background: primary }} />{label}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── 1. Live signals — Telegram-style feed with a new call sliding in ── */
export function SignalsPreview({ primary }: { primary: string }) {
  return (
    <Frame label="Signals · live" primary={primary}>
      <PreviewStyles />
      <div className="space-y-2.5">
        <div className="lp-slide relative overflow-hidden rounded-xl border border-white/10 p-3" style={{ background: "color-mix(in oklch, oklch(0.82 0.17 150) 8%, transparent)", animation: "lpSlide 6s ease-in-out infinite" }}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold" style={{ color: UP }}><TrendingUp className="h-3.5 w-3.5" /> LONG · XAU/USD</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">now</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
            <div><div className="text-white/40">Entry</div><div className="text-white">2,318.4</div></div>
            <div><div className="text-white/40">SL</div><div style={{ color: DOWN }}>2,311.0</div></div>
            <div><div className="text-white/40">TP</div><div style={{ color: UP }}>2,334.0</div></div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 opacity-70">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold" style={{ color: DOWN }}><TrendingDown className="h-3.5 w-3.5" /> SHORT · NAS100</span>
          <span className="font-mono text-[11px]" style={{ color: UP }}>✓ TP1 hit</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 opacity-50">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold" style={{ color: UP }}><TrendingUp className="h-3.5 w-3.5" /> LONG · BTC/USDT</span>
          <span className="font-mono text-[11px]" style={{ color: UP }}>✓ TP2 hit</span>
        </div>
      </div>
    </Frame>
  );
}

/* ── 2. Auto-trader / bot — equity curve draws, positions, live P/L ── */
export function BotPreview({ primary }: { primary: string }) {
  return (
    <Frame label="Auto-Trader · copying desk" primary={primary}>
      <PreviewStyles />
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-white/80"><Bot className="h-4 w-4" style={{ color: primary }} /> Master account</div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/70">
          <span className="lp-pulse h-1.5 w-1.5 rounded-full" style={{ background: UP }} /> Copying ON
        </div>
      </div>
      <div className="relative h-24 w-full overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
        <svg viewBox="0 0 320 96" className="h-full w-full" preserveAspectRatio="none">
          <defs><linearGradient id="lpArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={primary} stopOpacity="0.25" /><stop offset="100%" stopColor={primary} stopOpacity="0" /></linearGradient></defs>
          <path d="M0,80 L40,72 L80,76 L120,58 L160,62 L200,40 L240,44 L280,22 L320,10 L320,96 L0,96 Z" fill="url(#lpArea)" />
          <path className="lp-draw" d="M0,80 L40,72 L80,76 L120,58 L160,62 L200,40 L240,44 L280,22 L320,10" fill="none" stroke={primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ strokeDasharray: 620, animation: "lpDraw 2.4s ease-out forwards" }} />
        </svg>
        <div className="lp-count absolute right-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-[11px] font-bold" style={{ color: UP, animation: "lpCount 2.6s ease-out forwards" }}>+18.4%</div>
      </div>
      <div className="mt-3 space-y-1.5">
        {[["XAU/USD", "LONG", "+1.4%", true], ["EUR/USD", "SHORT", "+0.6%", true]].map(([p, d, r, u], i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 font-mono text-[11px]">
            <span className="text-white/80">{p}</span>
            <span className="text-white/40">{d}</span>
            <span style={{ color: u ? UP : DOWN }}>{r}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── 3. Academy — lesson with progress + XP ── */
export function AcademyPreview({ primary, accent }: { primary: string; accent: string }) {
  return (
    <Frame label="Academy · 12 lessons" primary={primary}>
      <PreviewStyles />
      <div className="relative mb-3 aspect-video overflow-hidden rounded-xl border border-white/8">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 40%, #0a0d16), #0a0d16)` }} />
        <div className="absolute inset-0 flex items-center justify-center"><span className="flex h-11 w-11 items-center justify-center rounded-full shadow-lg" style={{ background: primary }}><PlayCircle className="h-6 w-6 text-black" /></span></div>
        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/80">08:24</span>
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-black" style={{ background: primary }}><Zap className="h-3 w-3" /> +80 XP</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/60"><span className="font-semibold text-white/85">Lesson 4 · Reading orderflow</span><span>4 / 12</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
        <span className="lp-fill block h-full rounded-full" style={{ ["--w" as string]: "34%", width: "34%", background: primary, animation: "lpFill 1.6s ease-out" }} />
      </div>
      <div className="mt-3 flex gap-1.5">
        {[true, true, true, false, false, false].map((done, i) => (
          <span key={i} className="flex h-6 flex-1 items-center justify-center rounded-md text-[10px] font-bold" style={done ? { background: `color-mix(in oklch, ${primary} 22%, transparent)`, color: primary } : { background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.3)" }}>{done ? <Check className="h-3 w-3" /> : <Lock className="h-2.5 w-2.5" />}</span>
        ))}
      </div>
    </Frame>
  );
}

/* ── 4. Live quiz — correct answer lights up, XP reward pops ── */
export function QuizPreview({ primary }: { primary: string }) {
  const opts = [
    { t: "Cut the loss and re-assess", correct: true },
    { t: "Add to the losing position", correct: false },
    { t: "Remove the stop-loss", correct: false },
  ];
  return (
    <Frame label="Live quiz" primary={primary}>
      <PreviewStyles />
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50"><Sparkles className="h-3.5 w-3.5" style={{ color: primary }} /> Question 3 / 5</span>
        <span className="font-mono text-[11px] text-white/50">00:12</span>
      </div>
      <p className="text-sm font-semibold text-white/90">Your trade hits the stop-loss. What's the plan?</p>
      <div className="mt-3 space-y-2">
        {opts.map((o, i) => (
          <div key={i} className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs", o.correct ? "lp-flash border-transparent" : "border-white/8 bg-white/[0.02]")}
            style={o.correct ? { animation: "lpFlash 4s ease-in-out infinite", borderColor: `color-mix(in oklch, ${UP} 40%, transparent)` } : {}}>
            <span className={o.correct ? "font-semibold text-white" : "text-white/70"}>{o.t}</span>
            {o.correct && <CheckCircle2 className="lp-pop h-4 w-4" style={{ color: UP, animation: "lpPop 4s ease-in-out infinite" }} />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <span className="lp-pop inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black text-black" style={{ background: primary, animation: "lpPop 4s ease-in-out infinite" }}><Zap className="h-3.5 w-3.5" /> +50 XP earned</span>
      </div>
    </Frame>
  );
}

/* ── 5. Rewards / earning — level bar, streak, tier ladder, unlock ── */
export function RewardsPreview({ primary, accent }: { primary: string; accent: string }) {
  const tiers = [{ n: "Foundation", on: true }, { n: "Operator", on: true }, { n: "Elite", on: false }];
  return (
    <Frame label="Rewards · your progress" primary={primary}>
      <PreviewStyles />
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2"><Trophy className="h-4 w-4" style={{ color: primary }} /><span className="text-sm font-bold text-white/90">Level 7</span></div>
        <span className="lp-flame inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-white/80" style={{ animation: "lpFlame 2.2s ease-in-out infinite" }}><Flame className="h-3.5 w-3.5" style={{ color: accent }} /> 12-day streak</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/50"><span>1,840 XP</span><span>2,000 XP → Level 8</span></div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/8">
        <span className="lp-fill block h-full rounded-full" style={{ ["--w" as string]: "72%", width: "72%", background: `linear-gradient(90deg, ${accent}, ${primary})`, animation: "lpFill 1.8s ease-out" }} />
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        {tiers.map((t, i) => (
          <div key={i} className="flex flex-1 items-center gap-1.5">
            <div className="flex-1 rounded-lg px-2 py-1.5 text-center text-[10px] font-bold" style={t.on ? { background: `color-mix(in oklch, ${primary} 20%, transparent)`, color: primary } : { background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.35)" }}>{t.n}</div>
            {i < tiers.length - 1 && <span className="text-white/20">›</span>}
          </div>
        ))}
      </div>
      <div className="lp-rise mt-3 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: `color-mix(in oklch, ${primary} 30%, transparent)`, background: `color-mix(in oklch, ${primary} 8%, transparent)`, animation: "lpRise 1s ease-out .6s both" }}>
        <CheckCircle2 className="h-4 w-4" style={{ color: primary }} /><span className="text-[11px] font-semibold text-white/85">Unlocked: Live trading room</span>
      </div>
    </Frame>
  );
}

/* ── 6. White-label — the same academy, three partner skins ── */
export function WhitelabelPreview({ primary }: { primary: string }) {
  const skins = [
    { name: "Cosmos", c: BRAND.primary, a: BRAND.accent },
    { name: "Crypto Masters", c: "oklch(0.82 0.2 60)", a: "oklch(0.72 0.16 30)" },
    { name: "FX Elite", c: "oklch(0.75 0.18 250)", a: "oklch(0.65 0.2 200)" },
  ];
  return (
    <Frame label="White-label · your brand" primary={primary}>
      <PreviewStyles />
      <div className="grid grid-cols-3 gap-2.5">
        {skins.map((s, i) => (
          <div key={i} className="lp-rise overflow-hidden rounded-xl border border-white/10 bg-[#070a13]" style={{ animation: `lpRise .8s ease-out ${i * 0.15}s both` }}>
            <div className="h-8" style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${s.a} 45%, #070a13), #070a13)` }} />
            <div className="space-y-1.5 p-2">
              <div className="h-1.5 w-2/3 rounded-full" style={{ background: s.c }} />
              <div className="h-1 w-full rounded-full bg-white/10" />
              <div className="h-1 w-4/5 rounded-full bg-white/10" />
              <div className="mt-1.5 h-3 w-full rounded" style={{ background: `color-mix(in oklch, ${s.c} 30%, transparent)` }} />
              <div className="pt-0.5 text-center text-[8px] font-bold text-white/50">{s.name}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-white/50">One platform · every partner their own colours, broker & mascot</p>
    </Frame>
  );
}
