import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";

const FN = functionUrl("partner-admin");

/**
 * Grant a partner their own admin area at /<slug>/admin.
 *
 * Pressing invite links the brand to the partner's login (reusing their account
 * if they already signed up), flags them as a superpartner and mails a one-time
 * link where they choose a password. If the mail fails we hand the link back so
 * it can be passed on by hand instead of silently doing nothing.
 */
export function PartnerAdminAccess({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ emailed: boolean; inviteUrl: string } | null>(null);
  const [isSuper, setIsSuper] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const check = useCallback(async () => {
    const client = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
        };
      };
    };
    const { data } = await client.from("tenants").select("superpartner").eq("slug", slug).maybeSingle();
    setIsSuper(Boolean(data?.superpartner));
  }, [slug]);

  useEffect(() => {
    check();
  }, [check]);

  async function invite() {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setError("Your admin session expired — sign in again.");
      setBusy(false);
      return;
    }

    const res = await fetch(FN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "invite", slug, email: email.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      emailed?: boolean;
      inviteUrl?: string;
      error?: string;
    };
    setBusy(false);

    if (!data.ok) {
      setError(data.error ?? "Invite failed.");
      return;
    }
    setResult({ emailed: Boolean(data.emailed), inviteUrl: String(data.inviteUrl ?? "") });
    if (data.error) setError(data.error);
    check();
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Partner admin access
        </span>
        {isSuper && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-primary">
            Superpartner
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Opens their own dashboard at <span className="font-mono text-foreground/70">/{slug}/admin</span> — password only, no
        e-mail field.
      </p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="partner@example.com"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs outline-none focus:border-primary/50"
        />
        <button
          onClick={invite}
          disabled={busy || !email.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          {isSuper ? "Re-send invite" : "Invite"}
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-2 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-2 text-[11px] text-primary">
          <div className="font-semibold">
            {result.emailed ? "Invite sent." : "Account ready — mail didn't go out."}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[10px] text-foreground/70">{result.inviteUrl}</code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(result.inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 rounded p-1 hover:bg-white/10"
              title="Copy invite link"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
