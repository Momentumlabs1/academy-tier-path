/**
 * /partner-program — public affiliate-recruitment page.
 *
 * The link the founder sends to a PROSPECTIVE partner. It pitches the whole
 * model in a clear causal flow: not just a broker link but a complete white-label
 * system, how the payout staircase works, how the money is actually earned
 * (broker IB per lot — not by ripping customers off on spreads), how partners are
 * compensated, and how the whole tree works transparently.
 *
 * Laid out as a spec sheet rather than a stack of feature cards. The previous
 * version put every section in the same centred, rounded, faintly-tinted box, so
 * the eye had nowhere to land and a page full of real substance read as a
 * template. Here each section is numbered against a hairline rule, the narrative
 * runs left-aligned at a readable measure, and the things a partner is actually
 * weighing — the product, the arithmetic, the staircase — get the visual weight
 * instead of the decoration.
 *
 * Public. The partner LOGIN/dashboard lives at /partner; this is the pitch.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BadgeCheck, Bot, Check, GraduationCap, LayoutDashboard,
  Radio, Sparkles,
} from "lucide-react";
import {
  SignalsPreview, BotPreview, AcademyPreview, WhitelabelPreview,
} from "@/components/academy/tenant/LandingPreviews";
import { EarningsEstimator } from "@/components/academy/partner/EarningsEstimator";
import { BRAND } from "@/lib/tenants";
import { COMMISSION_LADDER } from "@/lib/commission";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/partner-program")({
  head: () => ({
    meta: [
      { title: "Partner Program — Cosmos Candles" },
      { name: "description", content: "Become a partner: a complete trading system for free + transparent commission per traded lot." },
    ],
  }),
  component: PartnerProgramm,
});

const CONTACT = "kontakt@momentumlabs.at";
const applyHref = `mailto:${CONTACT}?subject=${encodeURIComponent("Become a partner — Cosmos Candles")}`;

/** The three facts that decide whether the rest of the page is worth reading. */
const AT_A_GLANCE = [
  { value: "€0", label: "Your cost", note: "system, page, hosting" },
  { value: "$5–10", label: "Per traded lot", note: "climbs with volume" },
  { value: "100%", label: "Automated", note: "sign-up to unlock" },
];

const WHAT_YOU_GET = [
  { icon: LayoutDashboard, title: "Ready-made, branded page", body: "Your own landing page at cosmos-candles.com/yourname — with your name, colors, your look. Nothing to build." },
  { icon: Radio, title: "Live Telegram signals", body: "Your community gets real trade calls (entry, stop, targets) delivered automatically to a private channel." },
  { icon: GraduationCap, title: "Complete trading academy", body: "Structured lessons from the basics to a real orderflow edge — not just a broker link." },
  { icon: Bot, title: "Auto-onboarding & bot", body: "Sign-up, deposit unlock, and Telegram access run fully automatically. Zero manual work." },
  { icon: LayoutDashboard, title: "Your own dashboard", body: "Clicks, customers, deposits, commission, and your current level — all in real time, visible only to you." },
  { icon: Sparkles, title: "No product of your own needed", body: "You promote a finished system that would otherwise cost you months and thousands of euros. Drop it in your bio link — done." },
];

/**
 * The product, shown rather than claimed.
 *
 * Everything above this point is a promise in words. A prospective partner is
 * being asked to put their own audience behind this, so the one thing they
 * actually need is to see what that audience lands in.
 *
 * These are the live product surfaces, the same components the public landing
 * uses. Not screenshots: a screenshot goes stale the day the UI moves, and this
 * is the page that must never look out of date. Captions are written from the
 * PARTNER's side of the deal — the reader is not a customer.
 */
const SHOWCASE = [
  {
    title: "Your own branded page",
    body: "Your name, your colours, your mascot — on your own address. Your audience never sees ours. Nothing to design, nothing to host.",
    render: () => <WhitelabelPreview primary={BRAND.primary} />,
  },
  {
    title: "Signals your audience can copy",
    body: "Every call from the desk — entry, stop, targets — lands in a private channel in seconds. Nothing to interpret, nothing for you to write.",
    render: () => <SignalsPreview primary={BRAND.primary} />,
  },
  {
    title: "A real academy behind it",
    body: "Twelve structured lessons from the first candle to actual orderflow. This is what keeps people around after the novelty of a signal wears off.",
    render: () => <AcademyPreview primary={BRAND.primary} accent={BRAND.accent} />,
  },
  {
    title: "The onboarding runs itself",
    body: "Sign-up, deposit check, Telegram access, tier unlock — all automatic. You bring reach; you do not answer support tickets at midnight.",
    render: () => <BotPreview primary={BRAND.primary} />,
  },
];

const WHY = [
  "No product to build — you promote a finished system.",
  "No costs, no risk: you get the system for free.",
  "Recurring commission per lot — not a one-off.",
  "You level up with your volume ($5 → $10 per lot).",
  "Your audience gets real value (academy + signals), not just a link.",
];

const FAQ = [
  { q: "What does it cost me?", a: "Nothing. You get the complete system (website, academy, signals, bot, dashboard) for free. All you invest is your reach." },
  { q: "Do I need experience or a license?", a: "No. You bring people together — the academy, the signals, and the system handle the rest. You're not giving investment advice." },
  { q: "How do I get paid?", a: "Per lot your customers trade — transparently, following the ladder. You see every amount live in your dashboard." },
  { q: "Why is this fair for customers?", a: "We earn from the broker commission per lot, not from inflated spreads. Cheaper than most — your customers stay active longer, and everyone benefits." },
];

/**
 * Numbered section head against a hairline rule.
 *
 * This is what replaced the centred heading + centred paragraph that opened
 * every old section. Numbering them turns a list of claims into a document with
 * an argument, and the rule gives the eye the horizontal anchor that a stack of
 * rounded boxes never provided.
 */
function SectionHead({ n, kicker, title, lead }: { n: string; kicker: string; title: string; lead?: string }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-4 border-b border-white/10 pb-3">
        <span className="font-mono text-[11px] tabular-nums text-primary">{n}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kicker}</span>
      </div>
      <h2 className="mt-6 max-w-3xl font-display text-2xl font-bold leading-tight tracking-tight sm:text-[2rem]">{title}</h2>
      {lead && <p className="mt-3 max-w-2xl text-foreground/70">{lead}</p>}
    </div>
  );
}

function PartnerProgramm() {
  return (
    <div className="min-h-screen bg-[oklch(0.10_0.028_258)] font-sans text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <img src="/cosmos-logo.png" alt="Cosmos Candles" className="h-8 w-auto" />
        <a href={applyHref} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          Become a partner
        </a>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────
          Asymmetric on purpose. A centred hero gives a reader nothing to scan
          down; here the argument sits left at a readable measure and the three
          numbers that qualify the offer sit right, where they are read as a
          fact panel rather than as marketing. */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-8 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Partner program
            </div>
            <h1 className="font-display text-[2.6rem] font-bold leading-[1.03] tracking-tight sm:text-6xl">
              Monetize your community —<br />
              <span className="text-primary">without building a product.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/70">
              You get a complete, ready-made trading system for free and earn per lot traded —
              transparent, fair, and cheaper for your audience than most of what is out there.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href={applyHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5">
                Become a partner <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#earnings" className="inline-flex items-center gap-2 rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-white/5">
                Work out what you'd earn
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
            {AT_A_GLANCE.map((s, i) => (
              <div key={s.label} className={`px-7 py-6 ${i > 0 ? "border-t border-white/8" : ""}`}>
                <div className="font-display text-4xl font-bold tabular-nums leading-none text-primary">{s.value}</div>
                <div className="mt-2 text-sm font-semibold">{s.label}</div>
                <div className="text-[12px] text-muted-foreground">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 01 The difference ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <SectionHead n="01" kicker="The difference" title="Not just a broker link — a complete system." />
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <p className="text-lg leading-relaxed text-foreground/70">
            Most affiliate programs hand you a broker link and leave you on your own. With us, your
            audience gets a <span className="font-semibold text-foreground">full academy</span> —
            signals, lessons, bot, community — and <span className="font-semibold text-foreground">you</span> get
            a ready-made white-label system that runs for you.
          </p>
          <p className="text-lg leading-relaxed text-foreground/70">
            That makes your offer stronger, your customers stay around longer, and your income
            recurs instead of arriving once. The difference shows up in month three, not week one.
          </p>
        </div>
      </section>

      {/* ── 02 What you get ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <SectionHead n="02" kicker="What you get" title="Everything is already built." />
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {WHAT_YOU_GET.map((f) => (
            <div key={f.title} className="border-t border-white/10 pt-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-display text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 03 See it ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <SectionHead
          n="03" kicker="See it" title="This is what your audience gets."
          lead="Not a mock-up of something we plan to build — the system is live today, and it is the same one running behind every partner brand."
        />
        <div className="space-y-14">
          {SHOWCASE.map((s, i) => (
            <div key={s.title} className="grid items-center gap-8 lg:grid-cols-2">
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>{s.render()}</div>
              <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                <h3 className="font-display text-xl font-bold sm:text-2xl">{s.title}</h3>
                <p className="mt-3 max-w-md text-foreground/70">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 04 What you earn — the centrepiece ──────────────────────────── */}
      <section id="earnings" className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <SectionHead
          n="04" kicker="What you earn" title="Put your own numbers in."
          lead="You are paid per lot your customers trade, not per deposit. What that is worth depends entirely on your audience — so rather than quote you a figure, here is the arithmetic with every assumption left in your hands."
        />
        <EarningsEstimator />
      </section>

      {/* ── 05 The staircase ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <SectionHead
          n="05" kicker="The staircase" title="Your rate climbs with your volume."
          lead="Start at the bottom and rise with the total volume booked under you. There is no cap at the top and no clawback at the bottom."
        />
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/8 sm:grid-cols-4">
          {COMMISSION_LADDER.map((l) => (
            <div key={l.level} className="bg-[oklch(0.12_0.03_258)] p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Level {l.level}
              </div>
              <div className="mt-3 font-display text-4xl font-bold tabular-nums leading-none text-primary">
                {formatMoney(l.usdPerLot)}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">per lot</div>
              <div className="mt-4 border-t border-white/8 pt-3 font-mono text-[11px] tabular-nums text-foreground/60">
                {l.toVolume
                  ? `${formatMoney(l.fromVolume, "€")} – ${formatMoney(l.toVolume, "€")}`
                  : `${formatMoney(l.fromVolume, "€")} +`}
              </div>
              <div className="text-[11px] text-muted-foreground">customer volume</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 06 Where the money comes from ───────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <SectionHead
          n="06" kicker="Transparency" title="Where the money actually comes from."
          lead="Worth reading before you put your name on it — because the answer is the reason this stays fair for the people you send."
        />
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="border-t border-white/10 pt-5">
            <h3 className="font-display text-lg font-bold">The broker pays per traded lot</h3>
            <p className="mt-2.5 leading-relaxed text-foreground/70">
              We earn an introducing-broker commission on volume — <span className="font-semibold text-foreground">not</span> by
              widening spreads. Your customers get low-cost conditions, which is precisely why they
              keep trading; if we made money by making their trading worse, the whole tree would dry up.
            </p>
          </div>
          <div className="border-t border-white/10 pt-5">
            <h3 className="font-display text-lg font-bold">Everything is traceable</h3>
            <p className="mt-2.5 leading-relaxed text-foreground/70">
              The chain runs <span className="font-semibold text-foreground">master → partner → customers</span>.
              Every click, customer, deposit and commission shows up in your own dashboard in real
              time. No hidden fees, and no course fees charged to your audience.
            </p>
          </div>
        </div>
        <div className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {WHY.map((p) => (
            <div key={p} className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-foreground/80">{p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-8">
        <SectionHead n="07" kicker="Questions" title="The ones everybody asks." />
        <div>
          {FAQ.map((f) => (
            <details key={f.q} className="group border-t border-white/10 py-4 last:border-b">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold marker:content-['']">
                {f.q}
                <span className="text-lg font-normal text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-foreground/70">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] to-transparent p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Ready to become a partner?</h2>
              <p className="mt-3 max-w-lg text-foreground/70">
                Send a short message and we'll set up your branded page — you can be live the same day.
              </p>
            </div>
            <div className="lg:text-right">
              <a href={applyHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5">
                Become a partner <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Or directly: <a href={`mailto:${CONTACT}`} className="underline hover:text-foreground">{CONTACT}</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 px-4 py-7 text-center text-[11px] leading-relaxed text-muted-foreground">
        Cosmos Candles · Powered by <Link to="/" className="underline hover:text-foreground">Cosmos Candles Academy</Link> · Trading involves risk — 74–89% of retail CFD accounts lose money. Earnings depend on customer activity and are not guaranteed.
      </footer>
    </div>
  );
}
