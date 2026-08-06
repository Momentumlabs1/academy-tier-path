/**
 * /partner-program — public affiliate-recruitment page.
 *
 * The link the founder sends to a PROSPECTIVE partner.
 *
 * Deliberately short. An earlier version argued the whole model in prose and
 * lost the reader before the first picture: someone with an audience is deciding
 * in seconds whether this is real, and paragraphs are the slowest way to answer
 * "what IS it". So the page shows the product — the pitch film and real frames
 * from real lessons — then hands over the one number they are actually deciding
 * on, and stops. Every remaining line of copy has to earn its place next to a
 * screenshot.
 *
 * Public. The partner LOGIN/dashboard lives at /partner; this is the pitch.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, GraduationCap, LayoutDashboard, Radio } from "lucide-react";
import { ProductShots } from "@/components/academy/partner/ProductShots";
import { EarningsEstimator } from "@/components/academy/partner/EarningsEstimator";
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

/** Four lines, not four paragraphs. The screenshots above them do the explaining. */
const GET = [
  { icon: LayoutDashboard, title: "Your own branded page", note: "your name, your colours" },
  { icon: Radio, title: "Live signals", note: "straight to a private channel" },
  { icon: GraduationCap, title: "The full academy", note: "12 lessons + orderflow tools" },
  { icon: Bot, title: "Automatic onboarding", note: "sign-up to unlock, hands off" },
];

const FAQ = [
  { q: "What does it cost me?", a: "Nothing. The system is free — you invest your reach." },
  { q: "Do I need a licence?", a: "No. You bring people together; you are not giving investment advice." },
  { q: "How do I get paid?", a: "Per lot your customers trade, following the ladder. Live in your dashboard." },
  { q: "Why is this fair for my audience?", a: "We earn from the broker's per-lot commission, not from widened spreads." },
];

function SectionHead({ n, kicker, title }: { n: string; kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 border-b border-white/10 pb-3">
        <span className="font-mono text-[11px] tabular-nums text-primary">{n}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kicker}</span>
      </div>
      <h2 className="mt-5 font-display text-2xl font-bold leading-tight tracking-tight sm:text-[2rem]">{title}</h2>
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

      {/* Hero — one claim, one sentence, the numbers inline. */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-8 sm:pt-14">
        <h1 className="max-w-4xl font-display text-[2.6rem] font-bold leading-[1.03] tracking-tight sm:text-6xl">
          Monetize your community —<br />
          <span className="text-primary">without building a product.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-foreground/70">
          You get the finished trading academy for free. You earn on every lot your people trade.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={applyHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5">
            Become a partner <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#earnings" className="inline-flex items-center gap-2 rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-white/5">
            What would I earn?
          </a>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-12 gap-y-5 border-t border-white/10 pt-6">
          {[["€0", "your cost"], ["$5–10", "per traded lot"], ["100%", "automated"]].map(([v, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-bold tabular-nums leading-none text-primary">{v}</div>
              <div className="mt-1.5 text-[12px] uppercase tracking-[0.12em] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 01 — the product, shown */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <SectionHead n="01" kicker="What it is" title="This is what your link opens." />
        <ProductShots />
        <div className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {GET.map((g) => (
            <div key={g.title} className="border-t border-white/10 pt-4">
              <g.icon className="h-5 w-5 text-primary" />
              <div className="mt-2.5 font-display text-[15px] font-bold">{g.title}</div>
              <div className="text-[13px] text-muted-foreground">{g.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 02 — the number they decide on */}
      <section id="earnings" className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <SectionHead n="02" kicker="What you earn" title="Put your own numbers in." />
        <EarningsEstimator />
      </section>

      {/* 03 — the staircase */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <SectionHead n="03" kicker="The staircase" title="Your rate climbs with your volume." />
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/8 sm:grid-cols-4">
          {COMMISSION_LADDER.map((l) => (
            <div key={l.level} className="bg-[oklch(0.12_0.03_258)] p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Level {l.level}</div>
              <div className="mt-3 font-display text-4xl font-bold tabular-nums leading-none text-primary">{formatMoney(l.usdPerLot)}</div>
              <div className="mt-1 text-[12px] text-muted-foreground">per lot</div>
              <div className="mt-4 border-t border-white/8 pt-3 font-mono text-[11px] tabular-nums text-foreground/60">
                {l.toVolume ? `${formatMoney(l.fromVolume, "€")} – ${formatMoney(l.toVolume, "€")}` : `${formatMoney(l.fromVolume, "€")} +`}
              </div>
              <div className="text-[11px] text-muted-foreground">customer volume</div>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-2xl text-sm text-foreground/60">
          Paid from the broker's per-lot commission — not from widening your audience's spreads.
          Everything is traceable in your own dashboard.
        </p>
      </section>

      {/* 04 — questions */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        <SectionHead n="04" kicker="Questions" title="The ones everybody asks." />
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

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] to-transparent p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Ready to become a partner?</h2>
              <p className="mt-3 max-w-lg text-foreground/70">
                Send a short message — your branded page can be live the same day.
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
