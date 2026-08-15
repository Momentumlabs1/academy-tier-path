/**
 * InfoChannelRail — the latest posts from the public info channel.
 *
 * This slot used to hold "Popular — 1. Scalping, 2. Breakouts, 3. Mean
 * Reversion", ranked by nothing, linking to nothing. The team already writes
 * for this exact audience every day in the info channel, so the rail mirrors
 * that (see migration `info_posts` and the INFO_CHANNEL_ID branch in
 * telegram-webhook) instead of making things up.
 *
 * Renders NOTHING until real posts arrive. An empty state here would just be a
 * new piece of furniture in the place we cleared.
 */
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TELEGRAM_ENTRY } from "@/lib/broker";

interface Post { id: string; text: string | null; posted_at: string }

const db = () =>
  supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        order: (c: string, o: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: Post[] | null }>;
        };
      };
    };
  };

/** Telegram posts run long; the rail shows the opening line as a headline. */
function headline(text: string) {
  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return firstLine.length > 90 ? `${firstLine.slice(0, 88).trimEnd()}…` : firstLine;
}
function body(text: string) {
  const rest = text.split("\n").slice(1).join(" ").trim();
  return rest.length > 120 ? `${rest.slice(0, 118).trimEnd()}…` : rest;
}

export function InfoChannelRail() {
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    let alive = true;
    db().from("info_posts")
      .select("id, text, posted_at")
      .order("posted_at", { ascending: false })
      .limit(3)
      .then(({ data }) => { if (alive) setPosts((data ?? []).filter((p) => p.text?.trim())); })
      .catch(() => { if (alive) setPosts([]); });
    return () => { alive = false; };
  }, []);

  if (!posts || posts.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 font-display text-lg font-bold">From the desk</h3>
      <div className="space-y-2">
        {posts.map((p) => {
          const text = p.text ?? "";
          const sub = body(text);
          return (
            <a
              key={p.id}
              href={TELEGRAM_ENTRY.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-foreground/90">
                  {headline(text)}
                </span>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              {sub && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{sub}</p>}
            </a>
          );
        })}
      </div>
    </section>
  );
}
