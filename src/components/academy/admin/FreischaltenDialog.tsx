/**
 * "Freischalten" im Admin-Bereich: eine E-Mail eingeben, Knopf druecken — die
 * Person bekommt Zugang zur Akademie (Konto wird bei Bedarf angelegt) und eine
 * Mail mit dem persoenlichen VIP-Gruppen-Link und dem Akademie-Zugang, bei dem
 * sie sich zuerst ein eigenes Passwort waehlt.
 *
 * Ansage Diego 18.09.: "wenn ich freischalten druecke, soll er eine E-Mail
 * bekommen mit Zugang zur Signalgruppe und zur Akademie, dass ich ihm das jetzt
 * nicht erklaeren muss."
 *
 * Die Arbeit macht die Edge Function `member-freischalten` (Service-Rolle,
 * prueft den Admin ueber das JWT). "Vorschau" ist ein Trockenlauf: zeigt, was
 * passieren wuerde, legt nichts an und schickt nichts.
 */
import { useState } from "react";
import { CheckCircle2, Loader2, Unlock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";

type Antwort = {
  ok?: boolean; dryRun?: boolean; error?: string; schritte?: string[];
  vipUrl?: string | null; mail?: { ok?: boolean; error?: string; subject?: string };
};

export function FreischaltenDialog({
  startEmail = "", onClose, onDone,
}: { startEmail?: string; onClose: () => void; onDone?: () => void }) {
  const [email, setEmail] = useState(startEmail);
  const [betrag, setBetrag] = useState("");
  const [busy, setBusy] = useState<null | "vorschau" | "los">(null);
  const [antwort, setAntwort] = useState<Antwort | null>(null);

  async function rufen(dryRun: boolean) {
    if (busy) return;
    setBusy(dryRun ? "vorschau" : "los");
    setAntwort(null);
    const { data } = await supabase.auth.getSession();
    const r = await fetch(functionUrl("member-freischalten"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ email, amount: betrag || 0, dryRun }),
    }).then((x) => x.json()).catch((e) => ({ error: String(e) }));
    setAntwort(r);
    setBusy(null);
    if (!dryRun && r?.ok) onDone?.();
  }

  const fertig = antwort && !antwort.dryRun && antwort.ok;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[oklch(0.13_0.03_258)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Freischalten</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Die Person bekommt eine Mail mit ihrem VIP-Gruppen-Link und dem Akademie-Zugang.
          Beim ersten Öffnen wählt sie sich ein eigenes Passwort, dann startet das Willkommen.
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">E-Mail</span>
          <input value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="name@example.com"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
            Stufe per Betrag (optional, € — leer = nur Zugang, Stufe kommt vom Broker)
          </span>
          <input value={betrag} onChange={(e) => setBetrag(e.target.value)} placeholder="z. B. 50000 = Elite (alles frei), 100 = Foundation"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
        </label>

        {antwort && (
          <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${antwort.error || (antwort.mail && !antwort.mail.ok && !antwort.dryRun) ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-white/10 bg-white/[0.03] text-foreground/80"}`}>
            {antwort.error && <div>Fehler: {antwort.error}</div>}
            {antwort.dryRun && <div className="mb-1 font-semibold">Vorschau — nichts angelegt, nichts gesendet:</div>}
            {fertig && <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Freigeschaltet, Mail ist raus.</div>}
            {antwort.schritte?.map((s) => <div key={s}>· {s}</div>)}
            {antwort.mail && !antwort.dryRun && !antwort.mail.ok && <div>Mail-Fehler: {antwort.mail.error}</div>}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={() => rufen(true)} disabled={!email || !!busy}
            className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            {busy === "vorschau" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Vorschau"}
          </button>
          <button onClick={() => rufen(false)} disabled={!email || !!busy || !!fertig}
            className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy === "los" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Unlock className="h-4 w-4" /> Freischalten & Mail senden</>}
          </button>
        </div>
      </div>
    </div>
  );
}
