/**
 * /partner-program — public affiliate-recruitment page.
 *
 * The link the founder sends to a PROSPECTIVE partner.
 *
 * Built around the journey, because that was the thing missing. Earlier versions
 * stated facts — free system, per-lot payout, staircase — without ever walking
 * the reader through what actually happens to them: what they hand over, what
 * they get, what their audience sees, when money starts moving. Facts without a
 * sequence leave someone with an audience unable to picture themselves in it, and
 * that is the only thing this page has to achieve.
 *
 * So: the six steps first, then a partner who is already live as proof, then the
 * product their audience lands in, then the arithmetic. The Zeko material sits in
 * the case-study section and nowhere else — it stars him and runs on his page, so
 * presenting it as a generic product film misstated whose video it is.
 *
 * Public. The partner LOGIN/dashboard lives at /partner; this is the pitch.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LivePartnerCase } from "@/components/academy/partner/LivePartnerCase";
import { ProductShots } from "@/components/academy/partner/ProductShots";
import { EarningsEstimator } from "@/components/academy/partner/EarningsEstimator";
import { COMMISSION_LADDER } from "@/lib/commission";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/partner-program")({
  head: () => ({
    meta: [
      { title: "Partner Program — Cosmos Candles" },
      { name: "description", content: "Get your own branded trading academy for free and earn on every lot your community trades. See a live partner page and work out your own numbers." },
    ],
  }),
  component: PartnerProgramm,
});

const CONTACT = "kontakt@momentumlabs.at";
const applyHref = `mailto:${CONTACT}?subject=${encodeURIComponent("Become a partner — Cosmos Candles")}`;

/**
 * The journey, in the order it happens to them.
 *
 * Second person throughout, and each step says who does the work — because the
 * whole proposition is that almost none of it is theirs. "You" appears on step
 * one and step six; everything between them is us.
 */
const JOURNEY = [
  {
    who: "You",
    title: "You bring an audience.",
    body: "A following, a group, a list. That is the entire investment — there is nothing to build and nothing to pay.",
  },
  {
    who: "We",
    title: "We set up your page.",
    body: "Your name, your character, your colours, on your own address. Usually live the same day you say yes.",
  },
  {
    who: "They",
    title: "Your people sign up — on your page.",
    body: "They join your brand, not ours. Free account, no card, no course fee. You keep the relationship.",
  },
  {
    who: "They",
    title: "They fund a live trading account.",
    body: "With our partner broker, in their own name. Nobody ever deposits with us — and this is the moment you start earning.",
  },
  {
    who: "It",
    title: "Everything unlocks by itself.",
    body: "The deposit is verified automatically, the academy opens, Telegram access is granted, tiers apply. No message from you required.",
  },
  {
    who: "You",
    title: "You get paid on every lot they trade.",
    body: "Recurring, not once. Every click, customer and euro is visible in your own dashboard — nobody else's.",
  },
];

const FAQ = [
  { q: "What does it cost me?", a: "Nothing. The system is free — you invest your reach." },
  { q: "Do I need a licence?", a: "No. You bring people together; you are not giving investment advice." },
  { q: "Can other partners see my customers?", a: "No. Each brand is its own component — separate page, separate broker link, separate numbers." },
  { q: "How do I get paid?", a: "Per lot your customers trade, following the ladder below. Live in your dashboard." },
  { q: "Why is this fair for my audience?", a: "We earn from the broker's per-lot commission, not from widened spreads." },
];

function SectionHead({ n, kicker, title, lead }: { n: string; kicker: string; title: string; lead?: string }) {
  return (
    <div className="mb-9">
      <div className="flex items-center gap-4 border-b border-white/10 pb-3">
        <span className="font-mono text-[11px] tabular-nums text-primary">{n}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kicker}</span>
      </div>
      <h2 className="mt-5 max-w-3xl font-display text-2xl font-bold leading-tight tracking-tight sm:text-[2rem]">{title}</h2>
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

      <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-8 sm:pt-14">
        <h1 className="max-w-4xl font-display text-[2.6rem] font-bold leading-[1.03] tracking-tight sm:text-6xl">
          Your own trading academy —<br />
          <span className="text-primary">built, branded and run for you.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-foreground/70">
          You bring the audience. We hand you the finished product under your own name,
          and you earn on every lot your people trade.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={applyHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5">
            Become a partner <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#live" className="inline-flex items-center gap-2 rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-white/5">
            See a live partner page
          </a>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-12 gap-y-5 border-t border-white/10 pt-6">
          {[["€0", "your cost"], ["$5–10", "per traded lot"], ["1 day", "to go live"]].map(([v, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-bold tabular-nums leading-none text-primary">{v}</div>
              <div className="mt-1.5 text-[12px] uppercase tracking-[0.12em] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 01 — the journey, which is what was missing */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <SectionHead
          n="01" kicker="How it works" title="Six steps, and five of them are ours."
        />
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map((s, i) => (
            <div key={s.title} className="border-t border-white/10 pt-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] tabular-nums text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.who}
                </span>
              </div>
              <h3 className="mt-2.5 font-display text-[17px] font-bold leading-snug">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 02 — proof: a partner already running */}
      <section id="live" className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <SectionHead
          n="02" kicker="A partner already live" title="This is what step two looks like."
          lead="Zeko Global runs on this system today. Everything you see is his — we only appear in the small line at the top of his page."
        />
        <LivePartnerCase />
      </section>

      {/* 03 — what the audience gets */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <SectionHead
          n="03" kicker="What unlocks" title="What your audience gets for free."
          lead="The part that keeps people around after the novelty of a signal wears off — and the reason they keep trading, which is the reason you keep earning."
        />
        <ProductShots />
      </section>

      {/* 04 — the number they decide on */}
      <section id="earnings" className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <SectionHead
          n="04" kicker="What you earn" title="Put your own numbers in."
          lead="You are paid per lot your customers trade, not per deposit. What that is worth depends on your audience — so every assumption below is yours to move."
        />
        <EarningsEstimator />
      </section>

      {/* 05 — the staircase */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <SectionHead n="05" kicker="The staircase" title="Your rate climbs with your volume." />
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

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        <SectionHead n="06" kicker="Questions" title="The ones everybody asks." />
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
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Want a page like Zeko's?</h2>
              <p className="mt-3 max-w-lg text-foreground/70">
                Send a short message with your name and where your audience is — yours can be live the same day.
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
