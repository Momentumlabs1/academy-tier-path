/**
 * LegalPage — gemeinsames Gerüst für Impressum, Datenschutz und AGB.
 *
 * Eine ruhige, lesbare Seite im Dunkel-Stil der Marke: schmale Spalte, klare
 * Überschriften, zurück zur Startseite. Die drei Rechtsseiten teilen sich das
 * Layout, damit sie gleich aussehen und an einer Stelle gepflegt werden.
 *
 * PLATZHALTER: Firmenname, Adresse, Firmenbuch-/UID-Nummer stehen als [ … ] und
 * müssen von echten Daten ersetzt werden. Bewusst nicht erfunden — falsche
 * Rechtsangaben wären schlimmer als sichtbare Lücken.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070e] text-white">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
          <img src="/cosmos-logo.png" alt="Cosmos Candles Academy" className="h-7 w-auto opacity-80" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        {updated && <p className="mt-2 text-xs text-white/40">Stand: {updated}</p>}
        <div className="legal-prose mt-8 space-y-6 text-[15px] leading-relaxed text-white/75">
          {children}
        </div>
      </main>

      <style>{`
        .legal-prose h2 { font-size: 1.1rem; font-weight: 700; color: #fff; margin-top: 1.5rem; }
        .legal-prose h3 { font-weight: 600; color: rgba(255,255,255,.9); }
        .legal-prose a { text-decoration: underline; text-underline-offset: 2px; }
        .legal-prose a:hover { color: #fff; }
        .legal-prose ul { list-style: disc; padding-left: 1.25rem; }
        .legal-prose strong { color: rgba(255,255,255,.92); }
        .legal-prose .ph { color: #ffd479; background: rgba(255,212,121,.08); padding: 0 .25rem; border-radius: .25rem; }
      `}</style>
    </div>
  );
}

/** Sichtbarer Platzhalter für noch fehlende Firmendaten. */
export function PH({ children }: { children: ReactNode }) {
  return <span className="ph">[{children}]</span>;
}
