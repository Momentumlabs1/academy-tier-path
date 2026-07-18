/**
 * MentorChat — floating "Cosmo Mentor" chat widget for the customer dashboard.
 *
 * A direct line for members to ask about the academy, the platform, the tiers,
 * and the trading concepts. Talks to the mentor-chat edge function (Claude
 * Haiku 4.5, cached knowledge base). Sends only the new message — the backend
 * keeps history — and passes the member's access token so replies are scoped.
 *
 * Guardrails live server-side; the UI just shows the "AI assistant, not advice"
 * disclaimer so members know what this is.
 */
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";

const FN = functionUrl("mentor-chat");

interface Msg { role: "user" | "assistant"; content: string }

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hey, ich bin Cosmo — dein KI-Mentor. 👋 Frag mich alles zur Academy, zu den Signalen, Tiers oder zur Strategie (Level 2, Volume Profile, Risikomanagement …). Ich bin ein KI-Assistent, keine persönliche Anlageberatung.",
};

export function MentorChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      if (!token) throw new Error("Bitte melde dich an, um den Mentor zu nutzen.");
      const res = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = res.ok ? String(data.reply ?? "") : String(data.error ?? "Fehler.");
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", content: err instanceof Error ? err.message : "Netzwerkfehler." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Mentor-Chat öffnen"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-105 lg:bottom-6"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[min(560px,75vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.14_0.04_255)] shadow-2xl lg:bottom-6">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">Cosmo Mentor</div>
              <div className="text-[11px] text-muted-foreground">KI-Assistent · keine Anlageberatung</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => (
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
            ))}
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
              placeholder="Frag den Mentor …"
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
        </div>
      )}
    </>
  );
}
