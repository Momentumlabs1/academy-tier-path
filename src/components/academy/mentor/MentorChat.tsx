/**
 * MentorChat — the floating "Cosmo" mentor widget.
 *
 * Cosmo's head IS the launcher: members recognise the mascot from the course
 * videos, so the button reads as "ask Cosmo", not "generic chatbot".
 *
 * Cosmo is a Foundation perk. Below €100 the panel shows what he does and how to
 * unlock him instead of a chat box — the gate is enforced server-side too, so
 * this is presentation, not security.
 *
 * The thread is loaded from the DB on open, which is also how a human support
 * answer (role "support", written by the escalation trigger) shows up for the
 * member — right where they asked, badged as a person rather than as Cosmo.
 *
 * Guardrails live server-side; the UI carries the "AI assistant, not advice"
 * disclaimer so members know what this is.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Headset, Loader2, Lock, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { useMemberState } from "@/hooks/useMemberState";
import { TIERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";

const FN = functionUrl("mentor-chat");
const COSMO_HEAD = "/cosmo/cosmo-head.png";

interface Msg { role: "user" | "assistant" | "support"; content: string }

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hey, I'm Cosmo — your AI mentor. 👋 Ask me anything about the academy, the signals, the tiers or the strategy (Level 2, volume profile, risk management …). I'm an AI assistant, not personal investment advice — and if I can't answer something, I'll pass it straight to our team.",
};

/** What members see before Foundation: what Cosmo is, and how to switch him on. */
function UnlockPanel({ min }: { min: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 -m-3 rounded-full blur-2xl"
          style={{ background: "radial-gradient(circle, color-mix(in oklch, #75B9F5 55%, transparent), transparent 70%)" }}
          aria-hidden
        />
        <img src={COSMO_HEAD} alt="Cosmo" className="relative h-20 w-20 object-contain" />
      </div>
      <div className="space-y-1.5">
        <div className="font-display text-lg font-bold text-balance">Your personal AI mentor</div>
        <p className="text-sm text-foreground/65">
          Cosmo knows the whole course by heart — ask him about Level 2, volume profile, the
          footprint, risk management or how to read a signal. 24/7, in your language.
        </p>
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
        <Lock className="h-3.5 w-3.5" /> Unlocks at Foundation ({formatMoney(min, "€")})
      </div>
      <Link
        to="/tier"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.03]"
      >
        <Sparkles className="h-4 w-4" /> See how to unlock
      </Link>
    </div>
  );
}

export function MentorChat() {
  const state = useMemberState();
  const minDeposit = TIERS[0].minDeposit;
  const locked = state.loaded && state.lifetimeDeposits < minDeposit;

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Pull the stored thread — this is how a human support answer reaches the member. */
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("mentor_messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(60);
      const rows = (data ?? []) as Msg[];
      setMsgs(rows.length ? [GREETING, ...rows] : [GREETING]);
    } catch {
      /* keep whatever is on screen — the thread is a nicety, not critical */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (open && !locked) void loadHistory();
  }, [open, locked, loadHistory]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Please sign in to use the mentor.");
      const res = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = res.ok ? String(data.reply ?? "") : String(data.error ?? "Something went wrong.");
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", content: err instanceof Error ? err.message : "Network error." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher — Cosmo himself */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask Cosmo"
          className="group fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.22_0.06_260)] ring-2 ring-primary/60 shadow-[var(--shadow-lime)] transition-transform hover:scale-105 lg:bottom-6"
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full blur-lg"
            style={{ background: "radial-gradient(circle, color-mix(in oklch, #75B9F5 45%, transparent), transparent 70%)" }}
            aria-hidden
          />
          <img src={COSMO_HEAD} alt="" className="relative h-11 w-11 object-contain drop-shadow" />
          {locked && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[oklch(0.14_0.04_255)] ring-1 ring-white/15">
              <Lock className="h-2.5 w-2.5 text-foreground/70" />
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[min(560px,75vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.14_0.04_255)] shadow-2xl lg:bottom-6">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/15">
              <img src={COSMO_HEAD} alt="" className="h-7 w-7 object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">Cosmo</div>
              <div className="text-[11px] text-muted-foreground">AI mentor · not investment advice</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {locked ? (
            <UnlockPanel min={minDeposit} />
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {loadingHistory && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {msgs.map((m, i) =>
                  m.role === "support" ? (
                    // A real person answered — make that unmistakable.
                    <div key={i} className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl border border-primary/30 bg-primary/[0.08] px-3.5 py-2.5">
                        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                          <Headset className="h-3 w-3" /> Support team
                        </div>
                        <div className="whitespace-pre-wrap text-sm text-foreground/90">{m.content}</div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={
                          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm " +
                          (m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border border-white/10 bg-white/[0.04] text-foreground/90")
                        }
                      >
                        {m.content}
                      </div>
                    </div>
                  ),
                )}
                {busy && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Cosmo …"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
