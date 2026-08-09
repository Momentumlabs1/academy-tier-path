/**
 * PartnerApplyForm — where "become a partner" actually leads now.
 *
 * It used to be a mailto: link. That is the worst available conversion point: on
 * a phone it often opens nothing, on desktop it launches whatever mail client the
 * machine has configured, and either way the reader is thrown out of the page into
 * an empty compose window and left to write the message themselves. Everyone who
 * gave up at that moment was invisible — no row, no trace, no way to know the
 * page was losing people right at the end.
 *
 * Six fields. Name, email and phone are required because they are what makes a
 * follow-up possible; channel, reach and niche are optional because they can be
 * asked on the call, and a longer form here costs more applications than the
 * extra detail is worth.
 *
 * The success state names a timeframe. "Thanks, we'll be in touch" with no bound
 * reads as a black hole to anyone who has ever filled in a partner form.
 */
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { functionUrl } from "@/integrations/supabase/functions-url";

const FN = functionUrl("partner-apply");

interface Field {
  key: "name" | "email" | "phone" | "channel" | "reach" | "niche" | "note";
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  textarea?: boolean;
}

const FIELDS: Field[] = [
  { key: "name", label: "Your name", placeholder: "", required: true },
  { key: "email", label: "Email", placeholder: "you@example.com", type: "email", required: true },
  { key: "phone", label: "Phone / WhatsApp", placeholder: "+43 …", type: "tel", required: true },
  { key: "channel", label: "Your main channel", placeholder: "@handle or link" },
  { key: "reach", label: "Monthly views", placeholder: "e.g. 250,000" },
  { key: "niche", label: "What you post about", placeholder: "trading, business, crypto…" },
  { key: "note", label: "Anything else?", placeholder: "Optional", wide: true, textarea: true },
];

type Values = Partial<Record<Field["key"], string>>;

export function PartnerApplyForm() {
  const [v, setV] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...v,
          source: typeof window !== "undefined" ? window.location.pathname : "partner-program",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(String(data.error ?? "Something went wrong. Please try again.")); return; }
      setDone(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-8 text-center sm:p-12">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-4 font-display text-xl font-bold sm:text-2xl">Got it — thanks.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/70">
          We read every application ourselves and come back within one working day, usually the
          same day. If your setup fits, your branded page can be live right after that call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.wide ? "sm:col-span-2" : ""}`}>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {f.label}
              {f.required && <span className="ml-1 text-primary">*</span>}
            </span>
            {f.textarea ? (
              <textarea
                rows={3}
                value={v[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
                className="w-full resize-y rounded-xl border border-white/10 bg-[oklch(0.11_0.03_258)] px-4 py-3 text-base outline-none transition-colors focus:border-primary/50 sm:text-sm"
              />
            ) : (
              <input
                type={f.type ?? "text"}
                required={f.required}
                value={v[f.key] ?? ""}
                placeholder={f.placeholder}
                autoComplete={f.key === "email" ? "email" : f.key === "phone" ? "tel" : f.key === "name" ? "name" : "off"}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
                /* 16px on phones: anything smaller makes iOS Safari zoom the page
                   on focus, which on a form is a real drop-off. */
                className="w-full rounded-xl border border-white/10 bg-[oklch(0.11_0.03_258)] px-4 py-3 text-base outline-none transition-colors focus:border-primary/50 sm:text-sm"
              />
            )}
          </label>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Send application
        </button>
        <span className="text-[12px] text-muted-foreground">
          We reply within one working day. No obligation.
        </span>
      </div>
    </form>
  );
}
