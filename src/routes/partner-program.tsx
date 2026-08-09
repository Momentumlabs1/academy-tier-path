/**
 * /partner-program — the landing page sent to a PROSPECTIVE partner.
 *
 * This page is about the programme, not about any one partner. An earlier
 * version built its whole proof section around Zeko Global — a real partner, but
 * one of many — which made the pitch read as "look at him" instead of "here is
 * what you get". He now appears once, as a reference line at the foot of the
 * page where a name-drop belongs.
 *
 * Four questions, in the order a partner asks them:
 *   01  what exactly do I get
 *   02  what happens, step by step, and what do I have to do myself
 *   03  what does it pay
 *   04  why is this legitimate for the people I send
 *
 * Public. The partner LOGIN/dashboard lives at /partner; this is the pitch.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowUpRight, Bot, Gauge, GraduationCap, LayoutDashboard, Radio, Send, Wallet,
} from "lucide-react";
import { ProductShots } from "@/components/academy/partner/ProductShots";
import { EarningsEstimator } from "@/components/academy/partner/EarningsEstimator";
import { BROKER, BROKER_SWITCH } from "@/lib/broker";
import { BRAND } from "@/lib/tenants";
import { COMMISSION_LADDER } from "@/lib/commission";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/partner-program")({
  head: () => ({
    meta: [
      { title: "Partner Program — Cosmos Candles" },
      { name: "description", content: "Get a complete trading academy under your own brand for free, and earn on every lot your community trades. See exactly what you get, how it runs, and what it pays." },
    ],
  }),
  component: PartnerProgramm,
});

const CONTACT = "kontakt@momentumlabs.at";
const applyHref = `mailto:${CONTACT}?subject=${encodeURIComponent("Become a partner — Cosmos Candles")}`;

/** 01 — written in full sentences, because "what do I actually get" was the gap. */
const GET = [
  {
    icon: LayoutDashboard,
    title: "A complete website under your name",
    body: "Your own landing page at cosmos-candles.com/yourname, carrying your name, your colours and your character. Your audience signs up there, sees your brand throughout, and never lands on ours. Hosting, updates and maintenance are on us — there is nothing for you to build or pay for.",
  },
  {
    icon: Radio,
    title: "Live trade signals, delivered for you",
    body: "Every call from our desk — instrument, entry, stop loss, take-profit levels — is pushed to a private Telegram channel that belongs to your brand. You never have to write, time or interpret a signal yourself.",
  },
  {
    icon: GraduationCap,
    title: "The full academy, not a broker link",
    body: "Twelve structured lessons from the first candle through to real orderflow: volume profile, footprint charts, Level 2 depth, risk and position sizing. Plus the calculators your people need to size a trade properly. This is the part that keeps them around once the novelty of a signal wears off.",
  },
  {
    icon: Bot,
    title: "Onboarding that runs without you",
    body: "Sign-up, deposit verification, Telegram access and tier unlocks all happen automatically, usually within minutes of a deposit landing. Nobody waits on you, and you do not answer support tickets at midnight.",
  },
  {
    icon: Gauge,
    title: "Your own dashboard",
    body: "Clicks, sign-ups, funded accounts, volume traded, your current level and every euro of commission — live, and visible only to you. No other partner can see your numbers and you cannot see theirs.",
  },
  {
    icon: Send,
    title: "A private community channel",
    body: "Your members get a Telegram group under your brand where the desk posts, questions get answered and people stay accountable to each other. Community is what makes them keep trading, which is what makes this recur.",
  },
];

/** 02 — the sequence, with the partner's own effort called out honestly. */
const STEPS = [
  {
    title: "You get in touch",
    you: "5 minutes",
    body: "Send a short message with your name, your channel and roughly how big your audience is. That is the whole application.",
  },
  {
    title: "We build your page",
    you: "one call",
    body: "We take your name, colours and character and set your brand up. You review it once and say go. Usually live the same day.",
  },
  {
    title: "You share your link",
    you: "ongoing",
    body: "One link, in your bio or a post. This is the only recurring work on your side — everything after it is automatic.",
  },
  {
    title: "Your people sign up free",
    you: "nothing",
    body: `They create an account on your page. No card, no course fee. They then fund a live trading account in their own name at ${BROKER.name} — nobody ever deposits with us.`,
  },
  {
    title: "Everything unlocks itself",
    you: "nothing",
    body: "The deposit is verified automatically, the academy opens, Telegram access is granted and their tier applies. You are not in the loop.",
  },
  {
    title: "You get paid, every month",
    you: "nothing",
    body: "Commission on every lot they trade — recurring, not a one-off, for as long as they keep trading. Tracked live in your dashboard.",
  },
];

const FAQ = [
  { q: "What does it cost me?", a: "Nothing. The website, the academy, the signals, the bot and the dashboard are free. You invest your reach and nothing else." },
  { q: "Do I need a licence or trading experience?", a: "No. You bring people together; the academy and the desk do the teaching and the calls. You are not giving investment advice." },
  { q: "Can other partners see my customers?", a: "No. Each brand is a separate component — its own page, its own broker link, its own Telegram channel and its own numbers." },
  { q: "How and when do I get paid?", a: "Per lot your customers trade, following the staircase above. Every amount is visible live in your dashboard as it accrues." },
  { q: "What happens if someone stops trading?", a: "You keep everything already earned. Commission is per lot traded, so it simply stops accruing for that customer — there is no clawback." },
];

function SectionHead({ n, kicker, title, lead }: { n: string; kicker: string; title: string; lead?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 border-b border-white/10 pb-3">
        <span className="font-mono text-[11px] tabular-nums text-primary">{n}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kicker}</span>
      </div>
      <h2 className="mt-5 max-w-3xl font-display text-2xl font-bold leading-tight tracking-tight sm:text-[2rem]">{title}</h2>
      {lead && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/70 sm:text-base">{lead}</p>}
    </div>
  );
}

function PartnerProgramm() {
  return (
    <div className="min-h-screen bg-[oklch(0.10_0.028_258)] font-sans text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
        <img src="/cosmos-logo.png" alt="Cosmos Candles" className="h-7 w-auto sm:h-8" />
        <a href={applyHref} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          Become a partner
        </a>
      </header>

      {/* Hero. The page used to open on flat black with a column of text and a
          large empty right half — correct information, no presence. Cosmo is the
          face of the product a partner would be putting their name on, so he
          belongs here, and the nebula treatment is lifted from the public landing
          so the two read as one product rather than two sites. He is mirrored on
          purpose: the artwork points right, which off the right-hand edge would
          lead the eye away from the copy. Flipped, he points at the headline. */}
      <section className="relative isolate overflow-hidden">
        <style>{`
          @keyframes ppTwinkle { 0%,100% { opacity:.15 } 50% { opacity:.75 } }
          @keyframes ppFloat  { 0%,100% { transform: scaleX(-1) translate3d(0,0,0) } 50% { transform: scaleX(-1) translate3d(0,-14px,0) } }
          .pp-twinkle { animation: ppTwinkle 4s ease-in-out infinite }
          .pp-cosmo   { animation: ppFloat 7s ease-in-out infinite; will-change: transform; backface-visibility: hidden; transform-style: preserve-3d }
          @media (prefers-reduced-motion: reduce) {
            .pp-twinkle { animation: none }
            .pp-cosmo { animation: none; transform: scaleX(-1) }
          }
        `}</style>

        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-48 left-[8%] h-[560px] w-[560px] rounded-full blur-[130px]"
               style={{ background: `color-mix(in oklch, ${BRAND.accent} 24%, transparent)` }} />
          <div className="absolute -top-24 right-[2%] h-[620px] w-[620px] rounded-full blur-[140px]"
               style={{ background: `color-mix(in oklch, ${BRAND.primary} 18%, transparent)` }} />
          {[["14%","20%"],["30%","64%"],["46%","30%"],["68%","72%"],["80%","22%"],["56%","50%"],["24%","86%"],["88%","58%"]].map(([t, l], i) => (
            <span key={i} className="pp-twinkle absolute h-1 w-1 rounded-full bg-white"
                  style={{ top: t, left: l, animationDelay: `${i * 0.55}s` }} />
          ))}
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-6 sm:px-8 sm:pb-14 sm:pt-10 lg:grid-cols-[1.25fr_1fr] lg:gap-4">
          <div>
            <h1 className="max-w-3xl font-display text-[2rem] font-bold leading-[1.05] tracking-tight sm:text-[3.4rem]">
              A complete trading academy —<br />
              <span className="text-primary">under your name, built for free.</span>
            </h1>
            <p className="mt-4 max-w-xl leading-relaxed text-foreground/70 sm:mt-5 sm:text-lg">
              You bring the audience. We build, run and maintain the whole product under your brand —
              and you earn on every lot your people trade.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href={applyHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5 sm:px-7 sm:py-3.5">
                Become a partner <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#earnings" className="inline-flex items-center gap-2 rounded-full border border-white/12 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/5 sm:px-7 sm:py-3.5">
                What would it pay?
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-5 sm:gap-x-12">
              {[["€0", "your cost"], ["$5–10", "per traded lot"], ["1 day", "to go live"]].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display text-2xl font-bold tabular-nums leading-none text-primary sm:text-3xl">{v}</div>
                  <div className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[300px] lg:block">
            <div aria-hidden className="absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]"
                 style={{ background: `color-mix(in oklch, ${BRAND.primary} 38%, transparent)` }} />
            {/* The drop-shadow lives on this static wrapper, NOT on the animated
                image. A filter attached to a moving element is re-rasterised every
                frame, which on a 344KB PNG dropped the float to a visible stutter. */}
            <div className="relative drop-shadow-[0_24px_50px_rgba(0,0,0,0.55)]">
              <img
                src="/cosmo/cosmo-point.png"
                alt="Cosmo, the Cosmos Candles mascot, pointing at the offer"
                width={464} height={974} decoding="async"
                className="pp-cosmo w-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 01 */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8 sm:pb-16">
        <SectionHead
          n="01" kicker="What you get" title="Everything is already built."
          lead="Not a referral link with a dashboard bolted on — the finished product, running under your brand from day one."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {GET.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition-colors hover:border-primary/25 hover:bg-white/[0.045] sm:p-6"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105">
                <f.icon className="h-[22px] w-[22px]" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <ProductShots />
        </div>
      </section>

      {/* 02 */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8 sm:pb-16">
        <SectionHead
          n="02" kicker="How it runs" title="Six steps. Three of them cost you minutes."
          lead="The column on the right is your own effort at each stage — that is the whole proposition, so it is worth being precise about it."
        />
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={`relative flex items-start gap-4 p-4 sm:gap-5 sm:p-5 ${i > 0 ? "border-t border-white/8" : ""}`}
            >
              {/* A widening bar down the left edge: the argument of this section is
                  that the work shifts off the partner after step three, and a row
                  of six identical lines showed none of that. */}
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full bg-primary/70"
                style={{ width: `${3 + i * 2}px`, opacity: 0.25 + i * 0.13 }}
              />
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-[11px] font-bold tabular-nums text-primary ring-1 ring-primary/20">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-bold sm:text-lg">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground/65">{s.body}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {s.you}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 03 */}
      <section id="earnings" className="mx-auto max-w-6xl px-4 pb-14 sm:px-8 sm:pb-16">
        <SectionHead
          n="03" kicker="What it pays" title="Three questions, one number."
          lead="You are paid per lot your customers trade, not per deposit — so what it is worth depends on your audience, not on ours."
        />
        <EarningsEstimator />

        <h3 className="mb-5 mt-10 font-display text-lg font-bold">Your rate climbs with your volume</h3>
        <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
          {COMMISSION_LADDER.map((l, i) => (
            <div key={l.level} className="rounded-2xl border border-white/10 bg-[oklch(0.12_0.03_258)] p-4 sm:p-5">
              {/* Each step literally stands taller than the last. Four equal boxes
                  described a staircase without ever showing one. */}
              <div
                aria-hidden
                className="mb-4 hidden rounded-t-md bg-gradient-to-t from-primary/20 to-primary sm:block"
                style={{ height: `${18 + i * 22}px` }}
              />
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Level {l.level}
              </div>
              <div className="mt-1.5 font-display text-3xl font-bold tabular-nums leading-none text-primary">
                {formatMoney(l.usdPerLot)}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">per lot</div>
              <div className="mt-3 border-t border-white/8 pt-2.5 font-mono text-[11px] tabular-nums text-foreground/60">
                {l.toVolume ? `${formatMoney(l.fromVolume, "€")} – ${formatMoney(l.toVolume, "€")}` : `${formatMoney(l.fromVolume, "€")} +`}
              </div>
              <div className="text-[11px] text-muted-foreground">customer volume</div>
            </div>
          ))}
        </div>
      </section>

      {/* 04 */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8 sm:pb-16">
        <SectionHead
          n="04" kicker="Why this is legitimate" title="Where the money actually comes from."
          lead="Worth reading before you put your name on it, because the answer is the reason this stays fair for the people you send."
        />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="border-t border-white/10 pt-4">
            <Wallet className="h-5 w-5 text-primary" />
            <h3 className="mt-2.5 font-display text-lg font-bold">The broker pays a commission on volume</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">
              We are an introducing broker: {BROKER.name} pays us a fixed amount per lot traded, and we
              share it with you. We do <span className="font-semibold text-foreground">not</span> make
              money by widening spreads, and your people are not charged a course fee. If we earned
              more by making their trading worse, the whole thing would collapse within a quarter —
              the incentive only works if they keep trading, which means it only works if they do well.
            </p>
          </div>
          <div className="border-t border-white/10 pt-4">
            <Gauge className="h-5 w-5 text-primary" />
            <h3 className="mt-2.5 font-display text-lg font-bold">Nobody deposits with us</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">
              Your members fund an account in their own name, at a licensed broker, and the money stays
              theirs — they can withdraw it whenever they like. We never touch client funds. Every
              click, customer, deposit and euro of commission is traceable in your dashboard.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {(BROKER_SWITCH.paused ? [] : BROKER.trust).map((t) => (
                <span key={t.label} className="text-[12px] text-muted-foreground">
                  <span aria-hidden className="mr-1.5 text-primary">{t.icon}</span>{t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-8 sm:pb-16">
        <SectionHead n="05" kicker="Questions" title="The ones everybody asks." />
        <div>
          {FAQ.map((f) => (
            <details key={f.q} className="group border-t border-white/10 py-4 last:border-b">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold marker:content-['']">
                {f.q}
                <span className="text-lg font-normal text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-foreground/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-24">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] to-transparent p-6 sm:p-12">
          <div className="grid items-center gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
            <div>
              <h2 className="font-display text-xl font-bold sm:text-3xl">Ready to start?</h2>
              <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-foreground/70 sm:text-base">
                Send your name and where your audience is — your page can be live the same day.
              </p>
            </div>
            <div className="lg:text-right">
              <a href={applyHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5 sm:px-8 sm:py-3.5">
                Become a partner <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Or directly: <a href={`mailto:${CONTACT}`} className="underline hover:text-foreground">{CONTACT}</a>
              </p>
            </div>
          </div>
        </div>

        {/* A name-drop, at name-drop size. Partners are one of many, so no single
            one gets to headline the programme's own page. */}
        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          Already running on this system:{" "}
          <a href="/zekoglobal" target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-foreground/80 hover:text-primary hover:underline">
            Zeko Global <ArrowUpRight className="h-3 w-3" />
          </a>
        </p>
      </section>

      <footer className="border-t border-white/8 px-4 py-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        Cosmos Candles · Powered by <Link to="/" className="underline hover:text-foreground">Cosmos Candles Academy</Link> · Trading involves risk — 74–89% of retail CFD accounts lose money. Earnings depend on customer activity and are not guaranteed.
      </footer>
    </div>
  );
}
