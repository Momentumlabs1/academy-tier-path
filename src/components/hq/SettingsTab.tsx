import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, LogOut, Send, Smartphone } from "lucide-react";
import { spysecret } from "@/integrations/spysecret/client";
import { fetchSettings, invokeBrief, updateSettings } from "@/lib/hq/api";
import {
  EmptyHint,
  GhostButton,
  HqCard,
  HqInput,
  LoadingRow,
  PrimaryButton,
  SectionLabel,
} from "./primitives";
import { cn } from "@/lib/utils";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-2 text-left"
    >
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function HourSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none [color-scheme:dark]"
    >
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}

export function SettingsTab({ userEmail }: { userEmail: string }) {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const detect = useMutation({
    mutationFn: () => invokeBrief({ action: "telegram-detect", token: token.trim() || undefined }),
    onSuccess: (r) => {
      setStatus({
        kind: "ok",
        msg: `Telegram verbunden (Chat ${r.chat_id as string}) — Bestätigung wurde geschickt.`,
      });
      setToken("");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => setStatus({ kind: "err", msg: (e as Error).message }),
  });

  const test = useMutation({
    mutationFn: () => invokeBrief({ action: "test" }),
    onSuccess: (r) => {
      const via = (r.sent_via as string[]) ?? [];
      setStatus({
        kind: via.includes("telegram") || via.includes("email") ? "ok" : "err",
        msg: `Test gesendet via: ${via.join(", ")}${Object.keys((r.errors as object) ?? {}).length ? ` · Fehler: ${JSON.stringify(r.errors)}` : ""}`,
      });
    },
    onError: (e) => setStatus({ kind: "err", msg: (e as Error).message }),
  });

  const sendMorning = useMutation({
    mutationFn: () => invokeBrief({ action: "brief", variant: "morning" }),
    onSuccess: (r) =>
      setStatus({
        kind: "ok",
        msg: `Morning Brief gesendet via: ${((r.sent_via as string[]) ?? []).join(", ")}`,
      }),
    onError: (e) => setStatus({ kind: "err", msg: (e as Error).message }),
  });

  const s = settings.data;
  const telegramReady = !!(s?.telegram_bot_token && s?.telegram_chat_id);

  return (
    <div className="space-y-4">
      <HqCard>
        <SectionLabel>📱 Telegram aufs Handy</SectionLabel>
        {settings.isLoading ? (
          <LoadingRow />
        ) : (
          <>
            {telegramReady ? (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-[oklch(0.8_0.16_150)]/10 px-3 py-2.5 text-sm text-[oklch(0.85_0.16_150)]">
                <Check className="h-4 w-4 shrink-0" /> Verbunden — Chat-ID {s?.telegram_chat_id}
              </div>
            ) : (
              <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-foreground/80">
                <li>
                  In Telegram{" "}
                  <a
                    className="font-semibold text-primary"
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @BotFather
                  </a>{" "}
                  öffnen → <code className="rounded bg-white/10 px-1">/newbot</code>
                </li>
                <li>Token hier einfügen</li>
                <li>
                  Deinem neuen Bot <code className="rounded bg-white/10 px-1">/start</code> schicken
                </li>
                <li>Unten auf „Verbinden" tippen</li>
              </ol>
            )}
            <div className="flex gap-2">
              <HqInput
                placeholder={
                  telegramReady ? "Neuen Token einfügen (optional)" : "123456:ABC-DEF… (Bot-Token)"
                }
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <PrimaryButton
                onClick={() => detect.mutate()}
                disabled={detect.isPending || (!token.trim() && !s?.telegram_bot_token)}
                className="shrink-0"
              >
                {detect.isPending ? "…" : "Verbinden"}
              </PrimaryButton>
            </div>
            <div className="mt-3 flex gap-2">
              <GhostButton
                onClick={() => test.mutate()}
                disabled={test.isPending}
                className="flex-1"
              >
                <Bell className="h-4 w-4" /> Test senden
              </GhostButton>
              <GhostButton
                onClick={() => sendMorning.mutate()}
                disabled={sendMorning.isPending}
                className="flex-1"
              >
                <Send className="h-4 w-4" /> Brief jetzt
              </GhostButton>
            </div>
            {status ? (
              <div
                className={cn(
                  "mt-3 rounded-lg px-3 py-2 text-xs",
                  status.kind === "ok"
                    ? "bg-[oklch(0.8_0.16_150)]/10 text-[oklch(0.85_0.16_150)]"
                    : "bg-red-500/10 text-red-300",
                )}
              >
                {status.msg}
              </div>
            ) : null}
          </>
        )}
      </HqCard>

      <HqCard>
        <SectionLabel>🔔 Briefings</SectionLabel>
        {s ? (
          <div className="divide-y divide-white/5">
            <div className="flex items-center justify-between gap-3 py-1">
              <Toggle
                checked={s.brief_morning}
                onChange={(v) => save.mutate({ brief_morning: v })}
                label="🌅 Morning Brief"
              />
              <HourSelect
                value={s.morning_hour}
                onChange={(v) => save.mutate({ morning_hour: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <Toggle
                checked={s.brief_evening}
                onChange={(v) => save.mutate({ brief_evening: v })}
                label="🌙 Abend-Review"
              />
              <HourSelect
                value={s.evening_hour}
                onChange={(v) => save.mutate({ evening_hour: v })}
              />
            </div>
            <Toggle
              checked={s.email_fallback}
              onChange={(v) => save.mutate({ email_fallback: v })}
              label={`📧 E-Mail-Fallback (${s.notify_email})`}
            />
          </div>
        ) : (
          <LoadingRow />
        )}
      </HqCard>

      <HqCard>
        <SectionLabel>📲 Als App aufs Handy</SectionLabel>
        <div className="flex items-start gap-3 text-sm leading-relaxed text-foreground/80">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            Diese Seite im Handy-Browser öffnen → Teilen-Menü →{" "}
            <span className="font-semibold">„Zum Home-Bildschirm"</span>. Dann startet HQ wie eine
            native App.
          </div>
        </div>
      </HqCard>

      <HqCard>
        <SectionLabel>👤 Account</SectionLabel>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{userEmail}</div>
            <div className="text-[11px] text-muted-foreground">HQ-Owner</div>
          </div>
          <GhostButton onClick={() => spysecret.auth.signOut()}>
            <LogOut className="h-4 w-4" /> Abmelden
          </GhostButton>
        </div>
      </HqCard>

      {settings.isError ? <EmptyHint>Einstellungen konnten nicht geladen werden.</EmptyHint> : null}
    </div>
  );
}
