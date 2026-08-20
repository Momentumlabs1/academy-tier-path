/**
 * PartnerApplyForm — the gate. Everything worth knowing about the partnership
 * is on the other side of it.
 *
 * It used to be a mailto: link, then a single card with seven fields. Both had
 * the same problem in different clothes: one long ask, answered before anyone
 * has committed to anything. A form that asks for your phone number in the same
 * breath as your name reads as a cold-call trap, and the drop-off happens at
 * field one.
 *
 * Three steps instead. Step one is two fields nobody hesitates over. By step
 * two the reader has already started, which is most of why they finish — the
 * fields there are the ones we actually screen on, and they are optional, so a
 * blank answer costs an application rather than causing one to be abandoned.
 *
 * WHY IT IS A FUNNEL AND NOT JUST A FORM: the rates, the broker and the way we
 * work with partners are not on the public page any more. This is what unlocks
 * them, so it has to feel like a door, not a contact box — a visible step
 * counter, one question at a time, and an end state that says exactly what
 * happens next and when.
 */
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { cn } from "@/lib/utils";

const FN = functionUrl("partner-apply");

type Key = "name" | "email" | "phone" | "channel" | "reach" | "niche" | "note";

interface Field {
  key: Key;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  textarea?: boolean;
  hint?: string;
}

interface Step {
  title: string;
  sub: string;
  fields: Field[];
}

const STEPS: Step[] = [
  {
    title: "Who are you?",
    sub: "About a minute. Nothing is published anywhere.",
    fields: [
      { key: "name", label: "Your name", placeholder: "", required: true },
      { key: "email", label: "Email", placeholder: "you@example.com", type: "email", required: true,
        hint: "This is where the approval goes." },
    ],
  },
  {
    title: "Where is your audience?",
    sub: "This is what we actually look at. Rough numbers are fine.",
    fields: [
      { key: "channel", label: "Your main channel", placeholder: "@handle or link" },
      { key: "reach", label: "Monthly views", placeholder: "e.g. 250,000" },
      { key: "niche", label: "What you post about", placeholder: "trading, business, crypto…", wide: true },
    ],
  },
  {
    title: "How do we reach you?",
    sub: "We call before anything goes live — nobody is switched on from a form alone.",
    fields: [
      { key: "phone", label: "Phone / WhatsApp", placeholder: "+43 …", type: "tel", required: true },
      { key: "note", label: "Anything else?", placeholder: "Optional", wide: true, textarea: true },
    ],
  },
];

type Values = Partial<Record<Key, string>>;

export function PartnerApplyForm() {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  // Required fields are enforced per step, so nobody reaches the end and is
  // then told something three screens back was missing.
  const canAdvance = current.fields.every((f) => !f.required || (v[f.key] ?? "").trim().length > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!last) { if (canAdvance) setStep(step + 1); return; }
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

  /* The end state does the job the old one only gestured at: it names what
     happens, in what order, and how long it takes. "We'll be in touch" with no
     bound reads as a black hole to anyone who has filled in a partner form
     before — and this one has to carry the promise that the rates and the
     broker are actually waiting on the other side. */
  /* SHELL NOTE: the route wraps this component in a 1px gradient ring, so the
     card draws no border of its own — a second edge inside the ring read as a
     rendering artifact. The backgrounds are OPAQUE for the same reason: a
     translucent wash would let the ring's gradient bleed through the whole
     card instead of stopping at the 1px edge. */
  if (done) {
    return (
      <div className="rounded-[22px] bg-[color-mix(in_oklch,var(--primary)_8%,oklch(0.115_0.028_258))] p-7 sm:p-10">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <h3 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Application received.</h3>
        <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-foreground/75">
          We read every one ourselves. You will get an email at{" "}
          <b className="text-foreground">{v.email}</b> as soon as your access is switched on —
          usually within a few hours, at the latest the next working day.
        </p>

        <ol className="mt-6 space-y-3">
          {[
            ["We review your channel", "Reach, topic, and whether your audience fits what we teach."],
            ["You get your login by email", "That is the moment the rates, the broker and the agreement become visible to you."],
            ["We set your brand up together", "Your page, your Telegram channels, your dashboard — on a call, not by form."],
          ].map(([t, b], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t}</span>
                <span className="block text-[12px] leading-relaxed text-muted-foreground">{b}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-6 flex items-start gap-2 border-t border-white/10 pt-4 text-[12px] leading-relaxed text-muted-foreground">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Nothing arrived? Check your spam folder — the mail comes from our own domain, not from a mailing tool.</span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[22px] bg-[oklch(0.13_0.028_258)] p-6 sm:p-8">
      {/* The step counter is the point: it promises the form ends. */}
      <div className="flex items-center gap-3">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-white/10",
            )}
          />
        ))}
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <h3 className="mt-5 font-display text-xl font-bold sm:text-2xl">{current.title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{current.sub}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {current.fields.map((f) => (
          <label key={f.key} className={cn("block", f.wide && "sm:col-span-2")}>
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
            {f.hint && <span className="mt-1 block text-[11px] text-muted-foreground">{f.hint}</span>}
          </label>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !canAdvance}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {last ? "Send application" : "Continue"}
        </button>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Your details go to us and nowhere else — no newsletter, no third party, deleted on request.</span>
      </p>
    </form>
  );
}
