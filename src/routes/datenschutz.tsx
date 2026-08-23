import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, PH } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Privacy — Cosmos Candles" },
      { name: "description", content: "Privacy policy (GDPR)." },
    ],
  }),
  component: Datenschutz,
});

/**
 * ENGLISCH, wie der Rest des Produkts. Die erste Fassung war deutsch — ein
 * franzoesischer Partner bekam eine Datenschutzerklaerung, die er nicht lesen
 * konnte, und eine Erklaerung, die niemand versteht, erfuellt ihren Zweck nicht.
 * Die Route heisst weiter /datenschutz, weil sie schon verlinkt ist.
 */
function Datenschutz() {
  return (
    <LegalPage title="Privacy policy" updated="August 2026">
      <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-200/80">
        <PH>Company name</PH> and the contact details below are still placeholders and will be
        replaced with the registered company data.
      </p>

      <div>
        <h2>1. Who is responsible</h2>
        <p>
          Responsible for data processing on this site:<br />
          <PH>Company name</PH>, <PH>Address</PH>, email <PH>kontakt@…</PH>.
        </p>
      </div>

      <div>
        <h2>2. What we process</h2>
        <ul>
          <li><strong>Account data:</strong> when you create a free account — email address, name (optional), Telegram handle (optional).</li>
          <li><strong>Progress &amp; activity:</strong> lessons completed, quiz results, XP, level.</li>
          <li><strong>Broker / deposit data:</strong> to unlock your level we match data from our partner broker (email, deposit total, balance) against your account.</li>
          <li><strong>Technical data:</strong> server log data from page requests (e.g. shortened IP, timestamp), and a rough country code at the moment you click through to a broker.</li>
        </ul>
      </div>

      <div>
        <h2>3. Cookies</h2>
        <p>We use <strong>necessary cookies only</strong> — no tracking, no advertising:</p>
        <ul>
          <li><strong>Login / session cookie:</strong> keeps you signed in.</li>
          <li><strong>cosmo_ref:</strong> remembers for 30 days which partner you came through, so the attribution is correct.</li>
        </ul>
        <p>Your choice from the cookie banner is stored locally in your browser.</p>
      </div>

      <div>
        <h2>4. Who else sees data</h2>
        <ul>
          <li><strong>Supabase</strong> — hosting for the database and authentication.</li>
          <li><strong>Vercel</strong> — hosting for the website.</li>
          <li><strong>Telegram</strong> — channels and bot messages, only if you use them.</li>
          <li><strong>Partner broker</strong> — to match and verify your deposit.</li>
        </ul>
        <p>Data is shared only as far as it is needed for the purpose described.</p>
      </div>

      <div>
        <h2>5. Legal basis</h2>
        <p>
          Processing to perform a contract (Art. 6(1)(b) GDPR), to pursue legitimate interests
          (Art. 6(1)(f), e.g. secure operation and partner attribution), and on the basis of your
          consent (Art. 6(1)(a)) where given.
        </p>
      </div>

      <div>
        <h2>6. How long we keep it</h2>
        <p>
          We keep personal data only as long as it is needed for the purposes above or required by
          law. After that it is deleted.
        </p>
      </div>

      <div>
        <h2>7. Your rights</h2>
        <p>
          You have the right to access, rectification, erasure, restriction, data portability and
          objection. Write to <PH>kontakt@…</PH>. You can also complain to your supervisory
          authority (in Austria: the Austrian Data Protection Authority).
        </p>
      </div>

      <div>
        <h2>8. Risk warning</h2>
        <p>
          Trading leveraged products carries substantial risk; most retail accounts lose money.
          Everything on this platform is education, not investment advice.
        </p>
      </div>
    </LegalPage>
  );
}
