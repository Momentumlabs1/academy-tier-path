import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ExternalLink, Radio, TrendingUp } from "lucide-react";
import {
  fetchContentKpis,
  fetchSparkline,
  fetchSpyKpis,
  fetchTasks,
  fetchTradingSnapshot,
  fmtCompact,
  fmtEur,
  fmtInt,
  todayISO,
} from "@/lib/hq/api";
import { EmptyHint, HqCard, LoadingRow, SectionLabel, StatTile } from "./primitives";

function TrendBadge({ now, before }: { now: number; before: number }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <span
      className={
        up
          ? "rounded-md bg-[oklch(0.8_0.16_150)]/15 px-1.5 py-0.5 text-[11px] font-bold text-[oklch(0.8_0.16_150)]"
          : "rounded-md bg-red-400/15 px-1.5 py-0.5 text-[11px] font-bold text-red-300"
      }
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function SpySecretCard() {
  const kpis = useQuery({ queryKey: ["spy-kpis"], queryFn: fetchSpyKpis, staleTime: 60_000 });
  const spark = useQuery({
    queryKey: ["spy-spark"],
    queryFn: fetchSparkline,
    staleTime: 5 * 60_000,
  });

  return (
    <HqCard>
      <SectionLabel
        action={
          <a
            href="https://spy-secret.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            spy-secret.com <ExternalLink className="h-3 w-3" />
          </a>
        }
      >
        🕵️ Spy Secret
      </SectionLabel>

      {kpis.isLoading ? (
        <LoadingRow label="Live-Zahlen laden…" />
      ) : kpis.isError ? (
        <EmptyHint>KPIs nicht verfügbar: {(kpis.error as Error).message}</EmptyHint>
      ) : kpis.data ? (
        <>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                MRR
              </div>
              <div className="font-display text-4xl font-bold leading-none text-foreground">
                {fmtEur(kpis.data.mrr_eur)}
              </div>
            </div>
            <div className="text-right text-[11px] leading-relaxed text-muted-foreground">
              {kpis.data.pro_active} × Pro · {kpis.data.basic_active} × Basic
              {kpis.data.past_due > 0 ? (
                <div className="font-semibold text-amber-400">{kpis.data.past_due} past due</div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="Besucher heute"
              value={fmtInt(kpis.data.visitors_today)}
              sub={
                <TrendBadge now={kpis.data.visitors_today} before={kpis.data.visitors_yesterday} />
              }
            />
            <StatTile label="Scans heute" value={fmtInt(kpis.data.scans_today)} />
            <StatTile
              label="Neue Zahler heute"
              value={kpis.data.new_paying_today}
              tone={kpis.data.new_paying_today > 0 ? "ok" : undefined}
            />
            <StatTile label="Trials aktiv" value={kpis.data.in_trial} />
          </div>

          {spark.data && spark.data.length > 0 ? (
            <div className="mt-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Unique Besucher · 14 Tage
              </div>
              <ResponsiveContainer width="100%" height={72}>
                <AreaChart data={spark.data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="hqSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a3e635" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0.05 290)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelFormatter={(d) => String(d).slice(5)}
                    formatter={(v: number) => [fmtInt(v), "Besucher"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#a3e635"
                    strokeWidth={2}
                    fill="url(#hqSpark)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </>
      ) : null}
    </HqCard>
  );
}

function ContentCard() {
  const kpis = useQuery({
    queryKey: ["content-kpis"],
    queryFn: fetchContentKpis,
    staleTime: 5 * 60_000,
  });

  return (
    <HqCard>
      <SectionLabel>🎬 Content & Views (StrichAbi + AI-Creator)</SectionLabel>
      {kpis.isLoading ? (
        <LoadingRow />
      ) : kpis.isError ? (
        <EmptyHint>Content-KPIs nicht verfügbar.</EmptyHint>
      ) : kpis.data ? (
        <>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Views gesamt
              </div>
              <div className="font-display text-4xl font-bold leading-none">
                {fmtCompact(kpis.data.total_views)}
              </div>
            </div>
            {kpis.data.views_7d > 0 ? (
              <div className="inline-flex items-center gap-1 rounded-md bg-[oklch(0.8_0.16_150)]/15 px-2 py-1 text-xs font-bold text-[oklch(0.8_0.16_150)]">
                <TrendingUp className="h-3.5 w-3.5" /> +{fmtCompact(kpis.data.views_7d)} / 7d
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Videos" value={kpis.data.video_count} />
            <StatTile label="Likes" value={fmtCompact(kpis.data.total_likes)} />
            <StatTile
              label="AI-Personas"
              value={kpis.data.agency_personas}
              sub={`${fmtCompact(kpis.data.agency_followers)} Follower`}
            />
          </div>

          {kpis.data.top_video ? (
            <a
              href={kpis.data.top_video.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block rounded-xl bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.06]"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Top-Video · {kpis.data.top_video.platform} · {fmtCompact(kpis.data.top_video.views)}{" "}
                Views
              </div>
              <div className="mt-0.5 truncate text-sm">{kpis.data.top_video.caption}</div>
            </a>
          ) : null}
        </>
      ) : null}
    </HqCard>
  );
}

function TradingCard() {
  const snap = useQuery({
    queryKey: ["trading-snap"],
    queryFn: fetchTradingSnapshot,
    staleTime: 60_000,
  });

  return (
    <HqCard>
      <SectionLabel
        action={
          <a
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Admin <ExternalLink className="h-3 w-3" />
          </a>
        }
      >
        📈 Trading Academy
      </SectionLabel>
      {snap.isLoading ? (
        <LoadingRow />
      ) : snap.data ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Brands" value={snap.data.tenants} />
            <StatTile label="Mitglieder" value={snap.data.members} />
            <StatTile label="Signale 24h" value={snap.data.relays24h} />
          </div>
          {snap.data.latestSignal ? (
            <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Radio className="h-3 w-3" /> Letztes Signal
              </div>
              <div className="mt-0.5 line-clamp-2 text-sm">{snap.data.latestSignal.preview}</div>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyHint>
          Academy-Daten sind hier verfügbar, sobald die App über Lovable (mit Supabase-Env) läuft.
        </EmptyHint>
      )}
    </HqCard>
  );
}

function PersonalCard() {
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const today = todayISO();
  const open = (tasks.data ?? []).filter((t) => !t.done_at);
  const overdue = open.filter((t) => t.due_date && t.due_date < today);
  const p1 = open.filter((t) => t.priority === 1);

  return (
    <HqCard>
      <SectionLabel>🌱 Persönlich</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Offen" value={open.length} />
        <StatTile label="Top-Prio" value={p1.length} tone={p1.length > 0 ? "warn" : undefined} />
        <StatTile
          label="Überfällig"
          value={overdue.length}
          tone={overdue.length > 0 ? "warn" : "ok"}
        />
      </div>
    </HqCard>
  );
}

export function VenturesTab() {
  return (
    <div className="space-y-4">
      <SpySecretCard />
      <ContentCard />
      <TradingCard />
      <PersonalCard />
    </div>
  );
}
