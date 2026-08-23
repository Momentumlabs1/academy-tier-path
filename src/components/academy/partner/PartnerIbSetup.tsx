/**
 * PartnerIbSetup — the step that decides whether a partner ever gets paid.
 *
 * Commission is credited by IB ACCOUNT NUMBER: the broker reports volume under
 * an account, and `tenant_ib_accounts` says which brand that account belongs to.
 * That table has been empty since it was built, which means every partner has
 * been earning nothing regardless of what their dashboard showed. This is the
 * form that fills it.
 *
 * TWO THINGS IT DELIBERATELY DOES NOT DO.
 *
 * It does not write to tenant_ib_accounts. A partner who could write there
 * could enter someone ELSE's IB number and be credited with their volume, and
 * nothing afterwards could detect it — that table is the only record of who
 * owns what. So this writes a CLAIM, which pays nobody, and an admin confirms
 * it (see migration tenant_ib_claims).
 *
 * It does not pretend the account already exists. The partner has to open one
 * under the master's referral first, which is the whole point: an account
 * opened outside that link sits outside the tree and can never be credited, no
 * matter what number is typed here afterwards.
 */
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Clock, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** The master's own referral links — a partner registering through these lands under us. */
const SIGNUP = [
  { broker: "hero", name: "HeroFX",     url: "https://herofx.co/?partner_code=2248356" },
  { broker: "vt",   name: "VT Markets", url: "https://vtm.pro/la5-com/global/aAaRH40s" },
] as const;

interface Claim { id: string; broker: string; ib_account: string; status: string }

const db = () => supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { eq: (c: string, v: string) => Promise<{ data: Claim[] | null }> };
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    update: (v: Record<string, unknown>) => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> };
  };
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

export function PartnerIbSetup({ slug }: { slug: string }) {
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db().from("tenant_ib_claims").select("id, broker, ib_account, status")
      .eq("tenant_slug", slug)
      .then(({ data }) => setClaims(data ?? []));
  }, [slug]);

  async function submit(broker: string) {
    // Das Feld ist beim Korrigieren mit der bisherigen Nummer vorbelegt; wer
    // nichts tippt, hat sie trotzdem im Feld stehen. Nur `values` zu lesen
    // haette den Knopf dann ins Leere laufen lassen.
    const existing = (claims ?? []).find((c) => c.broker === broker && c.status !== "approved");
    const ib = (values[broker] ?? existing?.ib_account ?? "").trim();
    if (!ib) return;
    setBusy(broker); setError(null);
    const { data } = await db().auth.getUser();

    // Korrektur AENDERT die vorhandene ungepruefte Zeile, statt eine zweite
    // anzulegen — sonst laegen nach einem Tippfehler zwei Nummern im Admin, und
    // dort entscheidet ein Klick, wohin die Provision geht.
    //
    // Geaendert, nicht geloescht: auf tenant_ib_claims gibt es GAR KEINE
    // DELETE-Regel, ein Loeschen waere also wirkungslos durchgelaufen und die
    // Dublette waere trotzdem entstanden — dieselbe stille Sorte Fehler, die
    // hier gerade repariert wird. Eine UPDATE-Regel existiert dagegen und
    // erlaubt dem Inhaber genau das, solange der Status "pending" ist.
    const { error: e } = existing
      ? await db().from("tenant_ib_claims")
          .update({ ib_account: ib, submitted_by: data.user?.id })
          .eq("id", existing.id)
      : await db().from("tenant_ib_claims").insert({
          tenant_slug: slug, broker, ib_account: ib,
          status: "pending", submitted_by: data.user?.id,
        });
    setBusy(null);
    if (e) { setError(e.message); return; }
    setClaims((prev) => [
      ...(prev ?? []).filter((c) => !(c.broker === broker && c.status !== "approved")),
      { id: existing?.id ?? crypto.randomUUID(), broker, ib_account: ib, status: "pending" },
    ]);
    setValues((v) => ({ ...v, [broker]: "" }));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="font-display text-base font-bold">Get paid: connect your broker account</h3>
      </div>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
        Commission is credited by broker account number. Open your account through the link below —
        an account opened anywhere else sits outside the tree and can never be credited — then send
        us the account number. We confirm it, and from that moment your volume counts.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {SIGNUP.map((b) => {
          const claim = claims?.find((c) => c.broker === b.broker);
          return (
            <div key={b.broker} className="rounded-xl border border-white/10 bg-[color:var(--surface-2)]/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold">{b.name}</span>
                {claim && (
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    claim.status === "approved"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-400"
                      : "border-amber-300/25 bg-amber-300/10 text-amber-300",
                  )}>
                    {claim.status === "approved" ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {claim.status === "approved" ? "Confirmed" : "Being checked"}
                  </span>
                )}
              </div>

              <a
                href={b.url} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-[12px] font-semibold transition-colors hover:bg-white/5"
              >
                Open your {b.name} account <ArrowUpRight className="h-3.5 w-3.5" />
              </a>

              {/* Nur eine BESTAETIGTE Nummer ist endgueltig.
                  Vorher verschwanden Eingabefeld und Knopf, sobald irgendeine
                  Zeile existierte — auch eine noch ungepruefte. Wer sich beim
                  Abschicken vertippt hatte, sah ab da nur noch seine falsche
                  Nummer mit "Being checked" daneben und hatte keinen Weg mehr,
                  sie zu korrigieren. Da an dieser Nummer haengt, wohin die
                  Provision geht, ist das die teuerste Sackgasse im Portal.
                  Solange sie geprueft wird, darf sie also nachgereicht werden. */}
              {claim?.status === "approved" ? (
                <div className="mt-3 font-mono text-[13px] text-foreground/80">{claim.ib_account}</div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    value={values[b.broker] ?? claim?.ib_account ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [b.broker]: e.target.value }))}
                    placeholder="Your account number"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[oklch(0.11_0.03_258)] px-3 py-2 text-base outline-none focus:border-primary/50 sm:text-[13px]"
                  />
                  <button
                    onClick={() => submit(b.broker)}
                    disabled={busy === b.broker || !((values[b.broker] ?? claim?.ib_account ?? "").trim())}
                    className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-bold text-primary-foreground disabled:opacity-40"
                  >
                    {busy === b.broker ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : claim ? "Update" : "Send"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        We confirm the number by hand against the broker's records — it decides where money goes, so
        it is never taken on trust.
      </p>
    </div>
  );
}
