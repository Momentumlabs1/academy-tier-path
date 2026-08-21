import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, PH } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutz — Cosmos Candles" },
      { name: "description", content: "Datenschutzerklärung gemäß DSGVO." },
    ],
  }),
  component: Datenschutz,
});

function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung" updated="August 2026">
      <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-200/80">
        <PH>Firmenname</PH> und Kontaktdaten unten sind noch Platzhalter und durch die echten
        Unternehmensdaten zu ersetzen.
      </p>

      <div>
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
          <PH>Firmenname</PH>, <PH>Adresse</PH>, E-Mail <PH>kontakt@…</PH>.
        </p>
      </div>

      <div>
        <h2>2. Welche Daten wir verarbeiten</h2>
        <ul>
          <li><strong>Kontodaten:</strong> Wenn du ein kostenloses Konto anlegst — E-Mail-Adresse, Name (optional), Telegram-Handle (optional).</li>
          <li><strong>Fortschritt &amp; Aktivität:</strong> abgeschlossene Lektionen, Quiz-Ergebnisse, XP, Stufe.</li>
          <li><strong>Broker-/Einzahlungsdaten:</strong> Um deine Stufe freizuschalten, gleichen wir Daten unseres Partner-Brokers (E-Mail, Einzahlungssumme, Kontostand) mit deinem Konto ab.</li>
          <li><strong>Technische Daten:</strong> beim Aufruf anfallende Server-Logdaten (z. B. gekürzte IP, Zeitpunkt), sowie eine grobe Länderkennung zum Zeitpunkt eines Broker-Klicks.</li>
        </ul>
      </div>

      <div>
        <h2>3. Cookies</h2>
        <p>Wir setzen ausschließlich <strong>notwendige Cookies</strong> — kein Tracking, keine Werbung:</p>
        <ul>
          <li><strong>Login-/Sitzungs-Cookie:</strong> hält dich eingeloggt.</li>
          <li><strong>cosmo_ref:</strong> merkt sich für 30 Tage, über welchen Partner du gekommen bist, damit die Zuordnung stimmt.</li>
        </ul>
        <p>Deine Cookie-Auswahl aus dem Hinweis-Banner wird lokal in deinem Browser gespeichert.</p>
      </div>

      <div>
        <h2>4. Empfänger &amp; Auftragsverarbeiter</h2>
        <ul>
          <li><strong>Supabase</strong> (Hosting von Datenbank &amp; Authentifizierung).</li>
          <li><strong>Vercel</strong> (Hosting der Website).</li>
          <li><strong>Telegram</strong> (Kanäle, Bot-Kommunikation — nur wenn du sie nutzt).</li>
          <li><strong>Partner-Broker</strong> (zur Zuordnung und Prüfung deiner Einzahlung).</li>
        </ul>
        <p>Eine Weitergabe erfolgt nur, soweit sie für den beschriebenen Zweck erforderlich ist.</p>
      </div>

      <div>
        <h2>5. Rechtsgrundlagen</h2>
        <p>
          Verarbeitung zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO), zur Wahrung berechtigter
          Interessen (lit. f, z. B. sichere Bereitstellung und Partner-Zuordnung) sowie auf Grundlage
          deiner Einwilligung (lit. a), soweit erteilt.
        </p>
      </div>

      <div>
        <h2>6. Speicherdauer</h2>
        <p>
          Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke oder
          gesetzliche Aufbewahrungspflichten erforderlich ist. Danach werden sie gelöscht.
        </p>
      </div>

      <div>
        <h2>7. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit
          und Widerspruch. Wende dich dafür an <PH>kontakt@…</PH>. Außerdem kannst du dich bei der
          zuständigen Aufsichtsbehörde beschweren (in Österreich: Österreichische Datenschutzbehörde).
        </p>
      </div>

      <div>
        <h2>8. Risikohinweis</h2>
        <p>
          Trading mit gehebelten Produkten ist mit erheblichem Risiko verbunden; die Mehrheit der
          Privatkonten verliert Geld. Inhalte dieser Plattform sind Ausbildung und keine
          Anlageberatung.
        </p>
      </div>
    </LegalPage>
  );
}
