/**
 * /partner-programm — public affiliate-recruitment page.
 *
 * The link the founder sends to a PROSPECTIVE partner. It pitches the whole
 * model in a clear causal flow: not just a broker link but a complete white-label
 * system, how the payout staircase works, how the money is actually earned
 * (broker IB per lot — not by ripping customers off on spreads), how partners are
 * compensated, and how the whole tree works transparently. Professional, on-brand.
 *
 * Public. The partner LOGIN/dashboard lives at /partner; this is the pitch.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BadgeCheck, Bot, Check, Gauge, GraduationCap, LayoutDashboard,
  Radio, ShieldCheck, Sparkles, TrendingUp, Wallet,
} from "lucide-react";
import { COMMISSION_LADDER } from "@/lib/commission";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/partner-programm")({
  head: () => ({
    meta: [
      { title: "Partner-Programm — Cosmos Candles" },
      { name: "description", content: "Werde Partner: ein komplettes Trading-System gratis + transparente Vergütung pro gehandeltem Lot." },
    ],
  }),
  component: PartnerProgramm,
});

const CONTACT = "kontakt@momentumlabs.at";
const applyHref = `mailto:${CONTACT}?subject=${encodeURIComponent("Partner werden — Cosmos Candles")}`;

const WHAT_YOU_GET = [
  { icon: LayoutDashboard, title: "Fertige, gebrandete Seite", body: "Deine eigene Landingpage unter cosmos-candles.com/deinname — mit deinem Namen, Farben, deinem Auftritt. Du musst nichts bauen." },
  { icon: Radio, title: "Live-Telegram-Signale", body: "Deine Community bekommt echte Trade-Calls (Entry, Stop, Ziele) automatisch in einen privaten Kanal." },
  { icon: GraduationCap, title: "Komplette Trading-Academy", body: "Strukturierte Lektionen von den Grundlagen bis zum echten Orderflow-Edge — nicht nur ein Broker-Link." },
  { icon: Bot, title: "Auto-Onboarding & Bot", body: "Registrierung, Einzahlungs-Freischaltung und Telegram-Zugang laufen vollautomatisch. Kein manueller Aufwand." },
  { icon: LayoutDashboard, title: "Dein eigenes Dashboard", body: "Klicks, Kunden, Einzahlungen, Provision und dein aktuelles Level — alles in Echtzeit, nur für dich sichtbar." },
  { icon: Sparkles, title: "Kein eigenes Produkt nötig", body: "Du vermarktest ein fertiges System, das dich sonst Monate und tausende Euro kosten würde. Bio-Link rein, fertig." },
];

const FAQ = [
  { q: "Was kostet mich das?", a: "Nichts. Das komplette System (Website, Academy, Signale, Bot, Dashboard) bekommst du gratis. Du investierst nur deine Reichweite." },
  { q: "Brauche ich Erfahrung oder eine Lizenz?", a: "Nein. Du bringst Menschen zusammen — die Academy, die Signale und das System übernehmen den Rest. Du gibst keine Anlageberatung." },
  { q: "Wie werde ich bezahlt?", a: "Pro gehandeltem Lot deiner Kunden — transparent nach der Staffel unten. Du siehst jeden Betrag live in deinem Dashboard." },
  { q: "Warum ist das fair für die Kunden?", a: "Wir verdienen an der Broker-Provision pro Lot, nicht an überzogenen Spreads. Günstiger als die meisten — deine Kunden bleiben länger aktiv, davon profitieren alle." },
];

function PartnerProgramm() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.03_260)] font-sans text-foreground [background-image:radial-gradient(1100px_600px_at_100%_-5%,oklch(0.9_0.2_150/0.06),transparent_60%)]">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">C</span>
          <span className="font-display text-lg font-bold">Cosmos Candles</span>
        </div>
        <a href={applyHref} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">Partner werden</a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-12 text-center sm:px-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Partner-Programm
        </div>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Vergüte deine Community —<br /><span className="text-primary">ohne selbst ein Produkt zu bauen.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-foreground/70">
          Du bekommst ein komplettes, fertiges Trading-System gratis und wirst pro gehandeltem Lot vergütet — transparent, fair und günstiger als die meisten da draußen.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href={applyHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5">
            Partner werden <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#verdienst" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-7 py-3.5 text-sm font-semibold hover:bg-white/10">
            Wie du verdienst
          </a>
        </div>
      </section>

      {/* Der Unterschied */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-7 sm:p-10">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Der Unterschied</div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Nicht nur ein Broker — ein komplettes System.</h2>
          <p className="mt-4 max-w-3xl text-foreground/70">
            Die meisten Affiliate-Programme geben dir nur einen Broker-Link und lassen dich allein. Bei uns bekommt dein Publikum eine <span className="font-semibold text-foreground">ganze Academy</span> — Signale, Lektionen, Bot, Community — und <span className="font-semibold text-foreground">du</span> bekommst ein fertiges White-Label-System, das für dich läuft. Das macht dein Angebot stärker, deine Kunden bleiben länger, und du verdienst wiederkehrend.
          </p>
        </div>
      </section>

      {/* Was du bekommst */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">Was du als Partner bekommst</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHAT_YOU_GET.map((f) => (
            <div key={f.title} className="rounded-3xl border border-white/6 bg-white/[0.03] p-6">
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><f.icon className="h-5 w-5" /></span>
              <h3 className="font-display text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Wie du verdienst — Staffel */}
      <section id="verdienst" className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="mb-2 flex items-center justify-center gap-2 text-primary"><TrendingUp className="h-5 w-5" /></div>
        <h2 className="mb-2 text-center font-display text-2xl font-bold sm:text-3xl">Wie du verdienst</h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-foreground/70">
          Du wirst <span className="font-semibold text-foreground">pro gehandeltem Lot</span> deiner Kunden vergütet — nicht pro Einzahlung. Je mehr Volumen deine Community handelt, desto höher steigt dein Satz. Vollständig transparent, live in deinem Dashboard.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          {COMMISSION_LADDER.map((l, i) => (
            <div key={l.level} className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Level {l.level}</div>
              <div className="mt-2 font-display text-3xl font-bold text-primary">{l.usdPerLot} $</div>
              <div className="text-[11px] text-muted-foreground">pro Lot</div>
              <div className="mt-3 border-t border-white/8 pt-3 text-[11px] text-foreground/60">
                {l.toVolume ? `${formatMoney(l.fromVolume, "€")} – ${formatMoney(l.toVolume, "€")}` : `ab ${formatMoney(l.fromVolume, "€")}`}<br />Kundenvolumen
              </div>
              {i === COMMISSION_LADDER.length - 1 && (
                <span className="absolute right-2 top-2 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase text-primary">Top</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          Start niedrig, mit Volumen nach oben — so refinanziert sich das System und du steigst mit deinem Erfolg. Kein Deckel nach unten, klarer Aufstieg nach oben.
        </p>
      </section>

      {/* Transparenz: wie das Geld entsteht */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/6 bg-white/[0.03] p-7">
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><Wallet className="h-5 w-5" /></span>
            <h3 className="font-display text-lg font-bold">Wie das Geld entsteht</h3>
            <p className="mt-2 text-sm text-foreground/70">
              Wir verdienen an der <span className="font-semibold text-foreground">Broker-Provision pro gehandeltem Lot</span> (IB-Modell) — <span className="font-semibold text-foreground">nicht</span> daran, Kunden über überzogene Spreads abzuzocken. Faire, günstige Konditionen im Vergleich zu vielen anderen: Deine Kunden bleiben länger aktiv — und davon profitieren alle im Baum.
            </p>
          </div>
          <div className="rounded-3xl border border-white/6 bg-white/[0.03] p-7">
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><Gauge className="h-5 w-5" /></span>
            <h3 className="font-display text-lg font-bold">Wie wir arbeiten</h3>
            <p className="mt-2 text-sm text-foreground/70">
              Alles läuft zentral & sauber über deinen Baum: <span className="font-semibold text-foreground">Master → Partner → Kunden</span>. Jeder Klick, jeder Kunde, jede Einzahlung und deine Provision sind in deinem eigenen Dashboard nachvollziehbar. Keine versteckten Gebühren, keine Kursgebühren für deine Kunden.
            </p>
          </div>
        </div>
      </section>

      {/* Warum guter Deal */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-8">
        <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">Warum das für dich ein guter Deal ist</h2>
        <div className="mx-auto grid max-w-2xl gap-2.5">
          {[
            "Kein eigenes Produkt bauen — du vermarktest ein fertiges System.",
            "Keine Kosten, kein Risiko: das System bekommst du gratis.",
            "Wiederkehrende Vergütung pro Lot — nicht einmalig.",
            "Du steigst mit deinem Volumen (5 → 10 $/Lot).",
            "Dein Publikum bekommt echten Mehrwert (Academy + Signale), nicht nur einen Link.",
          ].map((p) => (
            <div key={p} className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm text-foreground/85">{p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">Häufige Fragen</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-white/6 bg-white/[0.03] px-5 py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold marker:content-['']">
                {f.q}
                <span className="ml-4 text-lg text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 flex items-start gap-2 text-sm text-foreground/70"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-8">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Bereit, Partner zu werden?</h2>
          <p className="mx-auto mt-3 max-w-md text-foreground/70">
            Schreib uns kurz — wir richten deine gebrandete Seite ein und du bist innerhalb von Minuten startklar.
          </p>
          <a href={applyHref} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5">
            Partner werden <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-[12px] text-muted-foreground">Oder direkt: <a href={`mailto:${CONTACT}`} className="underline hover:text-foreground">{CONTACT}</a></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/6 px-4 py-6 text-center text-[11px] text-muted-foreground">
        Cosmos Candles · Powered by <Link to="/" className="underline hover:text-foreground">Agent Trading Academy</Link> · Trading ist mit hohem Risiko verbunden. Einnahmen hängen von der Aktivität der Kunden ab und sind nicht garantiert.
      </footer>
    </div>
  );
}
