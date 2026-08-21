import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, PH } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum — Cosmos Candles" },
      { name: "description", content: "Anbieter und Kontakt." },
    ],
  }),
  component: Impressum,
});

/**
 * Minimal-Impressum bis zur LLC-Gründung: Anbieter + Kontakt, mehr nicht.
 * Firmenbuch/UID gibt es noch nicht — kommt mit der Firma dazu.
 */
function Impressum() {
  return (
    <LegalPage title="Impressum">
      <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-200/80">
        Vorläufige Fassung bis zur Unternehmensgründung. Die <PH>Klammern</PH> werden dann durch die
        Firmendaten ersetzt.
      </p>

      <div>
        <h2>Anbieter</h2>
        <p>
          <PH>Vor- und Nachname</PH><br />
          <PH>Adresse / c-o</PH><br />
          Unternehmen in Gründung
        </p>
      </div>

      <div>
        <h2>Kontakt</h2>
        <p>E-Mail: <PH>kontakt@…</PH></p>
      </div>

      <div>
        <h2>Wirtschaftlicher Hinweis</h2>
        <p>
          Cosmos Candles ist eine kostenlose Trading-Ausbildungsplattform. Wir sind Introducing
          Broker unserer Partner-Broker und werden von diesen vergütet, wenn ein Nutzer über unseren
          Link ein Konto eröffnet und handelt — für dich ohne Mehrkosten. Wir sind kein Broker und
          kein konzessioniertes Wertpapierunternehmen. Trading ist mit hohem Risiko verbunden; die
          Mehrheit der Privatkonten verliert Geld. Inhalte sind Ausbildung, keine Anlageberatung.
        </p>
      </div>
    </LegalPage>
  );
}
