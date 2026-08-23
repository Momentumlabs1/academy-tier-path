import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, PH } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Legal notice — Cosmos Candles" },
      { name: "description", content: "Provider and contact details." },
    ],
  }),
  component: Impressum,
});

/**
 * Minimal-Impressum bis zur Firmengruendung: Anbieter + Kontakt, mehr nicht.
 * Firmenbuch/UID gibt es noch nicht — kommt mit der Firma dazu.
 *
 * ENGLISCH, wie der Rest des Produkts. Die erste Fassung war deutsch, und ein
 * franzoesischer Partner bekam eine Seite, die er nicht lesen konnte. Die Route
 * heisst weiter /impressum, weil sie schon verlinkt ist; sichtbar ist Englisch.
 */
function Impressum() {
  return (
    <LegalPage title="Legal notice">
      <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-200/80">
        Provisional until the company is registered. The <PH>bracketed</PH> details will be replaced
        with the company data.
      </p>

      <div>
        <h2>Provider</h2>
        <p>
          <PH>First and last name</PH><br />
          <PH>Address / c-o</PH><br />
          Company in formation
        </p>
      </div>

      <div>
        <h2>Contact</h2>
        <p>Email: <PH>kontakt@…</PH></p>
      </div>

      <div>
        <h2>How we make money</h2>
        <p>
          Cosmos Candles is a free trading education platform. We are an introducing broker for our
          partner brokers and are paid by them when someone opens an account through our link and
          trades — at no extra cost to you. We are not a broker and not a licensed investment firm.
          Trading carries high risk; most retail accounts lose money. Everything here is education,
          not investment advice.
        </p>
      </div>
    </LegalPage>
  );
}
