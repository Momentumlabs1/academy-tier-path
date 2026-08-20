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
 * What is deliberately NOT here: the per-lot rates and the broker's name. Both
 * live behind the application — see section 03.
 *
 * REBUILT 18.08.2026, because it read as one unbroken column of prose.
 *
 * Two things were wrong and they compounded each other. Every section carried a
 * lead paragraph ABOVE the content and every card carried two or three sentences
 * below its heading, so the page ran to roughly nine hundred words of body copy
 * for what is a six-point offer. And every section sat at the same width on the
 * same background behind the same ruled header, so nothing marked where one
 * ended and the next began — the eye had only the text to go on, and the text
 * never stopped.
 *
 * The fixes are deliberately blunt:
 *   · ONE LINE PER CLAIM. A card gets a heading and a single sentence. If a
 *     point needs a paragraph it is not a card, it is a section.
 *   · NO LEAD PARAGRAPHS. The section title carries the argument; anything that
 *     was explaining the title has been cut or folded into the items.
 *   · BANDS. Alternating full-width surfaces (`Band`) separate the sections, so
 *     the boundary is structural rather than typographic. That is what makes it
 *     scan as six components instead of one document.
 *
 * VISUAL PASS 20.08.2026: the rebuild fixed the structure but every component
 * still wore the same rounded-2xl border-white/8 shell, so the six sections
 * were separated without being distinguishable. Each component TYPE now has
 * its own form — exhibits vs points in the bento, a node-spine timeline for
 * the steps, a sealed tile for the rate, plaques for the assurances, opening
 * cards for the FAQ, and one lit gradient ring reserved for the form. The
 * copy is untouched; the WHY of each treatment sits next to it inline.
 *
 * Public. The partner LOGIN/dashboard lives at /partner; this is the pitch.
 */
import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowUpRight, Bot, Gauge, GraduationCap, LayoutDashboard, Lock, Radio, Send, Wallet,
} from "lucide-react";
import { SignalsPreview } from "@/components/academy/tenant/LandingPreviews";
import { PartnerApplyForm } from "@/components/academy/partner/PartnerApplyForm";
import { BRAND } from "@/lib/tenants";

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

/**
 * 01 — the six things a partner is handed.
 *
 * A bento rather than a six-up grid: the two cards that can be *shown* — the
 * branded page and the academy — are wide and carry the evidence inside the
 * claim they back, and the rest stay small because they are smaller points.
 *
 * One sentence each. These used to run to three, which is how six cards turned
 * into a page of prose.
 */
const GET = [
  {
    icon: LayoutDashboard,
    span: "md:col-span-2",
    title: "A website under your name",
    body: "Your page, your colours, your character — hosting and upkeep on us.",
    img: "/partner/partner-page-zeko.jpg",
    imgAlt: "A live partner landing page carrying the partner's own name, character and colours",
  },
  {
    icon: Radio,
    span: "md:col-span-1",
    title: "Live trade signals",
    body: "Every call from our desk, in a channel under your brand.",
    preview: "signals" as const,
  },
  {
    icon: GraduationCap,
    span: "md:col-span-2",
    title: "The full trading academy",
    body: "Twelve lessons, first candle to real orderflow — recorded on the live terminal.",
    img: "/partner/orderflow-lesson.jpg",
    imgAlt: "A lesson recorded on the live orderflow terminal showing volume profile and footprint data",
  },
  {
    icon: Bot,
    span: "md:col-span-1",
    title: "Onboarding without you",
    body: "Sign-up, deposit check and access, all automatic.",
  },
  {
    icon: Gauge,
    span: "md:col-span-1",
    title: "Your own dashboard",
    body: "Clicks, customers, volume and commission — live, and only yours.",
  },
  {
    icon: Send,
    span: "md:col-span-2",
    title: "A private community channel",
    body: "A Telegram group under your brand, where members stay accountable to each other.",
  },
];

/**
 * 02 — the sequence, with the partner's own effort called out honestly.
 *
 * The effort column IS the argument, so it is a chip on every row and the row
 * text is short enough that the chip is never the thing you read last.
 */
const STEPS = [
  { title: "You get in touch", you: "5 minutes", body: "Your name, your channel, roughly how big your audience is." },
  { title: "We build your page", you: "one call", body: "Your brand set up, reviewed once by you. Usually live the same day." },
  { title: "You share your link", you: "ongoing", body: "One link in your bio. The only recurring work on your side." },
  { title: "Your people sign up free", you: "nothing", body: "No card, no course fee. Their trading account stays theirs." },
  { title: "Everything unlocks itself", you: "nothing", body: "Deposit verified, academy opened, Telegram granted." },
  { title: "You get paid, every month", you: "nothing", body: "Per lot traded, for as long as they keep trading." },
];

const FAQ = [
  { q: "What does it cost me?", a: "Nothing. The website, the academy, the signals, the bot and the dashboard are free. You invest your reach and nothing else." },
  { q: "Do I need a licence or trading experience?", a: "No. You bring people together; the academy and the desk do the teaching and the calls. You are not giving investment advice." },
  { q: "Can other partners see my customers?", a: "No. Each brand is separate — its own page, its own link, its own Telegram channels and its own numbers." },
  { q: "How and when do I get paid?", a: "Per lot your customers trade, paid monthly. Every amount is visible live in your dashboard as it accrues." },
  { q: "What happens if someone stops trading?", a: "You keep everything already earned. Commission is per lot traded, so it simply stops accruing for that customer — there is no clawback." },
];

/**
 * A full-width surface change between sections.
 *
 * This is the load-bearing piece of the rebuild. Every section used to be an
 * identical `max-w-6xl` block on the same background, so the only boundary
 * between "what you get" and "how it runs" was a heading — and after four of
 * them the eye stops registering headings. Alternating the ground gives the page
 * an actual structure, and it means the section header no longer has to work as
 * a divider, which is why it lost its rule.
 */
function Band({ tone = "base", id, children }: { tone?: "base" | "raised"; id?: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className={
        "scroll-mt-8 px-4 py-16 sm:px-8 sm:py-24 " +
        (tone === "raised" ? "border-y border-white/[0.07] bg-white/[0.022]" : "")
      }
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

/**
 * Number, kicker, title — and nothing else.
 *
 * The `lead` paragraph this used to take was the single biggest source of text
 * on the page: six of them, each restating the title in three more lines.
 */
function SectionHead({ n, kicker, title }: { n: string; kicker: string; title: string }) {
  return (
    <div className="mb-10 sm:mb-12">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] font-bold tabular-nums text-primary">{n}</span>
        <span className="h-px w-6 bg-primary/40" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kicker}</span>
      </div>
      <h2 className="mt-4 max-w-3xl font-display text-[1.75rem] font-bold leading-[1.1] tracking-tight sm:text-[2.25rem]">
        {title}
      </h2>
    </div>
  );
}

function PartnerProgramm() {
  return (
    <div className="min-h-screen bg-[oklch(0.10_0.028_258)] font-sans text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
        <img src="/cosmos-logo.png" alt="Cosmos Candles" className="h-9 w-auto sm:h-10" />
        {/* Auf 375px nahm dieser Button fast die halbe Kopfzeile und drueckte das
            Logo an den Rand. Kuerzer und schmaler auf dem Handy, voll ab sm. */}
        <a href="#apply" className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-4 sm:text-sm">
          <span className="sm:hidden">Apply</span><span className="hidden sm:inline">Become a partner</span>
        </a>
      </header>

      {/* Hero. Cosmo is the face of the product a partner would be putting their
          name on, so he belongs here, and the nebula treatment is lifted from the
          public landing so the two read as one product rather than two sites. He
          is mirrored on purpose: the artwork points right, which off the
          right-hand edge would lead the eye away from the copy. Flipped, he
          points at the headline. */}
      <section className="relative isolate overflow-hidden">
        <style>{`
          @keyframes ppTwinkle { 0%,100% { opacity:.15 } 50% { opacity:.75 } }
          @keyframes ppFloat  { 0%,100% { transform: scaleX(-1) translate3d(0,0,0) } 50% { transform: scaleX(-1) translate3d(0,-14px,0) } }
          @keyframes ppSweep  { 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) } }
          .pp-twinkle { animation: ppTwinkle 4s ease-in-out infinite }
          .pp-cosmo   { animation: ppFloat 7s ease-in-out infinite; will-change: transform; backface-visibility: hidden; transform-style: preserve-3d }
          /* The light band that slides across the barred rate tile in 03. It says
             "there is something under here" without showing a single digit — a
             static stripe pattern alone read as a texture, not as a cover. */
          .pp-sweep   { animation: ppSweep 3.4s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) {
            .pp-twinkle { animation: none }
            .pp-cosmo { animation: none; transform: scaleX(-1) }
            .pp-sweep { animation: none; opacity: 0 }
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

        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-10 lg:grid-cols-[1.25fr_1fr] lg:gap-4">
          <div>
            <h1 className="max-w-3xl font-display text-[2rem] font-bold leading-[1.05] tracking-tight sm:text-[3.4rem]">
              A complete trading academy —<br />
              <span className="text-primary">under your name, built for free.</span>
            </h1>
            <p className="mt-4 max-w-lg leading-relaxed text-foreground/70 sm:mt-5 sm:text-lg">
              You bring the audience. We build and run the whole product under your brand — you earn on every lot your people trade.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#apply" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5 sm:px-7 sm:py-3.5">
                Become a partner <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#earnings" className="inline-flex items-center gap-2 rounded-full border border-white/12 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/5 sm:px-7 sm:py-3.5">
                What would it pay?
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-5 sm:gap-x-12">
              {/* "$5–10 per traded lot" used to stand here. It is the single
                  most valuable line on the page and it was the first thing any
                  visitor read — including the ones who never apply. The middle
                  stat now says what is true without pricing it. */}
              {[["€0", "your cost"], ["Per lot", "not per signup"], ["1 day", "to go live"]].map(([v, l]) => (
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
      <Band tone="raised">
        <SectionHead n="01" kicker="What you get" title="Everything is already built." />
        {/* Two card anatomies, not one. The cards that carry evidence (a
            screenshot, the live signals preview) keep the icon tile and the
            media panel — they are exhibits. The purely textual points drop the
            tile and put the icon on the title line instead: at six identical
            shells the grid read as "six equal claims", and the exhibits lost
            their weight. Now the eye sorts the grid before reading a word. */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {GET.map((f) => {
            const evidence = Boolean(f.img || f.preview);
            return evidence ? (
              <div
                key={f.title}
                className={`group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-colors hover:border-primary/30 ${f.span}`}
              >
                <div className="p-4 sm:p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105 sm:h-11 sm:w-11">
                    <f.icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold leading-snug">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/60">{f.body}</p>
                </div>

                {/* Evidence sits inside the claim it backs, cropped so the card keeps
                    its shape rather than being dictated by the screenshot's aspect.
                    Slightly dimmed at rest and lifted on hover — the reveal marks it
                    as a live thing to look at, not a decorative texture. */}
                {f.img && (
                  <div className="relative mt-auto h-36 overflow-hidden border-t border-white/10 sm:h-52">
                    <img
                      src={f.img} alt={f.imgAlt} loading="lazy"
                      className="h-full w-full object-cover object-left-top opacity-90 saturate-[0.92] transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-100 group-hover:saturate-100"
                    />
                    {/* The screenshot melts into the card instead of butting against
                        the border — one component, not a card with a photo stapled on. */}
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/35 to-transparent" />
                  </div>
                )}
                {f.preview === "signals" && (
                  <div className="mt-auto border-t border-white/10 p-4">
                    <SignalsPreview primary={BRAND.primary} />
                  </div>
                )}
              </div>
            ) : (
              <div
                key={f.title}
                className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 sm:p-6 ${f.span}`}
              >
                {/* A hairline of accent along the top edge instead of an icon tile:
                    enough identity to not look unfinished, little enough that the
                    evidence cards stay the loudest thing in the grid. */}
                <span aria-hidden className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-primary/45 to-transparent transition-opacity group-hover:from-primary/70" />
                <div className="flex items-center gap-2.5">
                  <f.icon className="h-[18px] w-[18px] shrink-0 text-primary" />
                  <h3 className="font-display text-lg font-bold leading-snug">{f.title}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-foreground/60">{f.body}</p>
              </div>
            );
          })}
        </div>
      </Band>

      {/* 02 */}
      <Band>
        <SectionHead n="02" kicker="How it runs" title="Six steps. Three of them cost you minutes." />
        {/* One shared box made this read as a table — six rows of data. A process
            is nodes on a line, so each step is now its own card hung off a spine
            of numbered nodes. The moment the partner's work ends (the "nothing"
            rows) the node fills solid and the card takes a faint primary wash:
            the sequence visibly changes hands halfway down, which is the whole
            pitch of this section. */}
        <ol className="space-y-2.5 sm:space-y-3">
          {STEPS.map((s, i) => {
            const auto = s.you === "nothing";
            const last = i === STEPS.length - 1;
            return (
              <li key={s.title} className="flex gap-3 sm:gap-4">
                <div className="relative flex w-8 flex-none justify-center">
                  <span
                    className={
                      "z-10 flex h-8 w-8 items-center justify-center rounded-full font-mono text-[11px] font-bold tabular-nums " +
                      (auto
                        ? "bg-primary text-primary-foreground"
                        : "bg-[oklch(0.13_0.03_258)] text-primary ring-1 ring-primary/25")
                    }
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* The connector runs through the gap to the next node — without
                      it the nodes are just badges and the timeline claim collapses. */}
                  {!last && (
                    <span aria-hidden className="absolute -bottom-3 top-8 w-px bg-gradient-to-b from-white/15 to-white/5" />
                  )}
                </div>
                <div
                  className={
                    "relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-xl border p-4 sm:gap-4 sm:p-5 " +
                    (auto ? "border-primary/20 bg-primary/[0.045]" : "border-white/8 bg-white/[0.03]")
                  }
                >
                  {/* A widening bar down the left edge: the argument of this section is
                      that the work shifts off the partner after step three, and a row
                      of six identical lines showed none of that. */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full bg-primary/70"
                    style={{ width: `${3 + i * 2}px`, opacity: 0.25 + i * 0.13 }}
                  />
                  <div className="ml-2 min-w-0 flex-1">
                    <h3 className="font-display text-base font-bold leading-snug sm:text-lg">{s.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground/60">{s.body}</p>
                  </div>
                  {/* "nothing" is the payoff of the whole section, so it stops looking
                      like the other chips the moment it becomes true. */}
                  <span
                    className={
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] " +
                      (auto
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "border border-white/10 text-muted-foreground")
                    }
                  >
                    {s.you}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </Band>

      {/* 03 */}
      <Band tone="raised" id="earnings">
        <SectionHead n="03" kicker="What it pays" title="Paid per lot, not per signup." />

        {/* The rate card and the estimator used to stand here in the open: four
            levels with the exact dollars per lot, and a calculator that turned
            an audience size into a monthly figure. That is our commercial
            position — the number a competitor would want, and the number a
            half-interested reader screenshots and shops around with. It is also
            the thing that makes the conversation worth having, so it is not
            deleted, it is moved behind the application. Same reason the broker
            is not named on this page. */}
        <div className="relative overflow-hidden rounded-[22px] border border-primary/25 bg-[linear-gradient(165deg,color-mix(in_oklch,var(--primary)_9%,transparent),transparent_62%)] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                <Lock className="h-3 w-3" /> After approval
              </span>
              <h3 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">
                The exact rates come with your approval.
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/70">
                A fixed amount per lot, the same at both brokers, paid every month your customers keep trading.
              </p>
              <a href="#apply" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5">
                Apply for access <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* The value, barred. This was four rising steps — a staircase for a
                tiered rate that no longer exists, and on a 375px screen the
                fourth column ran off the edge because the grid had no
                breakpoint. One tile says the same thing, honestly, at any
                width. */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
              {/* Corner brackets, like a document with a strip redacted. The tile
                  used to be a plain stripe block, which read as decoration; the
                  brackets and the lock make it read as something deliberately
                  withheld — which is exactly the message of this section. */}
              {[
                "left-2 top-2 border-l border-t",
                "right-2 top-2 border-r border-t",
                "bottom-2 left-2 border-b border-l",
                "bottom-2 right-2 border-b border-r",
              ].map((pos) => (
                <span key={pos} aria-hidden className={`absolute h-3 w-3 border-primary/40 ${pos}`} />
              ))}
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Your rate
              </div>
              <div className="relative mx-auto mt-3 flex h-12 w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-white/10"
                   style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.13) 0 6px, rgba(255,255,255,0.035) 6px 12px)" }}
                   aria-label="locked">
                <span aria-hidden className="pp-sweep absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <Lock aria-hidden className="relative h-4 w-4 text-foreground/70" />
              </div>
              <div className="mt-3 text-[12px] text-muted-foreground">per traded lot · visible after approval</div>
            </div>
          </div>
        </div>
      </Band>

      {/* 04 — two claims, one line each. This was two paragraphs of prose under a
          lead paragraph, which is a lot of reading to reach "we don't hold your
          members' money". */}
      <Band>
        <SectionHead n="04" kicker="Why this is legitimate" title="Where the money actually comes from." />
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            {
              icon: Wallet,
              title: "You earn on volume, not on signups",
              body: "A fixed amount per lot traded. Nobody pays a course fee, and we earn nothing extra when someone trades badly — it only works if they stay.",
            },
            {
              icon: Gauge,
              title: "The money is never ours to hold",
              body: "Your members' funds sit in accounts in their own name and can be withdrawn any time. We never touch them.",
            },
          ].map((c) => (
            /* These two are assurances, not features, so they must not look like
               strays from the 01 bento. A framed icon chip plus the same icon as
               an oversized watermark bleeding off the corner gives them a plaque
               character of their own — read once, believed, not scanned. */
            <div key={c.title} className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 sm:p-6">
              <c.icon aria-hidden className="absolute -bottom-7 -right-6 h-32 w-32 text-primary/[0.06]" strokeWidth={1} />
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <c.icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-3 font-display text-lg font-bold leading-snug">{c.title}</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-foreground/60">{c.body}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* 05 */}
      <Band tone="raised">
        <div className="mx-auto max-w-3xl">
          <SectionHead n="05" kicker="Questions" title="The ones everybody asks." />
          {/* Ruled rows made the FAQ look like the small print at the end of a
              contract. Each question is now its own closed card that visibly
              opens — accent border, filled plus-chip — so the open item is
              findable again after scrolling, and the component reads as an FAQ
              rather than as more prose. details/summary stays: it is keyboard-
              and screen-reader-correct for free, so only the skin changes. */}
          <div className="space-y-2.5">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] transition-colors open:border-primary/25 open:bg-white/[0.035]"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-xl p-4 text-sm font-semibold marker:content-[''] [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60 sm:p-5">
                  {f.q}
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-sm font-normal text-muted-foreground transition-all group-open:rotate-45 group-open:border-primary/30 group-open:bg-primary/15 group-open:text-primary"
                  >
                    +
                  </span>
                </summary>
                {/* The answer hangs off a short accent rule instead of floating in
                    the card — it visibly belongs to the question above it. */}
                <p className="mx-4 mb-4 border-l-2 border-primary/30 pl-3 text-sm leading-relaxed text-foreground/70 sm:mx-5 sm:mb-5">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Band>

      {/* 06 */}
      <Band id="apply">
        {/* `isolate` because the glow sits at negative z-index: without its own
            stacking context it would paint behind the page background and vanish. */}
        <div className="relative isolate mx-auto max-w-3xl">
          {/* A nebula glow returns behind the form — the same light the hero
              opened with. The page starts and ends on the same note, and the
              form reads as the destination everything above was pointing at. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-28 -z-10 h-[420px] w-[560px] max-w-[92vw] -translate-x-1/2 rounded-full blur-[120px]"
            style={{ background: `color-mix(in oklch, ${BRAND.primary} 15%, transparent)` }}
          />
          <SectionHead n="06" kicker="Apply" title="Tell us where to reach you." />
          {/* The form is the terminal component of the page, so it gets the one
              framing no other card has: a gradient ring, brightest at the top
              edge, falling to hairline. Everything else borders itself in
              white/8 — this is the door, and it is lit. */}
          <div
            className="rounded-[23px] p-px shadow-[0_30px_90px_-40px_rgba(0,0,0,0.8)]"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklch, var(--primary) 45%, transparent), rgba(255,255,255,0.10) 45%, rgba(255,255,255,0.05))",
            }}
          >
            <PartnerApplyForm />
          </div>

          {/* A name-drop, at name-drop size. Partners are one of many, so no single
              one gets to headline the programme's own page. */}
          <p className="mt-8 text-center text-[12px] text-muted-foreground">
            Already running on this system:{" "}
            <a href="/zekoglobal" target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-foreground/80 hover:text-primary hover:underline">
              Zeko Global <ArrowUpRight className="h-3 w-3" />
            </a>
            {" · "}
            Prefer email? <a href={applyHref} className="underline hover:text-foreground">{CONTACT}</a>
          </p>
        </div>
      </Band>

      <footer className="border-t border-white/8 px-4 py-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        Cosmos Candles · Powered by <Link to="/" className="underline hover:text-foreground">Cosmos Candles Academy</Link> · Trading involves risk — 74–89% of retail CFD accounts lose money. Earnings depend on customer activity and are not guaranteed.
      </footer>
    </div>
  );
}
