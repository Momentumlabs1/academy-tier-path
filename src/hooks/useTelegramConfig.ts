import { useState } from "react";

const STORAGE_KEY = "academy_telegram_config";

/**
 * Telegram wiring, editable from the admin UI.
 * Demo persistence: localStorage. Once Supabase is live these values
 * write to tenants.telegram_channel_id and the function secrets instead.
 * Bot token & webhook secret are NEVER stored here — Supabase Secrets only.
 */
export interface TelegramSettings {
  botUsername: string;
  mainChannelId: string;
  tenants: Record<string, { channelUrl?: string; channelId?: string }>;
}

const DEFAULTS: TelegramSettings = {
  botUsername: "AgentTradingRelayBot",
  mainChannelId: "",
  tenants: {},
};

function load(): TelegramSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

function persist(next: TelegramSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* private mode */ }
}

export function useTelegramConfig() {
  const [cfg, setCfg] = useState<TelegramSettings>(load);

  function update(patch: Partial<Omit<TelegramSettings, "tenants">>) {
    setCfg((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }

  function updateTenant(slug: string, patch: { channelUrl?: string; channelId?: string }) {
    setCfg((prev) => {
      const next = {
        ...prev,
        tenants: { ...prev.tenants, [slug]: { ...prev.tenants[slug], ...patch } },
      };
      persist(next);
      return next;
    });
  }

  return { cfg, update, updateTenant };
}
