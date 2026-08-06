/**
 * MentorChat — the floating "Cosmo" mentor widget.
 *
 * Cosmo's head IS the launcher: members recognise the mascot from the course
 * videos, so the button reads as "ask Cosmo", not "generic chatbot". His face
 * also sits beside every answer he gives, which is what makes a support reply
 * (badged as a person) legible as a different voice.
 *
 * Cosmo is a Foundation perk. Below €100 the panel sells him instead of showing
 * a chat box — the gate is enforced server-side too, so this is presentation.
 *
 * The thread loads from the DB on open, which is also how a human support answer
 * (role "support", written by the escalation trigger) reaches the member.
 *
 * An empty thread offers starter questions rather than a blank box: members who
 * don't know what to ask are the ones who never come back.
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
  content: "Hey, I'm Cosmo 👋 Ask me anything about the course, the signals or your tier. If I can't answer it, I'll pass it to our team.",
};

const STARTERS = [
  "How do I read a signal?",
  "What is Level 2 data?",
  "Explain the value area",
  "How much should I risk per trade?",
];

/** Cosmo's face beside his own messages — the anchor for "who is talking". */
function CosmoBubbleAvatar() {
  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[oklch(0.22_0.06_260)] ring-1 ring-primary/30">
      <img src={COSMO_HEAD} alt="" className="h-5 w-5 object-contain" />
    </span>
  );
}

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
  const inputRef = useRef<HTMLInputElement>(null);

  /** Pull the stored thread — this is how a human support answer reaches the member. */
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      // The generated DB types are empty in this project, so table access goes
      // through the same narrow cast the admin views use.
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: Msg[] | null }>;
            };
          };
        };
      };
      const { data } = await client
        .from("mentor_messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(60);
      const rows = data ?? [];
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

  async function ask(text: string) {
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
      inputRef.current?.focus();
    }
  }

  // Starters only help while the member hasn't actually started talking.
  const showStarters = !busy && msgs.length === 1 && msgs[0] === GREETING;

  return (
    <>
      {/* Launcher — Cosmo's head IS the button. No dark disc swallowing his face:
          the cut-out head sits on a soft glow so he reads on any background, with
          a small label so it's obvious he talks. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask Cosmo"
          /* Anchored to the bottom-right corner, clearing the mobile nav pill
             (bottom-3 + ~68px tall) by four pixels. It used to sit at bottom-24
             with the label stacked underneath, which on a phone put a ~90px-tall
             block in the middle of the first card — it read as broken content
             rather than as a launcher. */
          className="group fixed bottom-[84px] right-3 z-40 flex flex-col items-center gap-1 transition-transform duration-300 hover:scale-105 lg:bottom-6 lg:right-4"
        >
          <style>{`
            @keyframes cosmoLaunchFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
            .cosmo-launch { animation: cosmoLaunchFloat 4.5s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) { .cosmo-launch { animation: none; } }
          `}</style>
          <span className="relative flex h-[52px] w-[52px] items-center justify-center lg:h-[68px] lg:w-[68px]">
            <span
              className="pointer-events-none absolute inset-0 -m-1 rounded-full blur-xl transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "radial-gradient(circle, color-mix(in oklch, #75B9F5 60%, transparent), transparent 70%)", opacity: 0.8 }}
              aria-hidden
            />
            <img
              src={COSMO_HEAD}
              alt=""
              className="cosmo-launch relative h-[52px] w-[52px] object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)] lg:h-[68px] lg:w-[68px]"
            />
            {locked && (
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[oklch(0.14_0.04_255)] ring-1 ring-white/15">
                <Lock className="h-2.5 w-2.5 text-foreground/70" />
              </span>
            )}
          </span>
          <span className="hidden rounded-full border border-primary/40 bg-[oklch(0.14_0.04_255)]/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary shadow-lg backdrop-blur-sm lg:block">
            Talk with me
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[min(580px,78vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.14_0.04_255)] shadow-2xl lg:bottom-6">
          {/* Header */}
          <div className="relative flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ background: "linear-gradient(120deg, color-mix(in oklch, #75B9F5 12%, transparent), transparent 60%)" }}
              aria-hidden
            />
            {/* Cosmo's face, not a cropped disc — glow instead of a ring. */}
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <span
                className="pointer-events-none absolute inset-0 rounded-full blur-md"
                style={{ background: "radial-gradient(circle, color-mix(in oklch, #75B9F5 55%, transparent), transparent 70%)" }}
                aria-hidden
              />
              <img src={COSMO_HEAD} alt="" className="relative h-11 w-11 object-contain drop-shadow" />
            </span>
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-bold">
                Cosmo
                {!locked && <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" aria-hidden />}
              </div>
              <div className="text-[11px] text-muted-foreground">AI mentor · not investment advice</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="relative rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {locked ? (
            <UnlockPanel min={minDeposit} />
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
                {loadingHistory && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {msgs.map((m, i) =>
                  m.role === "support" ? (
                    // A real person answered — make that unmistakable.
                    <div key={i} className="flex justify-start gap-2">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/40">
                        <Headset className="h-3.5 w-3.5" />
                      </span>
                      <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-primary/30 bg-primary/[0.08] px-3.5 py-2.5">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">Support team</div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{m.content}</div>
                      </div>
                    </div>
                  ) : m.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-start gap-2">
                      <CosmoBubbleAvatar />
                      <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm leading-relaxed text-foreground/90">
                        {m.content}
                      </div>
                    </div>
                  ),
                )}

                {busy && (
                  <div className="flex justify-start gap-2">
                    <CosmoBubbleAvatar />
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.05] px-3.5 py-3">
                      <style>{`
                        @keyframes cosmo-typing { 0%,60%,100% { opacity:.25; transform:translateY(0) } 30% { opacity:1; transform:translateY(-2px) } }
                        .cosmo-dot { animation: cosmo-typing 1.2s infinite; }
                        @media (prefers-reduced-motion: reduce) { .cosmo-dot { animation: none; opacity:.6 } }
                      `}</style>
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="cosmo-dot h-1.5 w-1.5 rounded-full bg-foreground/70"
                          style={{ animationDelay: `${d * 0.16}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showStarters && (
                  <div className="flex flex-wrap gap-1.5 pl-9 pt-1">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => void ask(s)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-foreground/75 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); void ask(input.trim()); }}
                className="flex items-center gap-2 border-t border-white/10 p-3"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Cosmo …"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
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
