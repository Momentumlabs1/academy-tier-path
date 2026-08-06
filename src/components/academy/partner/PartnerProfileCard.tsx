/**
 * PartnerProfileCard — the short "where is your audience" form on /partner.
 *
 * Two jobs. It gives us the handles and reach behind a brand, which is the first
 * thing anyone asks about a new partner and which nothing in the system captured
 * before. And it gives a brand-new partner something to *do* on a dashboard whose
 * numbers are all zero on day one — an empty dashboard reads as broken, and a
 * partner who logs in once and sees nothing tends not to come back.
 *
 * It writes through `save_partner_profile()` rather than updating `tenants`
 * directly, and that is deliberate: `authenticated` still holds a table-wide
 * UPDATE grant on tenants — including partner_rate — which is only neutralised
 * today by there being no UPDATE policy. Adding one so a partner could save this
 * form would also let them set their own commission rate. The function writes one
 * column, on the caller's own row, and closes that off.
 *
 * Every field is optional. This is a nice-to-have on the way to getting paid, and
 * a required field here would just get filled with junk.
 */
import { useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type PartnerProfile = Record<string, string>;

interface Field { key: string; label: string; placeholder: string; wide?: boolean }

const FIELDS: Field[] = [
  { key: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { key: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { key: "youtube", label: "YouTube", placeholder: "channel or @handle" },
  { key: "telegram", label: "Telegram / Discord", placeholder: "group or channel" },
  { key: "audience", label: "Total reach", placeholder: "e.g. 155000" },
  { key: "country", label: "Where your audience is", placeholder: "e.g. Germany, UK" },
  { key: "niche", label: "What your audience follows you for", placeholder: "trading, business, crypto…", wide: true },
];

const rpc = () =>
  supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };

export function PartnerProfileCard({ profile: initial }: { profile: PartnerProfile }) {
  // Holds its own copy after saving. The parent renders this inside a per-brand
  // sub-component that has no access to the list state, and threading a setter
  // down for one optional form would be more wiring than the feature is worth.
  const [profile, setProfile] = useState<PartnerProfile>(initial ?? {});
  const filled = Object.values(profile ?? {}).some((v) => String(v ?? "").trim());
  const [editing, setEditing] = useState(!filled);
  const [draft, setDraft] = useState<PartnerProfile>(profile ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const clean: PartnerProfile = {};
    for (const [k, v] of Object.entries(draft)) {
      const t = String(v ?? "").trim();
      if (t) clean[k] = t;
    }
    const { error: err } = await rpc().rpc("save_partner_profile", { p_profile: clean });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setProfile(clean);
    setEditing(false);
  }

  if (!editing) {
    const shown = FIELDS.filter((f) => profile?.[f.key]);
    return (
      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your channels
          </div>
          <button
            onClick={() => { setDraft(profile ?? {}); setEditing(true); }}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
        <div className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {shown.map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-3 border-b border-white/6 pb-2">
              <span className="text-[12px] text-muted-foreground">{f.label}</span>
              <span className="truncate text-sm font-medium">{profile[f.key]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
      <h3 className="font-display text-base font-bold">Tell us where your audience is</h3>
      <p className="mt-1 text-sm text-foreground/65">
        Takes a minute, all optional — it helps us support your brand properly, and it fills out
        this dashboard while your first numbers come in.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.wide ? "sm:col-span-2" : ""}`}>
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{f.label}</span>
            <input
              value={draft[f.key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-white/10 bg-[oklch(0.12_0.03_258)] px-3.5 py-2.5 text-sm outline-none focus:border-primary/50"
            />
          </label>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save} disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
        </button>
        {filled && (
          <button onClick={() => setEditing(false)} className="text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
